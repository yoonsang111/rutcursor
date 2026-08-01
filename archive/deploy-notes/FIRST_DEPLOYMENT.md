# 최초 배포 가이드

## 🎯 목표
베타와 라이브 환경을 서버에 최초로 배포하기

---

## 📋 사전 준비사항

### 1. 서버 준비
- [ ] 베타 서버 준비 (또는 단일 서버 사용)
- [ ] 라이브 서버 준비
- [ ] SSH 접속 가능한지 확인
- [ ] Node.js 설치 (v18 이상)
- [ ] Nginx 또는 Apache 설치 (웹 서버)

### 2. 도메인 설정
- [ ] 베타 도메인: `beta.tourstream.kr` (또는 원하는 도메인)
- [ ] 라이브 도메인: `tourstream.kr` (또는 원하는 도메인)
- [ ] DNS 설정 완료

### 3. 로컬 환경 확인
- [ ] 프로젝트가 정상적으로 빌드되는지 확인
- [ ] 로컬에서 모든 기능이 작동하는지 확인

---

## 🚀 배포 단계

### 1단계: 배포 스크립트 준비

#### 1-1. 배포 설정 파일 생성
```bash
# 설정 파일 예시 복사
cp deploy-config.sh.example deploy-config.sh

# 설정 파일 편집 (실제 서버 정보 입력)
nano deploy-config.sh
# 또는
vim deploy-config.sh
```

`deploy-config.sh` 파일 내용:
```bash
#!/bin/bash

# 베타 서버 설정
BETA_HOST="beta.tourstream.kr"  # 실제 베타 서버 주소
BETA_USER="ubuntu"              # 실제 사용자명
BETA_PATH="/var/www/beta"       # 실제 경로

# 라이브 서버 설정
PRODUCTION_HOST="tourstream.kr"  # 실제 라이브 서버 주소
PRODUCTION_USER="ubuntu"         # 실제 사용자명
PRODUCTION_PATH="/var/www/production"  # 실제 경로
```

#### 1-2. 배포 스크립트 실행 권한 부여
```bash
chmod +x scripts/deploy-beta.sh
chmod +x scripts/deploy-production.sh
```

---

### 2단계: 환경 변수 파일 생성

#### 2-1. 베타 환경 변수
`packages/main/.env.beta`:
```env
REACT_APP_API_URL=https://beta-api.tourstream.kr/api
REACT_APP_ENV=beta
```

`packages/admin/.env.beta`:
```env
REACT_APP_API_URL=https://beta-api.tourstream.kr/api
REACT_APP_ENV=beta
```

`packages/server/.env.beta`:
```env
NODE_ENV=beta
PORT=3002
DATA_DIR=./data/beta
CORS_ORIGIN=https://beta.tourstream.kr,https://beta-admin.tourstream.kr
```

#### 2-2. 라이브 환경 변수
`packages/main/.env.production`:
```env
REACT_APP_API_URL=https://api.tourstream.kr/api
REACT_APP_ENV=production
```

`packages/admin/.env.production`:
```env
REACT_APP_API_URL=https://api.tourstream.kr/api
REACT_APP_ENV=production
```

`packages/server/.env.production`:
```env
NODE_ENV=production
PORT=3002
DATA_DIR=./data/production
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
```

---

### 3단계: 서버 초기 설정

#### 3-1. 서버에 접속
```bash
ssh ubuntu@beta.tourstream.kr
# 또는
ssh ubuntu@tourstream.kr
```

#### 3-2. 서버 디렉토리 생성
```bash
# 베타 서버
sudo mkdir -p /var/www/beta/{main,admin,api}
sudo chown -R $USER:$USER /var/www/beta

# 라이브 서버
sudo mkdir -p /var/www/production/{main,admin,api}
sudo chown -R $USER:$USER /var/www/production
```

#### 3-3. Node.js 설치 확인
```bash
node --version  # v18 이상이어야 함
npm --version
```

