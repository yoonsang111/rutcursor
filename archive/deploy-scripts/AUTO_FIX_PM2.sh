#!/bin/bash
# 이 스크립트는 자동으로 실행됩니다

KEY_FILE="$HOME/Desktop/tour-stream-api-key.pem"
SERVER="ubuntu@43.201.66.181"

echo "🔧 PM2 설정 파일 수정 중..."

# ecosystem.config.cjs 업로드
scp -i "$KEY_FILE" ecosystem.config.cjs "$SERVER:/var/www/api/"

# PM2 재시작
echo "🚀 PM2 서버 재시작 중..."
ssh -i "$KEY_FILE" "$SERVER" "cd /var/www/api && pm2 delete tourstream-api 2>/dev/null || true && pm2 start ecosystem.config.cjs && pm2 save"

# 서버 테스트
echo "🧪 서버 테스트 중..."
sleep 3
ssh -i "$KEY_FILE" "$SERVER" "curl -s http://localhost:3002/ && echo '' && pm2 status"

echo ""
echo "✅ 완료!"
echo ""
echo "서버 접속: http://43.201.66.181:3002/"
