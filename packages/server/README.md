# TourStream API Server

Express 기반 REST API 서버입니다.

## 시작 방법

```bash
# 루트 디렉토리에서
npm run server:start

# 또는 packages/server 디렉토리에서
cd packages/server
npm install
npm start
```

서버는 `http://localhost:3002`에서 실행됩니다.

## API 엔드포인트

### 상품
- `GET /api/products` - 상품 목록 조회
- `GET /api/products/:id` - 상품 상세 조회
- `POST /api/products` - 상품 등록
- `PUT /api/products/:id` - 상품 수정
- `DELETE /api/products/:id` - 상품 삭제

### 카테고리
- `GET /api/categories` - 카테고리 목록 조회
- `POST /api/categories` - 카테고리 저장

### 지역
- `GET /api/locations` - 지역 목록 조회
- `POST /api/locations` - 지역 저장

## 데이터 저장

데이터는 `packages/server/data/` 디렉토리에 JSON 파일로 저장됩니다:
- `products.json` - 상품 데이터
- `counter.json` - 상품 번호 카운터
- `categories.json` - 카테고리 데이터
- `locations.json` - 지역 데이터
