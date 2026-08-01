#!/bin/bash

# 전체 API 서버 배포 스크립트
# 서버 터미널에서 이 스크립트 전체를 복사해서 실행하세요

set -e

echo "🚀 API 서버 배포를 시작합니다..."

# 1단계: 시스템 업데이트
echo "📦 1단계: 시스템 업데이트 중..."
sudo apt update

# 2단계: Node.js 설치
echo "📦 2단계: Node.js 설치 중..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "✅ Node.js: $(node --version)"

# 3단계: PM2 설치
echo "📦 3단계: PM2 설치 중..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
echo "✅ PM2: $(pm2 --version)"

# 4단계: Nginx 설치
echo "📦 4단계: Nginx 설치 중..."
if ! command -v nginx &> /dev/null; then
    sudo apt install nginx -y
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi
echo "✅ Nginx 설치 완료"

# 5단계: 디렉토리 생성
echo "📦 5단계: 디렉토리 생성 중..."
sudo mkdir -p /var/www/api
sudo mkdir -p /var/www/api/data/production
sudo mkdir -p /var/www/api/logs
sudo mkdir -p /var/www/api/src
sudo chown -R ubuntu:ubuntu /var/www/api
cd /var/www/api

# 6단계: package.json 생성
echo "📦 6단계: package.json 생성 중..."
cat > package.json << 'PKGEOF'
{
  "name": "@tourstream/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
PKGEOF

# 7단계: 환경 변수 파일 생성
echo "📦 7단계: 환경 변수 파일 생성 중..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
ENVEOF

# 8단계: PM2 설정 파일 생성
echo "📦 8단계: PM2 설정 파일 생성 중..."
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

echo "✅ 기본 설정 완료!"
echo ""
echo "⚠️  다음: src/index.js 파일을 만들어야 합니다."
echo "   CREATE_INDEX_JS_ON_SERVER.sh 스크립트를 실행하세요."
