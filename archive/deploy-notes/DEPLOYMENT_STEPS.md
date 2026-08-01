# 배포 단계별 가이드

## 📋 배포 순서

### 1단계: 환경 변수 설정 ✅
- [x] 빌드 스크립트에 환경별 빌드 명령 추가
- [ ] 실제 배포 시 환경 변수 확인

### 2단계: API 서버 배포
- [ ] EC2 인스턴스 준비
- [ ] Node.js 설치
- [ ] 코드 배포
- [ ] 환경 변수 설정
- [ ] PM2 설정
- [ ] Nginx 설정
- [ ] SSL 인증서 발급
- [ ] DNS 설정 (api.tourstream.kr)

### 3단계: 어드민 앱 배포 (옵션 선택)
- [ ] 옵션 1: IP 기반 접근 (EC2 직접 배포)
- [ ] 옵션 2: 서브도메인 (S3 + CloudFront)

### 4단계: 메인 앱 업데이트
- [ ] 환경 변수 포함 빌드
- [ ] S3 업로드
- [ ] CloudFront 캐시 무효화

---

## 🚀 빠른 시작 명령어

### 빌드
```bash
# 메인 앱 (프로덕션)
cd packages/main
npm run build:production

# 어드민 앱 (프로덕션)
cd packages/admin
npm run build:production

# API 서버는 빌드 불필요 (Node.js 직접 실행)
```

### 배포 전 테스트
```bash
# 로컬에서 프로덕션 빌드 테스트
cd packages/main
REACT_APP_API_URL=https://api.tourstream.kr/api npm run build
npx serve -s build -l 3000
```
