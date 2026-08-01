# 지금 실행하세요! 🚀

## 방법 1: 터미널에서 직접 실행 (가장 빠름)

**터미널을 열고 아래 명령어를 복사해서 실행하세요:**

```bash
cd /Users/iyunsang/rutcursor
./run_fix.sh
```

---

## 방법 2: 단계별 실행

만약 위 명령어가 안 되면, 아래를 하나씩 실행하세요:

### 1단계: 파일 업로드
```bash
scp -i ~/Desktop/tour-stream-api-key.pem ecosystem.config.cjs ubuntu@43.201.66.181:/var/www/api/
```

### 2단계: 서버 접속 후 PM2 재시작
```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181
```

**서버에 접속되면:**
```bash
cd /var/www/api
pm2 delete tourstream-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
curl http://localhost:3002/
pm2 status
exit
```

---

## 확인

실행 후 아래 명령어로 확인하세요:

```bash
curl http://43.201.66.181:3002/
```

**예상 결과:**
```json
{
  "message": "TourStream API Server",
  "version": "1.0.0",
  ...
}
```

---

## 문제 해결

### "Permission denied" 오류가 나면:

```bash
chmod 400 ~/Desktop/tour-stream-api-key.pem
```

### "Connection refused" 오류가 나면:

AWS 콘솔에서 보안 그룹에 포트 22 (SSH)가 열려있는지 확인하세요.
