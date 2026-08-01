# 배포 전략 가이드

## 환경 분리 전략

### 1. 베타(Beta)와 라이브(Production) 환경 분리

베타와 라이브를 분리하는 것은 **강력히 권장**됩니다. 다음과 같은 방법들이 있습니다:

#### 방법 A: 서브도메인 분리 (추천)
```
베타:   beta.tourstream.kr
라이브: tourstream.kr (또는 www.tourstream.kr)
```

#### 방법 B: 경로 분리
```
베타:   tourstream.kr/beta
라이브: tourstream.kr
```

#### 방법 C: 별도 도메인
```
베타:   tourstream-beta.kr
라이브: tourstream.kr
```

---

## 서버 비용 분석

### 옵션 1: 단일 서버 (비용 절감)
- **1대 서버**에 모든 환경 배포
- 베타와 라이브를 포트나 경로로 분리
- **비용**: 가장 저렴 (월 $5-20)
- **단점**: 리소스 경합, 한 환경의 문제가 다른 환경에 영향 가능

### 옵션 2: 서버 분리 (안정성 우선)
- **베타 서버 1대** + **라이브 서버 1대**
- 완전히 독립된 환경
- **비용**: 2배 (월 $10-40)
- **장점**: 안정성, 독립적 스케일링

### 옵션 3: 클라우드 서비스 활용 (추천)
#### AWS/GCP/Azure
- **베타**: 작은 인스턴스 (t3.micro, t2.small)
- **라이브**: 적절한 인스턴스 (t3.small, t3.medium)
- **비용**: 월 $15-50 (사용량에 따라)
- **장점**: 자동 스케일링, 백업, 모니터링

#### Vercel/Netlify (프론트엔드)
- **무료 플랜**: 베타 환경
- **프로 플랜**: 라이브 환경 (월 $20)
- **장점**: 자동 배포, CDN, SSL 무료

---

## 추천 아키텍처

### 구성 1: 비용 최적화 (초기 단계)
```
┌─────────────────────────────────────┐
│  단일 서버 (예: AWS EC2 t3.small)   │
├─────────────────────────────────────┤
│  베타 API:  :3002-beta              │
│  라이브 API: :3002                  │
│  베타 메인:  :3000-beta              │
│  라이브 메인: :3000                  │
│  베타 어드민: :3001-beta             │
│  라이브 어드민: :3001                │
└─────────────────────────────────────┘
```

### 구성 2: 안정성 우선 (권장)
```
┌──────────────────┐  ┌──────────────────┐
│  베타 서버        │  │  라이브 서버      │
│  (t3.micro)       │  │  (t3.small)      │
├──────────────────┤  ├──────────────────┤
│  API: :3002      │  │  API: :3002      │
│  메인: :3000     │  │  메인: :3000     │
│  어드민: :3001   │  │  어드민: :3001   │
└──────────────────┘  └──────────────────┘
```

### 구성 3: 하이브리드 (최적)
```
┌─────────────────────────────────────┐
│  Vercel/Netlify (프론트엔드)         │
│  - 베타: beta.tourstream.kr         │
│  - 라이브: tourstream.kr            │
└─────────────────────────────────────┘
              ↓ API 호출
┌─────────────────────────────────────┐
│  단일 서버 (API만)                  │
│  - 베타 API: beta-api.tourstream.kr│
│  - 라이브 API: api.tourstream.kr   │
└─────────────────────────────────────┘
```

---

## 환경 변수 설정

### 1. API 서버 설정

`packages/server/.env.beta`:
```env
NODE_ENV=beta
PORT=3002
DATA_DIR=./data/beta
CORS_ORIGIN=https://beta.tourstream.kr,https://beta-admin.tourstream.kr
```

`packages/server/.env.production`:
```env
NODE_ENV=production
PORT=3002
DATA_DIR=./data/production
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
```

### 2. 프론트엔드 설정

`packages/main/.env.beta`:
```env
REACT_APP_API_URL=https://beta-api.tourstream.kr
REACT_APP_ENV=beta
```

`packages/main/.env.production`:
```env
REACT_APP_API_URL=https://api.tourstream.kr
REACT_APP_ENV=production
```

`packages/admin/.env.beta`:
```env
REACT_APP_API_URL=https://beta-api.tourstream.kr
REACT_APP_ENV=beta
```

`packages/admin/.env.production`:
```env
REACT_APP_API_URL=https://api.tourstream.kr
REACT_APP_ENV=production
```

---

## 개발 워크플로우

### 1. 개발 → 베타 → 라이브 플로우

```
로컬 개발
    ↓
베타 서버 배포 (테스트)
    ↓
라이브 서버 배포 (운영)
```

### 2. Git 브랜치 전략

```
main (또는 master)
  ├── production (라이브)
  └── beta (베타)
      └── develop (개발)
```

### 3. 배포 프로세스

#### 베타 배포
```bash
# 1. 베타 브랜치로 체크아웃
git checkout beta

# 2. develop에서 변경사항 병합
git merge develop

# 3. 베타 서버에 배포
npm run build:all
# 베타 서버에 업로드
```

#### 라이브 배포
```bash
# 1. 베타에서 충분히 테스트 완료 후
git checkout production

# 2. 베타에서 변경사항 병합
git merge beta

# 3. 라이브 서버에 배포
npm run build:all
# 라이브 서버에 업로드
```

---

## 데이터베이스 분리

### 옵션 1: 파일 기반 (현재 구조)
- 베타: `packages/server/data/beta/products.json`
- 라이브: `packages/server/data/production/products.json`
- **장점**: 간단, 추가 비용 없음
- **단점**: 확장성 제한

### 옵션 2: 데이터베이스 분리
- 베타: 별도 DB 인스턴스 또는 테이블
- 라이브: 별도 DB 인스턴스
- **추천**: PostgreSQL, MySQL, MongoDB
- **비용**: 월 $5-20 (DB 서비스에 따라)

---

## 비용 예상 (월간)

### 최소 구성 (단일 서버)
- 서버: $5-10 (VPS)
- 도메인: $1-2
- **총: $6-12/월**

### 권장 구성 (서버 분리)
- 베타 서버: $5-10
- 라이브 서버: $10-20
- 도메인: $1-2
- **총: $16-32/월**

### 최적 구성 (하이브리드)
- Vercel/Netlify: $0-20 (프론트엔드)
- API 서버: $10-20
- 도메인: $1-2
- **총: $11-42/월**

---

## 모니터링 및 백업

### 필수 모니터링
- 서버 상태 (CPU, 메모리, 디스크)
- API 응답 시간
- 에러 로그
- 트래픽 모니터링

### 백업 전략
- **베타**: 주 1회 백업
- **라이브**: 일 1회 백업
- 데이터 파일 자동 백업 스크립트 필요

---

## 보안 고려사항

1. **HTTPS 필수**: SSL 인증서 (Let's Encrypt 무료)
2. **환경 변수 보호**: `.env` 파일 git에 커밋 금지
3. **CORS 설정**: 정확한 도메인만 허용
4. **API 인증**: 어드민 접근 시 인증 추가 권장

---

## 다음 단계

1. 환경 변수 시스템 구축
2. 배포 스크립트 작성
3. CI/CD 파이프라인 설정 (GitHub Actions 등)
4. 모니터링 도구 설정
5. 백업 자동화
