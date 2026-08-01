#!/bin/bash
# 서버 터미널에서 실행하세요!

cd /var/www/api

# 의존성 설치
echo "📦 의존성 설치 중..."
npm install --production

# PM2로 서버 시작
echo "🚀 PM2로 서버 시작 중..."
pm2 delete tourstream-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 서버 테스트
echo "🧪 서버 테스트 중..."
sleep 2
curl -s http://localhost:3002/ | head -10

echo ""
echo "✅ 완료!"
pm2 status
