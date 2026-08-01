# Session Manager로 서버 접속하기 (키 파일 없이)

## 🎯 왜 Session Manager를 사용하나요?

**문제:**
- 키 페어 파일(`tour-pem-key.pem`)을 찾을 수 없음
- 키 파일 없이는 일반 SSH 접속 불가

**해결책:**
- AWS Session Manager 사용
- 키 파일 불필요
- 더 안전함 (포트 22 열 필요 없음)

---

## ✅ 준비 사항

### 1. AWS CLI 설치 확인

터미널에서 확인:
```bash
aws --version
```

**결과:**
- 버전이 나오면 → ✅ 설치됨
- "command not found" → ❌ 설치 필요

**설치 방법 (macOS):**
```bash
brew install awscli
```

### 2. AWS CLI 설정 확인

```bash
aws configure list
```

**확인할 것:**
- Access Key ID가 설정되어 있는지
- Region이 설정되어 있는지

**설정이 안 되어 있으면:**
```bash
aws configure
```

### 3. SSM 플러그인 설치

```bash
# macOS
brew install --cask session-manager-plugin

# 또는 수동 설치
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac_arm64/session-manager-plugin.pkg" -o "session-manager-plugin.pkg"
sudo installer -pkg session-manager-plugin.pkg -target /
```

---

## 🚀 접속 방법

### 방법 1: AWS CLI로 직접 접속

```bash
aws ssm start-session --target i-0157298d8bd0aa708
```

**인스턴스 ID**: `i-0157298d8bd0aa708`

### 방법 2: EC2 Instance Connect 사용

**EC2 콘솔에서:**
1. 인스턴스 선택
2. "연결" 버튼 클릭
3. "Session Manager" 탭 선택
4. "연결" 클릭

**브라우저에서 바로 접속됩니다!**

---

## ⚠️ 주의사항

### IAM 권한 필요

인스턴스에 `codedeploy-role`이 설정되어 있지만, Session Manager 권한이 필요할 수 있습니다.

**권한 확인:**
- EC2 콘솔 → 인스턴스 → 보안 탭
- IAM 역할: `codedeploy-role`
- 이 역할에 SSM 권한이 있는지 확인 필요

**권한이 없으면:**
- IAM 콘솔에서 역할에 권한 추가
- 또는 EC2 Instance Connect 사용 (더 간단)

---

## 🎯 추천 방법

### 가장 간단한 방법: EC2 Instance Connect

1. **EC2 콘솔 접속**
2. **인스턴스 선택** (`tour_stream`)
3. **"연결" 버튼 클릭**
4. **"EC2 Instance Connect" 탭 선택**
5. **"연결" 클릭**

**장점:**
- 브라우저에서 바로 접속
- 추가 설정 불필요
- 키 파일 불필요

---

## 📋 다음 단계

### 옵션 A: EC2 Instance Connect 사용 (권장)

1. EC2 콘솔에서 "연결" 버튼 클릭
2. EC2 Instance Connect 탭 선택
3. 연결 클릭
4. 브라우저에서 터미널 열림

### 옵션 B: AWS CLI + Session Manager

1. AWS CLI 설치 확인
2. SSM 플러그인 설치
3. `aws ssm start-session --target i-0157298d8bd0aa708` 실행

---

## 🆘 문제 해결

**"권한이 없습니다" 오류:**
- IAM 역할에 SSM 권한 추가 필요
- 또는 EC2 Instance Connect 사용

**"플러그인을 찾을 수 없습니다" 오류:**
- SSM 플러그인 설치 필요
- 또는 EC2 Instance Connect 사용 (플러그인 불필요)

---

## ✅ 체크리스트

접속 전:
- [ ] EC2 콘솔 접속 가능
- [ ] 인스턴스가 실행 중인지 확인

접속 시도:
- [ ] EC2 Instance Connect 사용 (가장 간단)
- [ ] 또는 AWS CLI + Session Manager

접속 후:
- [ ] 서버에 접속되었는지 확인
- [ ] 다음 단계: Node.js 설치

---

## 🚀 지금 바로 시도해보세요!

**가장 간단한 방법:**
1. EC2 콘솔 → 인스턴스 `tour_stream` 선택
2. 상단의 **"연결"** 버튼 클릭
3. **"EC2 Instance Connect"** 탭 선택
4. **"연결"** 클릭

접속이 되면 알려주세요! 다음 단계를 안내하겠습니다. 🎉
