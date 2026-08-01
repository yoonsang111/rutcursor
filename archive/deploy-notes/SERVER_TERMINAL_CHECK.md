# 서버 터미널 확인

## ⚠️ 현재 상황

**터미널 출력을 보니:**
- `hostname: MacBook-Air.local` → 로컬 MacBook-Air
- `whoami: iyunsang` → 로컬 사용자

**이것은 서버가 아니라 로컬 컴퓨터입니다!**

---

## 🔍 서버 터미널 확인 방법

### 서버 터미널인지 확인

**서버 터미널이면:**
- 프롬프트가 `ubuntu@ip-xxx-xxx-xxx-xxx:~$` 형식
- 또는 `ubuntu@ip-172-31-xxx-xxx:~$` 형식
- `hostname` 결과가 `ip-xxx-xxx-xxx-xxx` 형식

**로컬 터미널이면:**
- 프롬프트가 `iyunsang@MacBook-Air rutcursor %`
- `hostname` 결과가 `MacBook-Air.local`

---

## 🚀 서버 터미널 접속

### SSH 접속 다시 하기

**새 터미널 창에서:**

```bash
ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181
```

**성공하면:**
- 프롬프트가 `ubuntu@ip-xxx-xxx-xxx-xxx:~$`로 변경됨
- 이제 서버 터미널입니다!

---

## 📋 서버 터미널에서 확인

**서버 터미널에 접속한 후:**

```bash
# 서버 정보 확인
hostname
whoami

# Node.js 확인
node --version

# PM2 확인
pm2 --version

# Nginx 확인
nginx -v

# API 디렉토리 확인
ls -la /var/www/api
```

---

## 💡 확인 방법

**서버 터미널인지 확인:**
- 프롬프트에 `ubuntu@`가 보이나요?
- `hostname` 결과가 `ip-`로 시작하나요?

**아니라면:**
- SSH 접속을 다시 해야 합니다
- 새 터미널 창에서 SSH 접속 명령어 실행

---

## 🎯 다음 단계

1. **새 터미널 창 열기**
2. **SSH 접속:**
   ```bash
   ssh -i ~/Desktop/tour-stream-api-key.pem ubuntu@43.201.66.181
   ```
3. **서버 터미널에서 확인 명령어 실행**

준비되면 알려주세요! 🚀
