# 서버 파일 상태

## ✅ 이미 서버에 업로드된 파일들

### 1. `/var/www/api/package.json`
- Express, CORS 의존성 포함
- `"type": "module"` 설정 (ES Module 사용)

### 2. `/var/www/api/src/index.js`
- API 서버 메인 파일
- 모든 엔드포인트 구현 완료

### 3. `/var/www/api/.env`
```
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
```

### 4. `/var/www/api/node_modules/`
- 의존성 설치 완료 (70개 패키지)

### 5. `/var/www/api/data/production/`
- 상품 데이터 저장 디렉토리

---

## ⚠️ 수정이 필요한 파일

### `/var/www/api/ecosystem.config.js` → `/var/www/api/ecosystem.config.cjs`

**현재 상태:**
- `ecosystem.config.js` 파일이 있지만 PM2가 인식하지 못함
- ES Module로 인식되어 오류 발생

**필요한 작업:**
- `ecosystem.config.cjs` 파일로 교체
- PM2 재시작

---

## 📁 로컬 파일 위치

### `/Users/iyunsang/rutcursor/ecosystem.config.cjs`
- 서버로 업로드할 PM2 설정 파일
- CommonJS 형식으로 작성됨

### `/Users/iyunsang/rutcursor/run_fix.sh`
- 자동 업로드 및 PM2 재시작 스크립트

---

## 🔄 업로드 명령어

```bash
# ecosystem.config.cjs 업로드
scp -i ~/Desktop/tour-stream-api-key.pem \
  ecosystem.config.cjs \
  ubuntu@43.201.66.181:/var/www/api/
```
