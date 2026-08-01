# AWS 배포 전 체크리스트

## 📋 현재 상태

### ✅ 이미 완료된 것
- **메인 앱**: AWS에 등록되어 있음 (tourstream.kr)

### ⚠️ 배포 전 필요한 작업

---

## 1. 환경 변수 설정

### 1.1 메인 앱 (packages/main)
**필요한 환경 변수:**
```bash
REACT_APP_API_URL=https://api.tourstream.kr/api
```

**설정 방법:**
- 빌드 시 환경 변수 주입 필요
- `npm run build:production` 사용 (자동으로 환경 변수 포함)

### 1.2 어드민 앱 (packages/admin)
**필요한 환경 변수:**
```bash
REACT_APP_API_URL=https://api.tourstream.kr/api
```

**설정 방법:**
- 빌드 시 환경 변수 주입 필요
- `npm run build:production` 사용 (자동으로 환경 변수 포함)

### 1.3 API 서버 (packages/server)
**필요한 환경 변수:**
```bash
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
```

**설정 방법:**
- EC2 인스턴스에서 `.env` 파일 또는 환경 변수로 설정
- PM2 ecosystem 파일 사용 권장

---

## 2. 도메인/서브도메인 설정

### 2.1 필요한 도메인
- ✅ **메인**: `tourstream.kr` (이미 설정됨)
- ⚠️ **어드민**: `admin.tourstream.kr` (새로 필요)
- ⚠️ **API**: `api.tourstream.kr` (새로 필요)

### 2.2 DNS 설정 (Route 53 또는 도메인 제공업체)
```
admin.tourstream.kr  →  CloudFront 배포 URL (어드민)
api.tourstream.kr    →  EC2 인스턴스 IP 또는 Elastic IP
```

### 2.3 SSL 인증서
- **어드민**: CloudFront에서 ACM 인증서 사용
- **API**: Let's Encrypt 또는 ACM 인증서 사용

---

## 3. CORS 설정 확인

### 3.1 현재 설정
API 서버는 `CORS_ORIGIN` 환경 변수를 사용합니다:
```javascript
// packages/server/src/index.js
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];
```

### 3.2 프로덕션 설정
```bash
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
```

**⚠️ 중요**: 
- 프로토콜(`https://`) 포함 필수
- 마지막에 슬래시(`/`) 없어야 함
- 여러 도메인은 쉼표로 구분
- **어드민을 서브도메인으로 배포하는 경우 반드시 포함 필요**

---

## 4. 빌드 설정

### 4.1 메인 앱 빌드
```bash
cd packages/main
REACT_APP_API_URL=https://api.tourstream.kr/api npm run build
```

### 4.2 어드민 앱 빌드
```bash
cd packages/admin
REACT_APP_API_URL=https://api.tourstream.kr/api npm run build
```

### 4.3 빌드 스크립트 개선 (선택사항)
`package.json`에 환경별 빌드 스크립트 추가:
```json
{
  "scripts": {
    "build:production": "REACT_APP_API_URL=https://api.tourstream.kr/api react-scripts build",
    "build:beta": "REACT_APP_API_URL=https://api-beta.tourstream.kr/api react-scripts build"
  }
}
```

---

## 5. API 서버 배포 설정

### 5.1 데이터 디렉토리 구조
```
/var/www/api/
├── src/
├── data/
│   ├── production/
│   │   ├── products.json
│   │   ├── categories.json
│   │   ├── locations.json
│   │   └── counter.json
│   └── beta/
│       └── ...
└── .env
```

### 5.2 PM2 설정 (ecosystem.config.js)
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
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 5.3 Nginx 설정 (리버스 프록시)
```nginx
server {
    listen 80;
    server_name api.tourstream.kr;
    
    # HTTPS로 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.tourstream.kr;
    
    ssl_certificate /etc/letsencrypt/live/api.tourstream.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tourstream.kr/privkey.pem;
    
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
    }
}
```

---

## 6. S3 + CloudFront 설정

### 6.1 어드민 앱 S3 버킷
- 버킷 이름: `tourstream-admin` (또는 원하는 이름)
- 정적 웹사이트 호스팅 활성화
- 버킷 정책: 공개 읽기 권한

### 6.2 CloudFront 배포
- Origin: `tourstream-admin.s3.amazonaws.com`
- Domain: `admin.tourstream.kr`
- SSL 인증서: ACM에서 발급
- Default Root Object: `index.html`
- Error Pages: 404 → `/index.html` (SPA 라우팅)

