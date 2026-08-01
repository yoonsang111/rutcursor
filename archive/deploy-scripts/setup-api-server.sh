#!/bin/bash

# API 서버 설정 스크립트
# 서버 터미널에서 실행하세요

set -e

echo "🔧 API 서버 설정을 시작합니다..."

cd /var/www/api

# 환경 변수 파일 생성
echo "📝 환경 변수 파일 생성 중..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
EOF

echo "✅ .env 파일이 생성되었습니다"

# PM2 설정 파일 생성
echo "📝 PM2 설정 파일 생성 중..."
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

echo "✅ ecosystem.config.js 파일이 생성되었습니다"

# 의존성 설치
if [ -f "package.json" ]; then
    echo "📦 의존성 설치 중..."
    npm install --production
    echo "✅ 의존성 설치 완료"
else
    echo "⚠️ package.json 파일이 없습니다. 코드를 먼저 업로드하세요."
fi

echo ""
echo "✅ 설정이 완료되었습니다!"
echo ""
echo "다음 명령어로 서버를 시작하세요:"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup"
