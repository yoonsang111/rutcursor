# 서버 터미널에서 실행할 명령어

## 🎯 서버 터미널에 접속되어 있다면

**이 명령어들을 서버 터미널에 복사해서 실행하세요!**

---

## 📋 전체 명령어 (한 번에 실행)

**서버 터미널에서 아래 명령어를 전체 복사해서 붙여넣으세요:**

```bash
# 전체 스크립트 실행
bash <(curl -s https://raw.githubusercontent.com/your-repo/setup.sh)
```

**또는 단계별로 실행:**

---

## 1단계: 기본 설정

**서버 터미널에서 실행:**

```bash
sudo apt update && \
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
sudo apt-get install -y nodejs && \
sudo npm install -g pm2 && \
sudo apt install nginx -y && \
sudo mkdir -p /var/www/api/data/production /var/www/api/logs /var/www/api/src && \
sudo chown -R ubuntu:ubuntu /var/www/api && \
cd /var/www/api
```

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

---

## 3단계: 환경 변수 파일 생성

```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
EOF
```

---

## 4단계: PM2 설정 파일 생성

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

---

## 5단계: src/index.js 파일 생성

**이 파일은 길기 때문에 별도 파일로 제공하겠습니다.**

**서버 터미널에서:**

```bash
# 파일을 직접 만들기
nano src/index.js
```

**그 다음 파일 내용을 붙여넣으세요.**

---

## 🚀 빠른 방법

**가장 간단한 방법:**

1. **로컬에서 파일 준비**
2. **서버에 업로드** (키 파일 필요)
3. **또는 서버에서 직접 만들기**

**어떤 방법을 선호하시나요?**
