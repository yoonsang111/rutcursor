# API 서버 배포 가이드 - 단계별

## ✅ 현재 상태

- ✅ 서버 접속 완료
- ✅ Ubuntu 22.04.4 LTS
- ⏳ 다음: API 서버 배포

---

## 📋 배포 단계

### 1단계: 시스템 업데이트

**터미널에서 실행:**

```bash
# 패키지 목록 업데이트
sudo apt update

# 시스템 업그레이드 (선택사항, 시간이 걸릴 수 있음)
sudo apt upgrade -y
```

**실행 시간:** 약 1-2분

---

### 2단계: Node.js 설치

```bash
# Node.js 18.x 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 설치 확인
node --version
npm --version
```

**예상 결과:**
- `node --version`: `v18.x.x`
- `npm --version`: `9.x.x` 또는 `10.x.x`

---

### 3단계: PM2 설치

```bash
# PM2 전역 설치
sudo npm install -g pm2

# 설치 확인
pm2 --version
```

**예상 결과:**
- `pm2 --version`: `5.x.x`

---

### 4단계: Nginx 설치

```bash
# Nginx 설치
sudo apt install nginx -y

# Nginx 상태 확인
sudo systemctl status nginx
```

**예상 결과:**
- Nginx가 설치되고 실행 중

---

### 5단계: 프로젝트 디렉토리 생성

```bash
# 디렉토리 생성
sudo mkdir -p /var/www/api
cd /var/www/api

# 권한 설정
sudo chown -R ubuntu:ubuntu /var/www/api
```

---

### 6단계: 코드 배포

**방법 1: Git 사용 (권장)**

```bash
cd /var/www/api
# Git 저장소가 있다면
git clone [repository-url] .
```

**방법 2: 파일 업로드**

로컬 컴퓨터에서:
```bash
# 로컬 터미널에서 실행
scp -i [키파일경로] -r packages/server/* ubuntu@13.209.15.252:/var/www/api/
```

---

### 7단계: 의존성 설치

```bash
cd /var/www/api
npm install --production
```

---

### 8단계: 환경 변수 설정

```bash
cd /var/www/api
nano .env
```

**내용:**
```bash
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
```

**저장:** `Ctrl + X`, `Y`, `Enter`

---

### 9단계: 데이터 디렉토리 생성

```bash
mkdir -p /var/www/api/data/production
```

---

### 10단계: PM2로 서버 시작

```bash
cd /var/www/api

# ecosystem.config.js 파일 생성
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

**저장 후:**
```bash
# 로그 디렉토리 생성
mkdir -p logs

# PM2로 시작
pm2 start ecosystem.config.js

# PM2 저장 (재부팅 시 자동 시작)
pm2 save
pm2 startup
```

---

## ✅ 서버 확인

```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs tourstream-api

# 서버 테스트
curl http://localhost:3002/
```

---

## 🎯 지금 시작하세요!

**1단계부터 차근차근 진행하세요:**

1. `sudo apt update` 실행
2. 결과 알려주기
3. 다음 단계 안내

**각 단계마다 결과를 알려주시면 확인하고 다음 단계를 안내하겠습니다!** 🚀
