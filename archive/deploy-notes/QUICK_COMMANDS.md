# 빠른 명령어 모음

## 🚀 PM2 설정 수정 (가장 빠른 방법)

```bash
cd /Users/iyunsang/rutcursor
./run_fix.sh
```

---

## 📤 파일 업로드만 하기

```bash
scp -i ~/Desktop/tour-stream-api-key.pem ecosystem.config.cjs ubuntu@43.201.66.181:/var/www/api/
```

---

## 🔧 서버에서 직접 실행

**서버 터미널에서:**

```bash
cd /var/www/api
pm2 delete tourstream-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
curl http://localhost:3002/
```

---

## ✅ 확인 명령어

```bash
# PM2 상태
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181 "pm2 status"

# API 테스트
curl http://43.201.66.181:3002/
```
