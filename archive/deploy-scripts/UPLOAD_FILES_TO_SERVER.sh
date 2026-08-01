#!/bin/bash
# 로컬 터미널에서 실행하세요!

# 키 파일과 서버 IP
KEY_FILE="$HOME/Desktop/tour-stream-api-key.pem"
SERVER_IP="43.201.66.181"
SERVER_USER="ubuntu"

echo "📤 서버로 파일 업로드 중..."

# 서버에 디렉토리 생성
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" "sudo mkdir -p /var/www/api/src /var/www/api/data/production /var/www/api/logs && sudo chown -R ubuntu:ubuntu /var/www/api"

# package.json 업로드
echo "📤 package.json 업로드 중..."
scp -i "$KEY_FILE" packages/server/package.json "$SERVER_USER@$SERVER_IP:/var/www/api/"

# index.js 업로드
echo "📤 src/index.js 업로드 중..."
scp -i "$KEY_FILE" packages/server/src/index.js "$SERVER_USER@$SERVER_IP:/var/www/api/src/"

# .env 파일 생성
echo "📤 .env 파일 생성 중..."
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" "cd /var/www/api && cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
ENVEOF
"

# ecosystem.config.js 생성
echo "📤 ecosystem.config.js 생성 중..."
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" "cd /var/www/api && cat > ecosystem.config.js << 'PM2EOF'
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
"

echo "✅ 파일 업로드 완료!"
echo ""
echo "다음: 서버에서 의존성 설치 및 서버 시작"
