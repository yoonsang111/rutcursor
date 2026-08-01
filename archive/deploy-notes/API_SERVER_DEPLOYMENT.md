# API 서버 배포 가이드

## ✅ 준비 완료

### 현재 상태
- ✅ EC2 인스턴스 실행 중
- ✅ 퍼블릭 IP: `13.209.15.252`
- ✅ 퍼블릭 DNS: `ec2-13-209-15-252.ap-northeast-2.compute.amazonaws.com`

---

## 📋 배포 단계

### 1단계: SSH 키 확인

**SSH 키 파일이 필요합니다.**

**확인 방법:**
```bash
# Mac에서 확인
ls -la ~/.ssh/
ls -la ~/Downloads/*.pem
```

**키 파일이 있으면:**
- 파일 위치: `_________________`
- 파일명: `_________________`

**키 파일이 없으면:**
- EC2 콘솔에서 키 페어 확인 필요
- 또는 새로 생성 필요

---

### 2단계: 보안 그룹 확인

**EC2 콘솔에서:**
1. 인스턴스 선택
2. "보안" 탭 클릭
3. 보안 그룹 이름 클릭
4. 인바운드 규칙 확인

**필요한 포트:**
- SSH (22): 본인 IP만 허용
- HTTP (80): 모든 IP (Let's Encrypt용)
- HTTPS (443): 모든 IP
- API 포트 (3002): localhost만 (Nginx를 통해서만)

---

### 3단계: SSH 접속 테스트

**접속 명령어:**
```bash
ssh -i [키파일경로] ubuntu@13.209.15.252
```

**또는:**
```bash
ssh -i [키파일경로] ubuntu@ec2-13-209-15-252.ap-northeast-2.compute.amazonaws.com
```

**접속되면:**
- 서버에 접속된 것입니다
- 다음 단계로 진행 가능

---

### 4단계: 서버 초기 설정

**접속 후 실행할 명령어들:**

```bash
# 1. 시스템 업데이트
sudo apt update
sudo apt upgrade -y

# 2. Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. PM2 설치
sudo npm install -g pm2

# 4. Nginx 설치
sudo apt install nginx -y
```

---

### 5단계: 코드 배포

**방법 1: Git 사용 (권장)**
```bash
# 디렉토리 생성
sudo mkdir -p /var/www/api
cd /var/www/api

# Git에서 클론
git clone [repository-url] .

# 또는 직접 파일 업로드
```

**방법 2: 파일 업로드**
```bash
# 로컬에서 실행
scp -i [키파일] -r packages/server/* ubuntu@13.209.15.252:/var/www/api/
```

---

### 6단계: 환경 변수 설정

```bash
cd /var/www/api
sudo nano .env
```

**내용:**
```bash
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
```

---

### 7단계: PM2로 서버 시작

```bash
cd /var/www/api
npm install --production
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🆘 도움이 필요하면

**각 단계에서 막히면:**
- 에러 메시지를 알려주세요
- 스크린샷을 공유해주세요
- "이 단계가 어려워요"라고 말씀해주세요

**차근차근 함께 진행하겠습니다!** 🚀

---

## 📝 체크리스트

배포 전:
- [ ] SSH 키 파일 확인
- [ ] 보안 그룹 설정 확인
- [ ] SSH 접속 테스트

배포 중:
- [ ] 서버 초기 설정
- [ ] 코드 배포
- [ ] 환경 변수 설정
- [ ] PM2로 서버 시작

배포 후:
- [ ] 서버 정상 작동 확인
- [ ] Nginx 설정
- [ ] SSL 인증서 발급
