# AWS 배포 가이드

## 🎯 배포 구조

### 현재 구성
- **메인 앱** (프론트엔드): React 앱
- **어드민 앱** (프론트엔드): React 앱
- **API 서버** (백엔드): Node.js/Express

---

## 📦 AWS 배포 옵션

### 옵션 1: 완전 분리 배포 (권장)

#### 메인 앱
- **S3 + CloudFront**: 정적 웹사이트 호스팅
- **비용**: 월 $1-5 (트래픽에 따라)
- **장점**: 빠른 속도, CDN, 자동 스케일링

#### 어드민 앱
- **S3 + CloudFront**: 정적 웹사이트 호스팅
- **비용**: 월 $1-5
- **장점**: 메인과 동일한 구조

#### API 서버
- **EC2**: 서버 인스턴스
- **비용**: 월 $5-20 (인스턴스 크기에 따라)
- **장점**: 완전한 제어, 데이터 저장 가능

**총 비용**: 월 $7-30

---

### 옵션 2: 통합 배포 (비용 절감)

#### 메인 + 어드민
- **S3 + CloudFront**: 하나의 S3 버킷에 두 앱 배포
- **비용**: 월 $1-5

#### API 서버
- **EC2**: 서버 인스턴스
- **비용**: 월 $5-20

**총 비용**: 월 $6-25

---

### 옵션 3: 서버리스 (고급)

#### 메인 + 어드민
- **S3 + CloudFront**: 정적 호스팅

#### API 서버
- **Lambda + API Gateway**: 서버리스
- **비용**: 사용량 기반 (월 $0-10)
- **장점**: 자동 스케일링, 사용한 만큼만 비용

**총 비용**: 월 $1-15 (트래픽이 적을 때)

---

## 🏗️ 권장 아키텍처

### 구성 1: 표준 배포 (권장)

```
┌─────────────────────────────────────┐
│  CloudFront (CDN)                   │
│  - 메인: tourstream.kr              │
│  - 어드민: admin.tourstream.kr      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  S3 Buckets                         │
│  - tourstream-main-bucket          │
│  - tourstream-admin-bucket          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  EC2 Instance (API Server)          │
│  - t3.micro 또는 t3.small           │
│  - api.tourstream.kr                │
│  - PM2로 프로세스 관리               │
└─────────────────────────────────────┘
```

### 구성 2: 비용 최적화

```
┌─────────────────────────────────────┐
│  CloudFront (CDN)                   │
│  - tourstream.kr                    │
│  - admin.tourstream.kr              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  S3 Bucket (단일)                    │
│  - /main/ (메인 앱)                 │
│  - /admin/ (어드민 앱)               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  EC2 Instance (API Server)           │
│  - t3.micro (최소 사양)              │
└─────────────────────────────────────┘
```

---

## 💰 비용 분석

### 옵션 1: 완전 분리 (권장)
- S3 (메인): $0.023/GB 저장 + $0.09/GB 전송
- S3 (어드민): $0.023/GB 저장 + $0.09/GB 전송
- CloudFront: $0.085/GB (첫 10TB)
- EC2 (t3.small): $0.0208/시간 = 약 $15/월
- **총: 월 $15-25**

### 옵션 2: 통합 배포
- S3 (단일): $0.023/GB 저장 + $0.09/GB 전송
- CloudFront: $0.085/GB
- EC2 (t3.micro): $0.0104/시간 = 약 $7.5/월
- **총: 월 $8-15**

### 옵션 3: 서버리스
- S3 + CloudFront: $1-5
- Lambda: $0.20/100만 요청
- API Gateway: $3.50/100만 요청
- **총: 월 $5-15** (트래픽 적을 때)

---

## 🚀 배포 단계별 가이드

### 1단계: S3 버킷 생성

#### 메인 앱 버킷
```bash
# AWS CLI로 생성
aws s3 mb s3://tourstream-main --region ap-northeast-2
aws s3 website s3://tourstream-main --index-document index.html --error-document index.html
```

#### 어드민 앱 버킷
```bash
aws s3 mb s3://tourstream-admin --region ap-northeast-2
aws s3 website s3://tourstream-admin --index-document index.html --error-document index.html
```

### 2단계: CloudFront 배포

#### 메인 앱 CloudFront
- Origin: `tourstream-main.s3.amazonaws.com`
- Domain: `tourstream.kr`
- SSL 인증서: ACM에서 발급

#### 어드민 앱 CloudFront
- Origin: `tourstream-admin.s3.amazonaws.com`
- Domain: `admin.tourstream.kr`
- SSL 인증서: ACM에서 발급

### 3단계: EC2 인스턴스 설정

#### 인스턴스 생성
- 타입: t3.micro 또는 t3.small
- OS: Ubuntu 22.04 LTS
- 보안 그룹: HTTP(80), HTTPS(443), SSH(22)

#### 서버 설정
```bash
# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치
sudo npm install -g pm2

# Nginx 설치
sudo apt install nginx

# API 서버 배포
cd /var/www/api
git clone [repository]
npm install --production
pm2 start src/index.js --name tourstream-api
pm2 save
pm2 startup
```

