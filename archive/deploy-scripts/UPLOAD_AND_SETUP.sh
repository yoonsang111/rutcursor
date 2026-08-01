#!/bin/bash
# 로컬 터미널에서 실행하세요!

KEY_FILE="$HOME/Desktop/tour-stream-api-key.pem"
SERVER="ubuntu@43.201.66.181"

echo "🚀 서버 설정 시작..."

# 1. 디렉토리 생성
echo "📦 1단계: 디렉토리 생성..."
ssh -i "$KEY_FILE" "$SERVER" "sudo mkdir -p /var/www/api/src /var/www/api/data/production /var/www/api/logs && sudo chown -R ubuntu:ubuntu /var/www/api"

# 2. package.json 업로드
echo "📤 2단계: package.json 업로드..."
scp -i "$KEY_FILE" packages/server/package.json "$SERVER:/var/www/api/"

# 3. index.js 업로드
echo "📤 3단계: index.js 업로드..."
scp -i "$KEY_FILE" packages/server/src/index.js "$SERVER:/var/www/api/src/"

# 4. .env 파일 생성
echo "📝 4단계: .env 파일 생성..."
ssh -i "$KEY_FILE" "$SERVER" "cd /var/www/api && cat > .env << 'EOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
EOF
"

# 5. ecosystem.config.cjs 생성 (CommonJS 형식)
echo "📝 5단계: ecosystem.config.cjs 생성..."
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

# 6. 의존성 설치
echo "📦 6단계: 의존성 설치..."
ssh -i "$KEY_FILE" "$SERVER" "cd /var/www/api && npm install --production"

# 7. PM2로 서버 시작
echo "🚀 7단계: PM2로 서버 시작..."
ssh -i "$KEY_FILE" "$SERVER" "cd /var/www/api && pm2 delete tourstream-api 2>/dev/null || true && pm2 start ecosystem.config.cjs && pm2 save"

# 8. 서버 테스트
echo "🧪 8단계: 서버 테스트..."
sleep 3
ssh -i "$KEY_FILE" "$SERVER" "curl -s http://localhost:3002/ && echo '' && pm2 status"

echo ""
echo "✅ 완료!"
echo ""
echo "서버 접속: http://43.201.66.181:3002/"
