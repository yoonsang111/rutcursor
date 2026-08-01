# 빠른 수정 가이드

## ⚠️ 문제

`src/index.js: No such file or directory` 오류 발생

---

## 🔧 해결 방법

### 1단계: SSH 재접속

**로컬 터미널에서:**

```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181
```

### 2단계: 서버 상태 확인

**서버 터미널에서:**

```bash
cd /var/www/api
ls -la
ls -la src/ 2>/dev/null || echo "src 디렉토리 없음"
```

### 3단계: 파일 생성

**서버 터미널에서 `FIX_MISSING_INDEX_JS.sh` 파일의 전체 내용을 복사해서 붙여넣으세요!**

이 스크립트는:
- src 디렉토리 생성
- src/index.js 파일 생성
- PM2 재시작

---

## 📋 또는 수동으로 생성

**서버 터미널에서:**

```bash
cd /var/www/api
mkdir -p src
nano src/index.js
```

**그 다음 `CREATE_INDEX_JS.txt` 파일의 전체 내용을 붙여넣으세요!**

**저장:** `Ctrl + X`, `Y`, `Enter`

**PM2 재시작:**

```bash
pm2 delete tourstream-api
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

---

## ✅ 확인

**서버 테스트:**

```bash
curl http://localhost:3002/
```

**성공하면 JSON 응답이 보입니다!**
