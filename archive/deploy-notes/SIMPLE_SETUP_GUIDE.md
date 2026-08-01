# 간단한 서버 설정 가이드

## 🎯 문제 해결 방법

**스크립트 복사-붙여넣기가 실패하는 이유:**
- 긴 heredoc 구문이 터미널에서 제대로 처리되지 않음
- 특수 문자나 줄바꿈 문제

**해결책: 파일 업로드 방식 사용**

---

## ✅ 방법 1: 자동 스크립트 실행 (추천)

**로컬 터미널에서:**

```bash
cd /Users/iyunsang/rutcursor
chmod +x UPLOAD_AND_SETUP.sh
./UPLOAD_AND_SETUP.sh
```

**이 스크립트가 모든 작업을 자동으로 수행합니다!**

---

## ✅ 방법 2: 수동으로 단계별 실행

### 1단계: 디렉토리 생성

```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181 "sudo mkdir -p /var/www/api/src /var/www/api/data/production /var/www/api/logs && sudo chown -R ubuntu:ubuntu /var/www/api"
```

### 2단계: package.json 업로드

```bash
scp -i ~/Desktop/tour-stream-api-key.pem packages/server/package.json ubuntu@43.201.66.181:/var/www/api/
```

### 3단계: index.js 업로드

```bash
scp -i ~/Desktop/tour-stream-api-key.pem packages/server/src/index.js ubuntu@43.201.66.181:/var/www/api/src/
```

### 4단계: .env 파일 생성

```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181 "cd /var/www/api && echo 'NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production' > .env"
```

### 5단계: ecosystem.config.js 생성

**이 파일은 복잡하므로 별도 파일로 만들어서 업로드하거나, 서버에서 직접 편집하세요.**

### 6단계: 의존성 설치 및 서버 시작

**서버 터미널에서:**

```bash
cd /var/www/api
npm install --production
pm2 delete tourstream-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
curl http://localhost:3002/
```

---

## 🎯 가장 간단한 방법

**1. 로컬에서 `UPLOAD_AND_SETUP.sh` 실행**

**2. 완료!**

---

## 📋 확인 사항

**서버가 실행 중인지 확인:**

```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181 "pm2 status"
```

**서버 테스트:**

```bash
curl http://43.201.66.181:3002/
```

---

## ⚠️ 주의사항

- `http://43.201.66.181/` (포트 없음)는 작동하지 않습니다
- `http://43.201.66.181:3002/` (포트 3002)로 접속해야 합니다
- 보안 그룹에서 포트 3002가 열려있어야 합니다
