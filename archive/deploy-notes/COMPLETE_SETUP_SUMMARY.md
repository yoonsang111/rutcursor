# API 서버 설정 완료 가이드

## 📋 현재 상태

- ✅ 서버 디렉토리 생성 완료
- ✅ package.json 업로드 완료
- ✅ index.js 업로드 완료
- ✅ .env 파일 생성 완료
- ✅ 의존성 설치 완료
- ⚠️ PM2 설정 파일 수정 필요 (ecosystem.config.js → ecosystem.config.cjs)

---

## 🔧 남은 작업: PM2 설정 파일 수정

### 문제
`package.json`에 `"type": "module"`이 있어서 `ecosystem.config.js`가 ES Module로 인식됩니다.
PM2는 CommonJS 형식의 설정 파일이 필요하므로 `.cjs` 확장자를 사용해야 합니다.

### 해결 방법

#### 방법 1: 자동 스크립트 실행 (추천)

**로컬 터미널에서:**

```bash
cd /Users/iyunsang/rutcursor
chmod +x run_fix.sh
./run_fix.sh
```

#### 방법 2: 수동 실행

**1단계: 파일 업로드**

```bash
scp -i ~/Desktop/tour-stream-api-key.pem ecosystem.config.cjs ubuntu@43.201.66.181:/var/www/api/
```

**2단계: 서버에서 PM2 재시작**

**서버 터미널에서 (SSH 연결 후):**

```bash
cd /var/www/api
pm2 delete tourstream-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
curl http://localhost:3002/
pm2 status
```

---

## 📁 생성된 파일들

### 1. ecosystem.config.cjs
PM2 설정 파일 (CommonJS 형식)
- 위치: `/Users/iyunsang/rutcursor/ecosystem.config.cjs`
- 서버 위치: `/var/www/api/ecosystem.config.cjs`

### 2. run_fix.sh
PM2 설정 수정 자동화 스크립트
- 위치: `/Users/iyunsang/rutcursor/run_fix.sh`
- 실행: `./run_fix.sh`

### 3. UPLOAD_AND_SETUP.sh
전체 서버 설정 자동화 스크립트 (이미 실행됨)
- 위치: `/Users/iyunsang/rutcursor/UPLOAD_AND_SETUP.sh`

### 4. FIX_PM2_CONFIG.sh
PM2 설정 수정 스크립트 (대안)
- 위치: `/Users/iyunsang/rutcursor/FIX_PM2_CONFIG.sh`

---

## 🚀 서버 접속 정보

- **서버 IP**: 43.201.66.181
- **SSH 키**: `~/Desktop/tour-stream-api-key.pem`
- **서버 사용자**: ubuntu
- **API 서버 포트**: 3002
- **서버 접속 URL**: `http://43.201.66.181:3002/`

---

## ✅ 완료 후 확인 사항

### 1. 서버가 실행 중인지 확인

```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181 "pm2 status"
```

**예상 결과:**
```
┌─────┬──────────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ status  │ restart │ uptime   │
├─────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0   │ tourstream-api   │ online  │ 0       │ 1m       │
└─────┴──────────────────┴─────────┴─────────┴──────────┘
```

### 2. API 서버 테스트

**로컬에서:**
```bash
curl http://43.201.66.181:3002/
```

**예상 결과:**
```json
{
  "message": "TourStream API Server",
  "version": "1.0.0",
  "endpoints": {
    "products": "/api/products",
    "categories": "/api/categories",
    "locations": "/api/locations",
    "counter": "/api/counter"
  }
}
```

### 3. 브라우저에서 확인

```
http://43.201.66.181:3002/
```

---

## 📝 주요 명령어 모음

### 서버 접속
```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181
```

### PM2 관리
```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs tourstream-api

# 재시작
pm2 restart tourstream-api

# 중지
pm2 stop tourstream-api

# 시작
pm2 start tourstream-api
```

### 서버 파일 확인
```bash
# 디렉토리 구조 확인
ls -la /var/www/api/

# 설정 파일 확인
cat /var/www/api/.env
cat /var/www/api/ecosystem.config.cjs
```

---

## ⚠️ 주의사항

1. **포트 접속**
   - `http://43.201.66.181/` (포트 없음)는 작동하지 않습니다
   - `http://43.201.66.181:3002/` (포트 3002)로 접속해야 합니다

2. **보안 그룹**
   - AWS 보안 그룹에서 포트 3002가 열려있어야 합니다
   - 포트 80/443으로 접속하려면 Nginx 프록시 설정이 필요합니다

3. **파일 형식**
   - `ecosystem.config.js`가 아닌 `ecosystem.config.cjs`를 사용해야 합니다
   - `package.json`에 `"type": "module"`이 있어서 CommonJS 형식이 필요합니다

---

## 🔄 다음 단계

1. ✅ PM2 설정 파일 수정 (현재 단계)
2. ⏭️ Nginx 프록시 설정 (선택사항)
3. ⏭️ 도메인 연결 (api.tourstream.kr)
4. ⏭️ HTTPS 설정 (SSL 인증서)

---

## 📞 문제 해결

### PM2가 시작되지 않는 경우

```bash
# 서버에서
cd /var/www/api
pm2 logs tourstream-api  # 에러 로그 확인
cat ecosystem.config.cjs  # 설정 파일 확인
node src/index.js  # 직접 실행해서 오류 확인
```

### 서버에 접속이 안 되는 경우

```bash
# 보안 그룹 확인
# AWS 콘솔에서 포트 3002가 열려있는지 확인

# 서버 상태 확인
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181 "pm2 status"
```

---

**작성일**: 2026-02-20
**서버 IP**: 43.201.66.181
