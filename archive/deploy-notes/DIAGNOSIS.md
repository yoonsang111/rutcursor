# 연동 문제 진단 가이드

## 현재 상태
- ✅ API 서버: http://localhost:3002 (88개 상품 확인됨)
- ✅ 어드민: http://localhost:3001
- ✅ 메인: http://localhost:3000

## 진단 방법

### 1. 어드민에서 확인
1. 브라우저에서 http://localhost:3001 열기
2. 개발자 도구 열기 (F12)
3. Console 탭 확인
4. 상품 등록 시 다음 로그가 나와야 함:
   - `[API] 상품 목록 요청: http://localhost:3002/api/products`
   - `[API] 응답 상태: 200 OK`
   - `[ProductContext] 상품 등록 시작: ...`
   - `[ProductContext] 상품 등록 성공: ...`

### 2. 메인 앱에서 확인
1. 브라우저에서 http://localhost:3000 열기
2. 개발자 도구 열기 (F12)
3. Console 탭 확인
4. 다음 로그가 나와야 함:
   - `[api] 상품 목록 요청: http://localhost:3002/api/products`
   - `[api] 응답 상태: 200 OK`
   - `[api] 상품 로드 성공: 88개`
   - `[HomePage] API에서 받은 상품 수: 88`

### 3. Network 탭에서 확인
1. 개발자 도구 → Network 탭
2. 어드민에서 상품 등록 시:
   - `POST http://localhost:3002/api/products` 요청 확인
   - Status: 201 Created 확인
3. 메인 앱에서:
   - `GET http://localhost:3002/api/products` 요청 확인
   - Status: 200 OK 확인

### 4. 수동 테스트
브라우저 콘솔에서 다음 코드 실행:

```javascript
// 어드민 콘솔에서
fetch('http://localhost:3002/api/products')
  .then(res => res.json())
  .then(data => console.log('상품 수:', data.length, data.slice(0, 3)));

// 메인 콘솔에서
fetch('http://localhost:3002/api/products')
  .then(res => res.json())
  .then(data => console.log('상품 수:', data.length, data.slice(0, 3)));
```

## 가능한 문제들

1. **CORS 오류**: Network 탭에서 CORS 관련 에러 확인
2. **API 서버 미실행**: `curl http://localhost:3002/api/products` 실행하여 확인
3. **네트워크 오류**: 브라우저 콘솔에 "Failed to fetch" 에러 확인
4. **캐시 문제**: 브라우저 새로고침 (Ctrl+Shift+R 또는 Cmd+Shift+R)
