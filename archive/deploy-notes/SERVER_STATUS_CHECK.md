# 서버 상태 확인 가이드

## 🔍 서버 터미널에서 확인

### 서버 터미널에 접속되어 있다면

**아래 명령어를 하나씩 실행해서 결과를 알려주세요:**

```bash
# 1. 기본 정보 확인
hostname
whoami
pwd

# 2. Node.js 설치 확인
node --version

# 3. PM2 설치 확인
pm2 --version

# 4. Nginx 설치 확인
nginx -v

# 5. API 디렉토리 확인
ls -la /var/www/api

# 6. PM2 프로세스 확인
pm2 list
```

---

## 📋 예상 결과

### 아직 설정 안 된 경우:
- Node.js: `command not found` 또는 `미설치`
- PM2: `command not found` 또는 `미설치`
- Nginx: `command not found` 또는 `미설치`
- API 디렉토리: `No such file or directory`

### 설정 완료된 경우:
- Node.js: `v18.x.x` 또는 `v20.x.x`
- PM2: `5.x.x`
- Nginx: `nginx version: nginx/1.x.x`
- API 디렉토리: 파일 목록이 보임
- PM2: `tourstream-api` 프로세스가 실행 중

---

## 🚀 다음 단계

**결과를 알려주시면:**
- 아직 설정 안 됨 → `COMPLETE_API_SETUP.sh` 실행 안내
- 설정 완료됨 → 서버 테스트 및 확인

**서버 터미널에서 위 명령어들을 실행하고 결과를 알려주세요!**