#### Nginx 설정
```nginx
server {
    listen 80;
    server_name api.tourstream.kr;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔄 배포 프로세스

### 메인/어드민 배포 (S3 + CloudFront)

```bash
# 1. 빌드
npm run main:build
npm run admin:build

# 2. S3에 업로드
aws s3 sync packages/main/build/ s3://tourstream-main/ --delete
aws s3 sync packages/admin/build/ s3://tourstream-admin/ --delete

# 3. CloudFront 캐시 무효화
aws cloudfront create-invalidation --distribution-id [DIST_ID] --paths "/*"
```

### API 서버 배포 (EC2)

```bash
# 1. 서버에 접속
ssh ubuntu@api.tourstream.kr

# 2. 코드 업데이트
cd /var/www/api
git pull origin main

# 3. 의존성 설치
npm install --production

# 4. 서버 재시작
pm2 restart tourstream-api
```

---

## 🛡️ 보안 설정

### 1. S3 버킷 정책
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tourstream-main/*"
    }
  ]
}
```

### 2. EC2 보안 그룹
- HTTP (80): CloudFront만 허용
- HTTPS (443): CloudFront만 허용
- SSH (22): 본인 IP만 허용

### 3. 환경 변수 보호
- EC2에서 `.env` 파일 사용
- Secrets Manager 사용 (선택사항)

---

## 📊 모니터링

### CloudWatch
- S3 버킷 접근 로그
- EC2 인스턴스 모니터링
- API 서버 로그

### 알람 설정
- EC2 CPU 사용률 > 80%
- API 서버 에러율 > 5%
- S3 버킷 용량 > 80%

---

## 💡 비용 절감 팁

### 1. 예약 인스턴스
- EC2 1년 예약: 40% 할인
- 월 $15 → $9

### 2. S3 Intelligent-Tiering
- 자동으로 비용 최적화
- 거의 사용하지 않는 데이터는 자동으로 저렴한 스토리지로 이동

### 3. CloudFront 캐싱
- 정적 파일 캐싱으로 S3 전송 비용 절감
- 캐시 TTL 최적화

### 4. EC2 인스턴스 크기 조정
- 초기: t3.micro (월 $7.5)
- 트래픽 증가 시: t3.small (월 $15)

---

## 🔄 베타/라이브 분리

### 방법 1: 별도 인프라 (완전 분리)
- 베타: 별도 S3 버킷 + CloudFront + EC2
- 라이브: 별도 S3 버킷 + CloudFront + EC2
- **비용**: 2배

### 방법 2: 경로 분리 (비용 절감)
- 베타: `beta.tourstream.kr` → `tourstream-main-beta` S3
- 라이브: `tourstream.kr` → `tourstream-main` S3
- API: 같은 EC2, 다른 데이터 디렉토리
- **비용**: 1.5배

### 방법 3: 단일 인프라 (최소 비용)
- 베타: `beta.tourstream.kr` → 같은 S3, 다른 경로
- 라이브: `tourstream.kr` → 같은 S3
- API: 같은 EC2, 환경 변수로 분리
- **비용**: 1배

---

## 📋 체크리스트

### AWS 계정 설정
- [ ] AWS 계정 생성
- [ ] IAM 사용자 생성 (프로그래밍 접근)
- [ ] AWS CLI 설정
- [ ] 도메인 등록 (Route 53 또는 외부)

### S3 설정
- [ ] 메인 앱 버킷 생성
- [ ] 어드민 앱 버킷 생성
- [ ] 버킷 정책 설정
- [ ] 정적 웹사이트 호스팅 활성화

### CloudFront 설정
- [ ] 메인 앱 CloudFront 배포 생성
- [ ] 어드민 앱 CloudFront 배포 생성
- [ ] SSL 인증서 발급 (ACM)
- [ ] 도메인 연결

### EC2 설정
- [ ] EC2 인스턴스 생성
- [ ] 보안 그룹 설정
- [ ] Node.js 설치
- [ ] PM2 설치
- [ ] Nginx 설정
- [ ] SSL 인증서 설정 (Let's Encrypt)

### 배포 자동화
- [ ] 배포 스크립트 작성
- [ ] CI/CD 파이프라인 설정 (선택사항)

---

## 🆘 문제 해결

### 문제: S3 업로드 실패
```bash
# 권한 확인
aws s3 ls s3://tourstream-main

# IAM 권한 확인
aws iam get-user
```

### 문제: CloudFront 캐시 문제
```bash
# 캐시 무효화
aws cloudfront create-invalidation --distribution-id [ID] --paths "/*"
```

### 문제: EC2 서버 접속 불가
```bash
# 보안 그룹 확인
# SSH 키 확인
# 인스턴스 상태 확인
```

---

## 📚 참고 자료

- [AWS S3 정적 웹사이트 호스팅](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [AWS CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [AWS EC2](https://docs.aws.amazon.com/ec2/)
- [PM2 문서](https://pm2.keymetrics.io/)
