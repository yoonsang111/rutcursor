# SSH 접속 및 API 서버 설정 - 수동 가이드

## 📋 정보 확인

- **퍼블릭 IP**: `43.201.66.181` ✅
- **키 파일**: `~/Desktop/tour-stream-api-key.pem` ✅

---

## 🔐 1단계: 로컬 터미널에서 SSH 접속

### 터미널 열기

**macOS 터미널에서 실행:**

```bash
# 키 파일 권한 설정
chmod 400 ~/Desktop/tour-stream-api-key.pem

# SSH 접속
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181
```

**성공하면:**
- 서버 터미널이 열립니다
- `ubuntu@ip-xxx-xxx-xxx-xxx:~$` 프롬프트가 보입니다

---

## 🚀 2단계: 서버 터미널에서 API 서버 설정

### 서버 터미널에 붙여넣기

**`PASTE_TO_SERVER_FINAL.sh` 파일의 전체 내용을 복사해서 서버 터미널에 붙여넣으세요!**

---

## 📝 3단계: src/index.js 파일 생성

**서버 터미널에서:**

```bash
cd /var/www/api
nano src/index.js
```

**그 다음 `CREATE_INDEX_JS.txt` 파일의 전체 내용을 복사해서 붙여넣으세요!**

**저장:**
- `Ctrl + X`
- `Y`
- `Enter`

---

## 🎯 4단계: 서버 시작

**서버 터미널에서:**

```bash
cd /var/www/api
pm2 start ecosystem.config.js
pm2 save
pm2 startup
pm2 status
```

---

## ✅ 완료 확인

**서버 테스트:**

```bash
curl http://localhost:3002/
```

**성공하면 JSON 응답이 보입니다!**

---

## 💡 문제 해결

### SSH 접속 실패 시

1. **보안 그룹 확인**
   - SSH (22) 포트가 열려있는지 확인
   - "내 IP" 또는 "0.0.0.0/0" 허용

2. **인스턴스 상태 확인**
   - 상태가 "실행 중"인지 확인

3. **키 파일 권한 확인**
   ```bash
   ls -la ~/Desktop/tour-stream-api-key.pem
   # 결과: -r-------- (400 권한)
   ```

---

## 🎉 다음 단계

API 서버 설정이 완료되면:
1. Elastic IP 할당 (선택사항)
2. Route 53에 `api.tourstream.kr` 도메인 연결
3. Nginx 설정 (HTTPS)

준비되면 알려주세요! 🚀
