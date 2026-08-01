# PM2 설정 파일 수정 가이드

## 🔧 문제

`package.json`에 `"type": "module"`이 있어서 `ecosystem.config.js`가 ES Module로 인식됩니다.
PM2는 CommonJS 형식의 설정 파일이 필요합니다.

## ✅ 해결 방법

### 방법 1: 수정 스크립트 실행 (추천)

**로컬 터미널에서:**

```bash
chmod +x FIX_PM2_CONFIG.sh
./FIX_PM2_CONFIG.sh
```

### 방법 2: 수동으로 수정

**서버 터미널에서:**

```bash
cd /var/www/api

# ecosystem.config.cjs 생성
cat > ecosystem.config.cjs << 'EOF'
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

# 기존 프로세스 삭제 및 재시작
pm2 delete tourstream-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# 서버 테스트
curl http://localhost:3002/
pm2 status
```

---

## ✅ 완료 후 확인

**서버가 정상 작동하는지 확인:**

```bash
curl http://43.201.66.181:3002/
```

**PM2 상태 확인:**

```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181 "pm2 status"
```
