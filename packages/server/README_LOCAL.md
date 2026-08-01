# 로컬 개발 가이드

## 🎯 목표
로컬에서 테스트 상품을 등록하고 테스트하되, 라이브 서버에는 테스트 상품이 올라가지 않도록 합니다.

## 📁 데이터 분리

### 로컬 개발
- 데이터 저장 위치: `packages/server/data/local/`
- 환경 변수: `.env.local` 파일 사용

### 라이브 서버
- 데이터 저장 위치: `packages/server/data/production/`
- 환경 변수: `.env.production` 파일 사용

## 🚀 사용 방법

### 1. 로컬 환경 설정

```bash
# .env.local 파일 생성
cp .env.local.example .env.local
```

`.env.local` 파일 내용:
```env
NODE_ENV=development
PORT=3002
DATA_DIR=./data/local
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### 2. 로컬 서버 시작

```bash
# 환경 변수 로드하여 서버 시작
export $(cat .env.local | xargs) && npm start
```

또는 `dotenv-cli` 사용:
```bash
npm install -g dotenv-cli
dotenv -e .env.local -- npm start
```

### 3. 로컬에서 테스트

1. 로컬 서버 시작
2. 로컬 어드민에서 테스트 상품 등록
3. 로컬 메인 앱에서 확인
4. 테스트 완료 후 로컬 데이터 삭제 또는 무시

### 4. 라이브 배포

배포 스크립트가 자동으로:
- 데이터 디렉토리 제외
- 코드만 업로드
- 라이브 서버의 기존 데이터 유지

## ⚠️ 중요 사항

1. **로컬 데이터는 절대 라이브에 올라가지 않습니다**
   - 배포 스크립트에서 `data` 디렉토리 제외
   - 로컬: `data/local/`
   - 라이브: `data/production/`

2. **환경 변수로 완전히 분리**
   - 로컬: `DATA_DIR=./data/local`
   - 라이브: `DATA_DIR=./data/production`

3. **Git에 데이터 파일 커밋하지 않음**
   - `.gitignore`에 `packages/server/data/**/*.json` 추가됨

## 🔍 확인 방법

### 로컬 데이터 확인
```bash
cat packages/server/data/local/products.json
```

### 라이브 데이터 확인 (서버 접속 후)
```bash
cat /var/www/live-api/data/production/products.json
```

## 🧹 로컬 데이터 초기화

테스트 후 로컬 데이터 삭제:
```bash
rm -rf packages/server/data/local/*
```
