# 단계별 API 서버 설정 (안전한 방법)

## ⚠️ 문제 원인

스크립트를 한 번에 복사-붙여넣기할 때:
- heredoc 구문이 제대로 처리되지 않음
- 긴 스크립트가 중간에 끊김
- 특수 문자 처리 문제

---

## ✅ 해결 방법: 단계별로 실행

### 서버 터미널에서 하나씩 실행하세요!

---

## 1단계: 디렉토리 생성

```bash
sudo mkdir -p /var/www/api/data/production /var/www/api/logs /var/www/api/src
sudo chown -R ubuntu:ubuntu /var/www/api
cd /var/www/api
```

**실행 후:** `ls -la` 로 확인

---

## 2단계: package.json 생성

```bash
cat > package.json << 'EOF'
{
  "name": "@tourstream/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF
```

**실행 후:** `cat package.json` 으로 확인

---

## 3단계: .env 파일 생성

```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
EOF
```

**실행 후:** `cat .env` 으로 확인

---

## 4단계: ecosystem.config.js 생성

```bash
cat > ecosystem.config.js << 'EOF'
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
EOF
```

**실행 후:** `cat ecosystem.config.js` 으로 확인

---

## 5단계: 의존성 설치

```bash
npm install --production
```

**실행 후:** `ls node_modules` 으로 확인

---

## 6단계: src/index.js 파일 생성

**이 파일은 길기 때문에 별도로 안내하겠습니다.**

---

## 💡 더 나은 방법: 파일 업로드

**로컬에서 파일을 서버로 업로드하는 방법:**

```bash
# 로컬 터미널에서
scp -i ~/Desktop/tour-stream-api-key.pem packages/server/src/index.js ubuntu@43.201.66.181:/var/www/api/src/
scp -i ~/Desktop/tour-stream-api-key.pem packages/server/package.json ubuntu@43.201.66.181:/var/www/api/
```

---

## 🎯 추천 방법

**가장 안전한 방법:**
1. 로컬 파일을 서버로 업로드 (scp)
2. 또는 단계별로 하나씩 실행

어떤 방법을 선호하시나요?
