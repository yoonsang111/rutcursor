# 완전한 배포 가이드 (서브도메인 방식)

## 🎯 배포 구조

```
tourstream.kr          →  메인 앱 (S3 + CloudFront) [이미 배포됨]
admin.tourstream.kr   →  어드민 앱 (S3 + CloudFront) [새로 배포]
api.tourstream.kr     →  API 서버 (EC2 + Nginx) [새로 배포]
```

---

## 📋 배포 순서

### 1단계: API 서버 배포 (먼저)

#### 1.1 EC2 인스턴스 준비
- 타입: t3.micro 또는 t3.small
- OS: Ubuntu 22.04 LTS
- 보안 그룹:
  - HTTP (80): 모든 IP (Let's Encrypt 인증용)
  - HTTPS (443): 모든 IP
  - SSH (22): 본인 IP만
  - API 포트 (3002): localhost만 (Nginx를 통해서만 접근)

#### 1.2 서버 초기 설정
```bash
# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치
sudo npm install -g pm2

# Nginx 설치
sudo apt update
sudo apt install nginx -y
```

#### 1.3 코드 배포
```bash
# 디렉토리 생성
sudo mkdir -p /var/www/api
cd /var/www/api

# Git에서 클론 (또는 파일 업로드)
git clone [repository] .

# 또는 직접 파일 업로드
# scp -r packages/server/* ubuntu@api.tourstream.kr:/var/www/api/
```

#### 1.4 의존성 설치
```bash
cd /var/www/api
npm install --production
```

#### 1.5 환경 변수 설정
```bash
# .env 파일 생성
sudo nano /var/www/api/.env
```

**내용:**
```bash
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
```

#### 1.6 데이터 디렉토리 생성
```bash
sudo mkdir -p /var/www/api/data/production
sudo chown -R ubuntu:ubuntu /var/www/api
```

#### 1.7 PM2 설정
```bash
# ecosystem.config.js 생성
cd /var/www/api
nano ecosystem.config.js
```

**내용:**
```javascript
module.exports = {
  apps: [{
    name: 'tourstream-api',
    script: './src/index.js',
    cwd: '/var/www/api',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      CORS_ORIGIN: 'https://tourstream.kr,https://admin.tourstream.kr',
      DATA_DIR: '/var/www/api/data/production'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true
  }]
};
```

#### 1.8 PM2로 서버 시작
```bash
cd /var/www/api
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 1.9 Nginx 설정
```bash
sudo nano /etc/nginx/sites-available/api.tourstream.kr
```

**내용:**
```nginx
server {
    listen 80;
    server_name api.tourstream.kr;
    
    # Let's Encrypt 인증용
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # HTTPS로 리다이렉트
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.tourstream.kr;
    
    ssl_certificate /etc/letsencrypt/live/api.tourstream.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tourstream.kr/privkey.pem;
    
    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS 헤더 (필요시)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }
}
```

#### 1.10 Nginx 활성화
```bash
sudo ln -s /etc/nginx/sites-available/api.tourstream.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 1.11 SSL 인증서 발급 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.tourstream.kr
```

#### 1.12 DNS 설정
```
api.tourstream.kr  →  A 레코드  →  [EC2 Elastic IP]
```

#### 1.13 테스트
```bash
# API 서버 확인
curl https://api.tourstream.kr/
curl https://api.tourstream.kr/api/products

# PM2 상태 확인
pm2 status
pm2 logs tourstream-api
```

---

### 2단계: 어드민 앱 배포

#### 2.1 S3 버킷 생성
```bash
aws s3 mb s3://tourstream-admin --region ap-northeast-2
```

#### 2.2 정적 웹사이트 호스팅 활성화
```bash
aws s3 website s3://tourstream-admin \
  --index-document index.html \
  --error-document index.html
```

#### 2.3 버킷 정책 설정
```bash
# bucket-policy.json 파일 생성
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tourstream-admin/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket tourstream-admin --policy file://bucket-policy.json
```

#### 2.4 어드민 앱 빌드
```bash
cd packages/admin
npm run build:production
```

#### 2.5 S3에 업로드
```bash
aws s3 sync packages/admin/build/ s3://tourstream-admin/ --delete
```

#### 2.6 CloudFront 배포 생성

**AWS 콘솔에서:**
1. CloudFront → 배포 생성
2. **Origin Domain**: `tourstream-admin.s3.amazonaws.com`
3. **Origin Path**: (비워둠)
4. **Viewer Protocol Policy**: `Redirect HTTP to HTTPS`
5. **Allowed HTTP Methods**: `GET, HEAD, OPTIONS`
6. **Cache Policy**: `CachingOptimized`
7. **Error Pages**:
   - 404 → `/index.html` (200 상태 코드)
8. **Alternate Domain Names**: `admin.tourstream.kr`

#### 2.7 SSL 인증서 발급 (ACM)
1. ACM 콘솔 접속 (us-east-1 리전)
2. 인증서 요청
3. 도메인: `admin.tourstream.kr`
4. DNS 검증
5. CloudFront에 인증서 연결

#### 2.8 DNS 설정
```
admin.tourstream.kr  →  CNAME  →  [CloudFront 배포 URL]
```

#### 2.9 기본 인증 설정 (선택사항)

**CloudFront Functions 생성:**
```javascript
function handler(event) {
    var request = event.request;
    var headers = request.headers;
    
    var authUser = 'admin';
    var authPass = 'your-secure-password-here';
    var authString = 'Basic ' + btoa(authUser + ':' + authPass);
    
    if (headers.authorization && headers.authorization.value === authString) {
        return request;
    }
    
    return {
        statusCode: 401,
        statusDescription: 'Unauthorized',
        headers: {
            'www-authenticate': { value: 'Basic realm="Admin Area"' }
        }
    };
}
```

#### 2.10 테스트
```bash
# 접속 확인
curl -I https://admin.tourstream.kr

