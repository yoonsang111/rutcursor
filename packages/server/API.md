# TourStream API 문서

## 기본 정보
- **Base URL**: `http://localhost:3002/api`
- **Content-Type**: `application/json`

## 엔드포인트

### 상품 (Products)

#### 1. 상품 목록 조회
```http
GET /api/products
```

**응답 예시:**
```json
[
  {
    "id": "100001",
    "name": "상품명",
    "description": "상품 설명",
    "images": [],
    "categories": ["티켓/입장권"],
    "locations": ["베트남", "다낭"],
    "tags": [],
    "isRecommended": false,
    "isAvailable": true,
    "views": 0
  }
]
```

#### 2. 상품 상세 조회
```http
GET /api/products/:id
```

**예시:**
```http
GET /api/products/100001
```

#### 3. 상품 등록
```http
POST /api/products
Content-Type: application/json

{
  "name": "상품명",
  "description": "상품 설명",
  "images": [],
  "categories": ["티켓/입장권"],
  "locations": ["베트남", "다낭"],
  "tags": [],
  "isRecommended": false,
  "isAvailable": true
}
```

**응답:**
- `id`: 자동 생성된 6자리 상품 번호 (예: "100001")
- `views`: 0으로 초기화

#### 4. 상품 수정
```http
PUT /api/products/:id
Content-Type: application/json

{
  "name": "수정된 상품명",
  "description": "수정된 설명"
}
```

#### 5. 상품 삭제
```http
DELETE /api/products/:id
```

### 카테고리 (Categories)

#### 1. 카테고리 목록 조회
```http
GET /api/categories
```

**응답:**
```json
{
  "mainCategories": [
    {
      "id": "cat_1",
      "name": "티켓/입장권"
    }
  ],
  "subCategories": [
    {
      "id": "sub_1",
      "name": "테마파크",
      "mainCategoryId": "cat_1"
    }
  ]
}
```

#### 2. 카테고리 저장
```http
POST /api/categories
Content-Type: application/json

{
  "mainCategories": [...],
  "subCategories": [...]
}
```

### 지역 (Locations)

#### 1. 지역 목록 조회
```http
GET /api/locations
```

**응답:**
```json
{
  "countries": [
    {
      "id": "country_1",
      "name": "베트남"
    }
  ],
  "regions": [
    {
      "id": "region_1",
      "name": "다낭",
      "countryId": "country_1"
    }
  ]
}
```

#### 2. 지역 저장
```http
POST /api/locations
Content-Type: application/json

{
  "countries": [...],
  "regions": [...]
}
```

## 테스트 방법

### 1. curl 사용
```bash
# 상품 목록 조회
curl http://localhost:3002/api/products

# 상품 등록
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트","description":"설명","images":[],"categories":[],"locations":[],"tags":[],"isRecommended":false,"isAvailable":true}'
```

### 2. Postman 사용 (선택사항)
1. Postman 설치: https://www.postman.com/downloads/
2. 새 Request 생성
3. Method 선택 (GET, POST, PUT, DELETE)
4. URL 입력: `http://localhost:3002/api/products`
5. Headers에 `Content-Type: application/json` 추가 (POST/PUT 시)
6. Body에 JSON 데이터 입력 (POST/PUT 시)
7. Send 클릭

### 3. 브라우저 개발자 도구 사용
```javascript
// 브라우저 콘솔에서 실행
fetch('http://localhost:3002/api/products')
  .then(res => res.json())
  .then(data => console.log(data));
```

## 에러 응답

```json
{
  "error": "에러 메시지"
}
```

**상태 코드:**
- `200`: 성공
- `201`: 생성 성공
- `404`: 리소스를 찾을 수 없음
- `500`: 서버 내부 오류
