#!/bin/bash
# 서버에서 실행하거나, 로컬에서 실행하세요

KEY_FILE="$HOME/Desktop/tour-stream-api-key.pem"
SERVER="ubuntu@43.201.66.181"

echo "🔧 PM2 설정 파일 수정 중..."

# ecosystem.config.cjs 생성
ssh -i "$KEY_FILE" "$SERVER" "cd /var/www/api && cat > ecosystem.config.cjs << 'EOF'
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
"

# 기존 프로세스 삭제 및 재시작
echo "🚀 PM2 서버 재시작 중..."
ssh -i "$KEY_FILE" "$SERVER" "cd /var/www/api && pm2 delete tourstream-api 2>/dev/null || true && pm2 start ecosystem.config.cjs && pm2 save && sleep 2 && pm2 status"

# 서버 테스트
echo "🧪 서버 테스트 중..."
ssh -i "$KEY_FILE" "$SERVER" "curl -s http://localhost:3002/ | head -10"

echo ""
echo "✅ 완료!"