# 브라우저에서 접속 테스트
# 기본 인증 창이 뜨는지 확인
```

---

### 3단계: 메인 앱 업데이트

#### 3.1 메인 앱 빌드
```bash
cd packages/main
npm run build:production
```

#### 3.2 S3에 업로드
```bash
aws s3 sync packages/main/build/ s3://[기존-메인-버킷]/ --delete
```

#### 3.3 CloudFront 캐시 무효화
```bash
aws cloudfront create-invalidation \
  --distribution-id [메인-CloudFront-ID] \
  --paths "/*"
```

---

## 🔒 보안 체크리스트

### API 서버
- [ ] 보안 그룹 설정 확인
- [ ] Nginx SSL 설정 확인
- [ ] PM2 자동 재시작 설정
- [ ] 로그 모니터링 설정

### 어드민 앱
- [ ] 기본 인증 설정 (선택)
- [ ] S3 버킷 정책 확인
- [ ] CloudFront SSL 확인
- [ ] 에러 페이지 설정 확인

### 공통
- [ ] CORS 설정 확인
- [ ] 환경 변수 보안 확인
- [ ] 데이터 백업 설정

---

## 📊 비용 예상

### API 서버 (EC2)
- t3.micro: 월 $7.5
- t3.small: 월 $15

### 어드민 앱 (S3 + CloudFront)
- S3: 거의 무료
- CloudFront: 월 $1-2

### 총 비용
- **최소**: 월 $8.5-9.5 (t3.micro)
- **권장**: 월 $16-17 (t3.small)

---

## 🔄 업데이트 프로세스

### API 서버 업데이트
```bash
# 서버 접속
ssh ubuntu@api.tourstream.kr

# 코드 업데이트
cd /var/www/api
git pull  # 또는 파일 업로드

# 의존성 설치
npm install --production

# 서버 재시작
pm2 restart tourstream-api
pm2 logs tourstream-api
```

### 어드민 앱 업데이트
```bash
# 빌드
cd packages/admin
npm run build:production

# S3 업로드
aws s3 sync build/ s3://tourstream-admin/ --delete

# CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id [DISTRIBUTION_ID] \
  --paths "/*"
```

### 메인 앱 업데이트
```bash
# 빌드
cd packages/main
npm run build:production

# S3 업로드
aws s3 sync build/ s3://[메인-버킷]/ --delete

# CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id [메인-DISTRIBUTION_ID] \
  --paths "/*"
```

---

## 🆘 문제 해결

### API 서버가 응답하지 않음
```bash
# PM2 상태 확인
pm2 status
pm2 logs tourstream-api

# Nginx 로그 확인
sudo tail -f /var/log/nginx/error.log

# 포트 확인
sudo netstat -tlnp | grep 3002
```

### CORS 오류
- API 서버의 `CORS_ORIGIN` 환경 변수 확인
- 도메인에 프로토콜(`https://`) 포함 확인
- 마지막 슬래시(`/`) 없어야 함

### 어드민 접속 불가
- DNS 전파 확인 (5-30분 소요)
- CloudFront 배포 상태 확인
- SSL 인증서 확인
- S3 버킷 정책 확인

---

## ✅ 최종 체크리스트

배포 완료 후:
- [ ] `https://api.tourstream.kr/` 접속 확인
- [ ] `https://api.tourstream.kr/api/products` 데이터 확인
- [ ] `https://admin.tourstream.kr` 접속 확인
- [ ] 어드민에서 상품 등록/수정 테스트
- [ ] `https://tourstream.kr` 접속 확인
- [ ] 메인에서 상품 목록 표시 확인
- [ ] CORS 오류 없음 확인
- [ ] SSL 인증서 정상 작동 확인

---

## 🎉 완료!

이제 모든 서비스가 정상적으로 배포되었습니다!

- **메인**: `https://tourstream.kr`
- **어드민**: `https://admin.tourstream.kr`
- **API**: `https://api.tourstream.kr`
