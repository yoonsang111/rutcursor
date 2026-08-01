# 서버 터미널에서 실행할 명령어

## 🎯 서버 터미널에 이 명령어를 복사해서 붙여넣으세요!

**아래 명령어 전체를 복사해서 서버 터미널에 붙여넣고 Enter를 누르세요:**

---

## 📋 전체 명령어 (한 번에 실행)

```bash
sudo apt update -y && curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs && sudo npm install -g pm2 && sudo apt install nginx -y && sudo mkdir -p /var/www/api/data/production /var/www/api/logs /var/www/api/src && sudo chown -R ubuntu:ubuntu /var/www/api && cd /var/www/api && cat > package.json << 'PKGEOF'
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
PKGEOF
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
ENVEOF
cat > ecosystem.config.js << 'PM2EOF'
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
PM2EOF
npm install --production && echo "✅ 기본 설정 완료! 다음: src/index.js 파일 생성"
```

---

## ⚠️ 주의사항

**이 명령어는 길기 때문에:**
1. 전체를 복사하세요
2. 서버 터미널에 붙여넣으세요
3. Enter를 누르세요
4. 완료될 때까지 기다리세요 (약 2-3분)

---

## 📝 다음 단계

**위 명령어가 완료되면:**
- "✅ 기본 설정 완료!" 메시지가 보입니다
- 그 다음 `src/index.js` 파일을 만들어야 합니다

**완료되면 알려주세요!** 다음 단계를 안내하겠습니다.
