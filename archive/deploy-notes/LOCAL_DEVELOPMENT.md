# 로컬 개발 및 라이브 배포 가이드

## 🎯 목표
- 로컬에서 테스트 상품 등록 및 테스트
- 라이브 서버에는 테스트 상품이 올라가지 않도록 분리
- 베타 서버 없이 로컬 → 라이브 직접 배포

---

## 📁 데이터 분리 전략

### 구조
```
로컬 개발 환경
├── packages/server/data/local/     (로컬 테스트 데이터)
│   ├── products.json
│   └── counter.json
└── .env.local                      (로컬 환경 변수)

라이브 서버
├── packages/server/data/production/ (라이브 운영 데이터)
│   ├── products.json
│   └── counter.json
└── .env.production                 (라이브 환경 변수)
```

---

## 🔧 설정 방법

### 1. 로컬 개발 환경 설정

#### 1-1. 로컬 환경 변수 파일 생성
`packages/server/.env.local`:
```env
NODE_ENV=development
PORT=3002
DATA_DIR=./data/local
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

#### 1-2. 프론트엔드 로컬 환경 변수
`packages/main/.env.local`:
```env
REACT_APP_API_URL=http://localhost:3002/api
REACT_APP_ENV=development
```

`packages/admin/.env.local`:
```env
REACT_APP_API_URL=http://localhost:3002/api
REACT_APP_ENV=development
```

### 2. 라이브 서버 환경 변수

#### 2-1. 라이브 서버 환경 변수
`packages/server/.env.production`:
```env
NODE_ENV=production
PORT=3002
DATA_DIR=./data/production
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
```

#### 2-2. 프론트엔드 라이브 환경 변수
`packages/main/.env.production`:
```env
REACT_APP_API_URL=https://api.tourstream.kr/api
REACT_APP_ENV=production
```

`packages/admin/.env.production`:
```env
REACT_APP_API_URL=https://api.tourstream.kr/api
REACT_APP_ENV=production
```

---

## 🚀 개발 워크플로우

### 로컬 개발
```bash
# 1. 로컬 서버 시작 (로컬 데이터 사용)
cd packages/server
npm run start  # .env.local 자동 로드

# 2. 로컬 프론트엔드 시작
cd packages/main
npm run start  # .env.local 자동 로드

# 3. 로컬 어드민 시작
cd packages/admin
npm run start  # .env.local 자동 로드
```

### 로컬에서 테스트
- 로컬 서버에 테스트 상품 등록
- 로컬 메인 앱에서 확인
- 테스트 완료 후 삭제 또는 무시

### 라이브 배포
```bash
# 1. 빌드 (프로덕션 환경 변수 사용)
NODE_ENV=production npm run build:all

# 2. 배포 (데이터 파일 제외)
# - 코드만 배포
# - 서버의 data/production 디렉토리는 유지
```

---

## 📝 .gitignore 설정

데이터 파일을 Git에서 제외:

`.gitignore`에 추가:
```
# 데이터 파일 (로컬 및 프로덕션)
packages/server/data/**/*.json
packages/server/data/local/
packages/server/data/beta/
packages/server/data/production/

# 환경 변수 파일
.env.local
.env.production
.env.beta
```

---

## 🔄 배포 스크립트 수정

### 배포 시 데이터 제외

`scripts/deploy-production.sh` 수정:
```bash
# API 서버 배포 시 데이터 디렉토리 제외
scp -r --exclude='data/*' packages/server/* user@live-server:/var/www/live-api/
```

또는:
```bash
# 데이터 디렉토리만 제외하고 나머지 업로드
rsync -av --exclude='data' packages/server/ user@live-server:/var/www/live-api/
```

---

## 🛡️ 데이터 보호 방법

### 방법 1: 환경 변수로 데이터 경로 분리 (권장)

**로컬**:
- `DATA_DIR=./data/local`
- 로컬에서 등록한 상품은 `data/local/products.json`에 저장

**라이브**:
- `DATA_DIR=./data/production`
- 라이브 상품은 `data/production/products.json`에 저장

**장점**:
- 완전히 분리된 데이터
- 실수로 테스트 상품이 올라갈 일 없음
- 각 환경 독립적 운영

### 방법 2: 배포 시 데이터 제외

**배포 스크립트**:
```bash
# 데이터 파일은 제외하고 코드만 배포
scp -r --exclude='data' packages/server/* user@live-server:/var/www/live-api/
```

**장점**:
- 서버의 기존 데이터 유지
- 코드만 업데이트

---

## 📋 체크리스트

### 로컬 개발 전
- [ ] `.env.local` 파일 생성
- [ ] `data/local` 디렉토리 생성
- [ ] 환경 변수 확인

### 로컬 테스트
- [ ] 로컬 서버에서 테스트 상품 등록
- [ ] 로컬 메인 앱에서 확인
- [ ] 테스트 완료

### 라이브 배포 전
- [ ] 테스트 상품 삭제 (로컬에서)
- [ ] `.env.production` 확인
- [ ] 배포 스크립트에서 데이터 제외 확인
- [ ] 라이브 서버의 `data/production` 백업

### 라이브 배포 후
- [ ] 라이브 서버 데이터 확인
- [ ] 테스트 상품이 없는지 확인
- [ ] 라이브 기능 테스트

---

## 💡 추가 팁

### 1. 데이터 백업
```bash
# 라이브 서버 데이터 백업
ssh user@live-server "cd /var/www/live-api && tar -czf backup-$(date +%Y%m%d).tar.gz data/production/"
```

### 2. 로컬 데이터 초기화
```bash
# 로컬 테스트 데이터 삭제
rm -rf packages/server/data/local/*
```

### 3. 환경 확인
```bash
# 현재 사용 중인 환경 변수 확인
echo $NODE_ENV
echo $DATA_DIR
```

---

## ⚠️ 주의사항

1. **절대 로컬 데이터를 라이브에 배포하지 마세요**
   - 배포 스크립트에서 `data` 디렉토리 제외 확인

2. **환경 변수 파일은 Git에 커밋하지 마세요**
   - `.gitignore`에 추가 확인

3. **라이브 서버 데이터는 항상 백업**
   - 배포 전 백업 필수

4. **로컬과 라이브의 API URL 확인**
   - 로컬: `http://localhost:3002/api`
   - 라이브: `https://api.tourstream.kr/api`

---

## 🔍 문제 해결

### 문제: 로컬에서 등록한 상품이 라이브에 나타남
**원인**: 환경 변수가 제대로 설정되지 않음
**해결**: `.env.local` 파일 확인 및 서버 재시작

### 문제: 배포 후 데이터가 사라짐
**원인**: 배포 시 데이터 디렉토리도 덮어씀
**해결**: 배포 스크립트에서 `data` 디렉토리 제외 확인

### 문제: 로컬과 라이브가 같은 데이터 사용
**원인**: `DATA_DIR` 환경 변수가 동일
**해결**: 로컬은 `./data/local`, 라이브는 `./data/production` 확인
