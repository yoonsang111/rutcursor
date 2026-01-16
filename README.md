# TourStream Monorepo

투어 상품 검색 및 관리 시스템

## 프로젝트 구조

```
RUT/
├── packages/
│   ├── main/              # 메인 사이트 (사용자용)
│   ├── admin/             # 어드민 사이트 (관리자용)
│   ├── api/               # 백엔드 API (향후 추가)
│   └── shared/            # 공통 코드 (타입, 유틸리티)
├── package.json           # 루트 workspace 설정
└── README.md
```

## 설치

```bash
npm install
```

## 실행

### 메인 사이트
```bash
npm run main:start
# 또는
cd packages/main && npm start
```

### 어드민 사이트
```bash
npm run admin:start
# 또는
cd packages/admin && npm start
```

## 빌드

### 전체 빌드
```bash
npm run build:all
```

### 개별 빌드
```bash
npm run main:build
npm run admin:build
```

## 기술 스택

- **메인/어드민**: React 18, TypeScript, Tailwind CSS
- **공통**: TypeScript 타입 정의, 유틸리티 함수
