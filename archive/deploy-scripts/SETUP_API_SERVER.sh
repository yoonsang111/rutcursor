#!/bin/bash
# 서버 터미널에 이 전체 내용을 복사해서 붙여넣으세요!

set -e

echo "🚀 API 서버 설정을 시작합니다..."

# 디렉토리 생성
echo "📦 디렉토리 생성 중..."
sudo mkdir -p /var/www/api
sudo mkdir -p /var/www/api/data/production
sudo mkdir -p /var/www/api/logs
sudo mkdir -p /var/www/api/src
sudo chown -R ubuntu:ubuntu /var/www/api
cd /var/www/api

# package.json 생성
echo "📦 package.json 생성 중..."
cat > package.json << 'PKGEOF'
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

# 환경 변수 파일 생성
echo "📦 환경 변수 파일 생성 중..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
ENVEOF

# PM2 설정 파일 생성
echo "📦 PM2 설정 파일 생성 중..."
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

# 의존성 설치
echo "📦 의존성 설치 중..."
npm install --production

echo "✅ 기본 설정 완료!"
echo ""
echo "다음: src/index.js 파일을 생성해야 합니다."
