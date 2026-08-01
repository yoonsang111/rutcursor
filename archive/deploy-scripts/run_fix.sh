#!/bin/bash
# 이 파일을 더블클릭하거나 터미널에서 실행하세요

cd "$(dirname "$0")"

KEY_FILE="$HOME/Desktop/tour-stream-api-key.pem"
SERVER="ubuntu@43.201.66.181"
TMP_KEY="./.tour-stream-api-key.clean.pem"

echo "🔧 PM2 설정 파일 수정 중..."

# Desktop 키에 붙은 macOS 메타데이터로 ssh가 실패할 수 있어,
# 워크스페이스에 clean 키를 만들어 사용합니다.
if [ ! -f "$KEY_FILE" ]; then
  echo "❌ 키 파일을 찾을 수 없습니다: $KEY_FILE"
  exit 1
fi
umask 177
cat "$KEY_FILE" > "$TMP_KEY"
chmod 400 "$TMP_KEY"

# ecosystem.config.cjs 업로드
echo "📤 파일 업로드 중..."
scp -i "$TMP_KEY" ecosystem.config.cjs "$SERVER:/var/www/api/"

# PM2 재시작
echo "🚀 PM2 서버 재시작 중..."
ssh -i "$TMP_KEY" "$SERVER" "cd /var/www/api && pm2 delete tourstream-api 2>/dev/null || true"
ssh -i "$TMP_KEY" "$SERVER" "cd /var/www/api && pm2 start ecosystem.config.cjs"
ssh -i "$TMP_KEY" "$SERVER" "pm2 save"

# 서버 테스트
echo "🧪 서버 테스트 중..."
sleep 2
ssh -i "$TMP_KEY" "$SERVER" "curl -s http://localhost:3002/ | head -10"
echo ""
ssh -i "$TMP_KEY" "$SERVER" "pm2 status"

echo ""
echo "✅ 완료!"
echo ""
echo "서버 접속: http://43.201.66.181:3002/"

# 임시 키 정리
rm -f "$TMP_KEY"