---

## 7. 보안 설정

### 7.1 EC2 보안 그룹
- **HTTP (80)**: CloudFront만 허용 (또는 Let's Encrypt 인증용)
- **HTTPS (443)**: 모든 IP 허용
- **SSH (22)**: 본인 IP만 허용
- **API 포트 (3002)**: localhost만 허용 (Nginx를 통해서만 접근)

### 7.2 S3 버킷 정책
```json
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
```

---

## 8. 배포 순서

### 8.1 API 서버 배포 (먼저)
1. EC2 인스턴스 생성
2. Node.js 설치
3. 코드 배포
4. 환경 변수 설정
5. PM2로 서버 시작
6. Nginx 설정
7. SSL 인증서 발급
8. DNS 설정 (api.tourstream.kr)

### 8.2 어드민 앱 배포
1. S3 버킷 생성
2. 빌드 (환경 변수 포함)
3. S3에 업로드
4. CloudFront 배포 생성
5. SSL 인증서 연결
6. DNS 설정 (admin.tourstream.kr)

### 8.3 메인 앱 업데이트
1. 빌드 (환경 변수 포함)
2. S3에 업로드
3. CloudFront 캐시 무효화

---

## 9. 테스트 체크리스트

### 9.1 API 서버 테스트
- [ ] `https://api.tourstream.kr/` 접속 확인
- [ ] `https://api.tourstream.kr/api/products` 데이터 확인
- [ ] CORS 헤더 확인 (브라우저 개발자 도구)
- [ ] SSL 인증서 확인

### 9.2 어드민 앱 테스트
- [ ] `https://admin.tourstream.kr` 접속 확인
- [ ] API 서버 연결 확인
- [ ] 상품 등록/수정/삭제 테스트
- [ ] SSL 인증서 확인

### 9.3 메인 앱 테스트
- [ ] `https://tourstream.kr` 접속 확인
- [ ] API 서버 연결 확인
- [ ] 상품 목록 표시 확인
- [ ] 상품 상세 페이지 확인

---

## 10. 환경 변수 파일 템플릿

### 10.1 메인 앱 (.env.production)
```bash
REACT_APP_API_URL=https://api.tourstream.kr/api
```

### 10.2 어드민 앱 (.env.production)
```bash
REACT_APP_API_URL=https://api.tourstream.kr/api
```

### 10.3 API 서버 (.env)
```bash
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
```

---

## 11. 베타 환경 설정 (선택사항)

베타 환경을 별도로 운영하려면:

### 11.1 도메인
- `beta.tourstream.kr` (메인)
- `admin-beta.tourstream.kr` (어드민)
- `api-beta.tourstream.kr` (API)

### 11.2 환경 변수
```bash
# 메인/어드민
REACT_APP_API_URL=https://api-beta.tourstream.kr/api

# API 서버
CORS_ORIGIN=https://beta.tourstream.kr,https://admin-beta.tourstream.kr
DATA_DIR=/var/www/api/data/beta
```

---

## 12. 모니터링 및 로그

### 12.1 PM2 로그
```bash
pm2 logs tourstream-api
pm2 monit
```

### 12.2 Nginx 로그
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 12.3 CloudWatch (선택사항)
- S3 버킷 접근 로그
- CloudFront 로그
- EC2 인스턴스 모니터링

---

## ⚠️ 주의사항

1. **환경 변수 노출 방지**
   - `.env` 파일은 `.gitignore`에 포함되어 있는지 확인
   - 빌드된 파일에 환경 변수가 포함되지 않도록 주의

2. **데이터 백업**
   - API 서버의 데이터 파일 정기 백업
   - S3 버전 관리 활성화

3. **캐시 무효화**
   - CloudFront 배포 후 캐시 무효화 필요
   - 변경사항이 즉시 반영되지 않을 수 있음

4. **SSL 인증서 갱신**
   - Let's Encrypt 인증서는 90일마다 갱신 필요
   - 자동 갱신 설정 권장

---

## 📝 체크리스트 요약

배포 전 확인:
- [ ] 환경 변수 파일 생성
- [ ] 도메인/서브도메인 DNS 설정
- [ ] SSL 인증서 발급
- [ ] CORS 설정 확인
- [ ] 빌드 스크립트 테스트
- [ ] API 서버 배포
- [ ] 어드민 앱 배포
- [ ] 메인 앱 업데이트
- [ ] 전체 테스트
