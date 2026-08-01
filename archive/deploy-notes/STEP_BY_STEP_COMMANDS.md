# 서버에서 실행할 명령어 - 단계별

## 🎯 서버 터미널에서 하나씩 실행하세요

### 1단계: 시스템 업데이트

```bash
sudo apt update
```

**실행 후:** "완료" 또는 결과를 알려주세요

---

### 2단계: Node.js 설치

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

**예상 결과:** `v18.x.x`

---

### 3단계: PM2 설치

```bash
sudo npm install -g pm2
pm2 --version
```

**예상 결과:** `5.x.x`

---

### 4단계: Nginx 설치

```bash
sudo apt install nginx -y
sudo systemctl status nginx
```

**실행 후:** `q` 키를 눌러서 나오기

---

### 5단계: 디렉토리 생성

```bash
sudo mkdir -p /var/www/api
sudo mkdir -p /var/www/api/data/production
sudo mkdir -p /var/www/api/logs
sudo chown -R ubuntu:ubuntu /var/www/api
cd /var/www/api
```

---

### 6단계: 코드 파일 만들기

**package.json 파일 생성:**

```bash
nano package.json
```

**내용 (복사해서 붙여넣기):**
```json
{
  "name": "@tourstream/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

**저장:** `Ctrl + X`, `Y`, `Enter`

---

### 7단계: src 디렉토리 생성

```bash
mkdir -p src
```

---

### 8단계: index.js 파일 생성

**이 파일은 길기 때문에 다음 단계에서 안내하겠습니다.**

---

## 🚀 지금 시작하세요!

**1단계부터 차근차근 실행하고, 각 단계마다 결과를 알려주세요:**

1. `sudo apt update` 실행
2. 결과 알려주기
3. 다음 단계 안내

**또는 모든 명령어를 한 번에 실행할 수도 있습니다!**

어떤 방법을 선호하시나요?
- 하나씩 실행 (안전)
- 한 번에 실행 (빠름)