Node.js가 없으면 설치:
```bash
# Node.js 18 설치 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 또는 nvm 사용
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 3-4. PM2 설치 (선택사항, 권장)
```bash
npm install -g pm2
```

---

### 4단계: Nginx 설정 (웹 서버)

#### 4-1. Nginx 설치
```bash
sudo apt update
sudo apt install nginx
```

#### 4-2. 베타 Nginx 설정
`/etc/nginx/sites-available/beta.tourstream.kr`:
```nginx
# 베타 메인 앱
server {
    listen 80;
    server_name beta.tourstream.kr;
    
    root /var/www/beta/main;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 베타 어드민
server {
    listen 80;
    server_name beta-admin.tourstream.kr;
    
    root /var/www/beta/admin;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 베타 API
server {
    listen 80;
    server_name beta-api.tourstream.kr;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4-3. 라이브 Nginx 설정
`/etc/nginx/sites-available/tourstream.kr`:
```nginx
# 라이브 메인 앱
server {
    listen 80;
    server_name tourstream.kr www.tourstream.kr;
    
    root /var/www/production/main;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 라이브 어드민
server {
    listen 80;
    server_name admin.tourstream.kr;
    
    root /var/www/production/admin;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 라이브 API
server {
    listen 80;
    server_name api.tourstream.kr;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4-4. Nginx 설정 활성화
```bash
# 베타
sudo ln -s /etc/nginx/sites-available/beta.tourstream.kr /etc/nginx/sites-enabled/
sudo nginx -t  # 설정 테스트
sudo systemctl reload nginx

# 라이브
sudo ln -s /etc/nginx/sites-available/tourstream.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4-5. SSL 인증서 설정 (Let's Encrypt)
```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx

# 베타 SSL 인증서 발급
sudo certbot --nginx -d beta.tourstream.kr -d beta-admin.tourstream.kr -d beta-api.tourstream.kr

# 라이브 SSL 인증서 발급
sudo certbot --nginx -d tourstream.kr -d www.tourstream.kr -d admin.tourstream.kr -d api.tourstream.kr
```

---

### 5단계: 베타 배포

#### 5-1. 로컬에서 베타 배포 실행
```bash
./scripts/deploy-beta.sh
```

또는 수동으로:
```bash
# 1. 빌드
npm run build:all

# 2. 업로드
scp -r packages/main/build/* ubuntu@beta.tourstream.kr:/var/www/beta/main/
scp -r packages/admin/build/* ubuntu@beta.tourstream.kr:/var/www/beta/admin/
scp -r packages/server/* ubuntu@beta.tourstream.kr:/var/www/beta/api/

# 3. 환경 변수 업로드
scp packages/main/.env.beta ubuntu@beta.tourstream.kr:/var/www/beta/main/.env
scp packages/admin/.env.beta ubuntu@beta.tourstream.kr:/var/www/beta/admin/.env
scp packages/server/.env.beta ubuntu@beta.tourstream.kr:/var/www/beta/api/.env

# 4. 서버에서 의존성 설치 및 서버 시작
ssh ubuntu@beta.tourstream.kr
cd /var/www/beta/api
npm install --production
pm2 start src/index.js --name tourstream-api-beta
```

#### 5-2. 베타 테스트
- 베타 사이트 접속: `https://beta.tourstream.kr`
- 베타 어드민 접속: `https://beta-admin.tourstream.kr`
- 기능 테스트
- 문제 확인 및 수정

---

### 6단계: 라이브 배포 (베타 테스트 완료 후)

#### 6-1. 라이브 배포 실행
```bash
./scripts/deploy-production.sh
```

#### 6-2. 라이브 확인
- 라이브 사이트 접속: `https://tourstream.kr`
- 라이브 어드민 접속: `https://admin.tourstream.kr`
- 주요 기능 테스트

---

## 🔧 문제 해결

### 문제 1: SSH 접속 실패
```bash
# SSH 키 확인
ssh-keygen -t rsa -b 4096
ssh-copy-id ubuntu@beta.tourstream.kr
```

### 문제 2: 권한 오류
```bash
# 서버에서 권한 설정
sudo chown -R $USER:$USER /var/www/beta
sudo chown -R $USER:$USER /var/www/production
```

### 문제 3: 포트 충돌
```bash
# 사용 중인 포트 확인
sudo netstat -tulpn | grep :3002
# 또는
sudo lsof -i :3002
```

### 문제 4: PM2 서버 재시작
```bash
pm2 restart tourstream-api-beta
pm2 restart tourstream-api-production
pm2 logs  # 로그 확인
```

---

## 📝 체크리스트

### 배포 전
- [ ] 서버 준비 완료
- [ ] 도메인 DNS 설정 완료
- [ ] SSH 접속 가능
- [ ] Node.js 설치 완료
- [ ] Nginx 설치 및 설정 완료
- [ ] 환경 변수 파일 생성 완료
- [ ] 로컬 빌드 성공 확인

### 베타 배포 후
- [ ] 베타 사이트 접속 확인
- [ ] 베타 어드민 접속 확인
- [ ] API 연결 확인
- [ ] 주요 기능 테스트
- [ ] 에러 로그 확인

### 라이브 배포 후
- [ ] 라이브 사이트 접속 확인
- [ ] 라이브 어드민 접속 확인
- [ ] SSL 인증서 확인
- [ ] 주요 기능 테스트
- [ ] 모니터링 설정

---

## 💡 팁

1. **처음에는 단일 서버로 시작**: 비용 절감을 위해 베타와 라이브를 같은 서버의 다른 포트/경로로 운영
2. **백업 필수**: 배포 전 항상 데이터 백업
3. **점진적 배포**: 큰 변경사항은 작은 단위로 나눠서 배포
4. **모니터링 설정**: PM2, Nginx 로그 모니터링

---

## 🆘 도움이 필요하면

배포 중 문제가 발생하면:
1. 에러 메시지 확인
2. 서버 로그 확인 (`pm2 logs`, `sudo journalctl -u nginx`)
3. 네트워크 연결 확인 (`curl http://localhost:3002`)
