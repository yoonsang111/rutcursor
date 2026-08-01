# 디버깅 가이드

## 현재 상태 확인

### 1. API 서버 확인
```bash
# API 서버가 실행 중인지 확인
curl http://localhost:3002/api/products

# 상품 개수 확인
curl http://localhost:3002/api/products | jq 'length'
```

### 2. 브라우저 콘솔 확인
메인 앱 (http://localhost:3000)에서:
1. F12 → Console 탭
2. 다음 로그 확인:
   - `[api] 상품 목록 요청: http://localhost:3002/api/products`
   - `[api] 응답 상태: 200 OK`
   - `[api] 상품 로드 성공: X개`
   - `[HomePage] API에서 받은 상품 수: X`
   - `[HomePage] 상품 설정: X개`

### 3. Network 탭 확인
1. F12 → Network 탭
2. 페이지 새로고침
3. `api/products` 요청 확인:
   - Status: 200 OK
   - Response: 상품 배열이 반환되는지 확인

### 4. 가능한 문제들

#### 문제 1: API 서버가 실행되지 않음
**증상**: `Failed to fetch` 또는 `Network error`
**해결**: 
```bash
cd packages/server
npm start
```

#### 문제 2: CORS 오류
**증상**: `CORS policy: No 'Access-Control-Allow-Origin' header`
**해결**: 서버의 CORS 설정 확인 (이미 설정되어 있음)

#### 문제 3: API 서버에 데이터가 없음
**증상**: `[api] 상품 로드 성공: 0개`
**해결**: 어드민에서 상품 등록 후 확인

#### 문제 4: 브라우저 캐시
**증상**: 이전 데이터가 표시됨
**해결**: Ctrl+Shift+R (또는 Cmd+Shift+R)로 강력 새로고침

## 테스트 스크립트

브라우저 콘솔에서 실행:

```javascript
// 1. API 서버 연결 테스트
fetch('http://localhost:3002/api/products')
  .then(res => res.json())
  .then(data => {
    console.log('✅ API 연결 성공!');
    console.log('상품 수:', data.length);
    console.log('첫 번째 상품:', data[0]);
  })
  .catch(err => {
    console.error('❌ API 연결 실패:', err);
  });

// 2. 현재 페이지의 상품 상태 확인
// (React DevTools가 설치되어 있어야 함)
```

## 수정 사항

1. ✅ 모든 페이지에서 mock 데이터 제거
2. ✅ 모든 페이지에서 API만 사용하도록 수정
3. ✅ 불필요한 `setupAdminSync` import 제거
4. ✅ API 클라이언트 에러 핸들링 개선
