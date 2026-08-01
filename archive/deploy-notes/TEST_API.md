# API 테스트 가이드

## 방법 1: Network 탭에서 직접 검색

1. F12 → Network 탭 열기
2. 상단 검색창에 `api/products` 입력
3. 페이지 새로고침 (F5 또는 Ctrl+R)
4. `api/products` 요청이 나타나는지 확인

## 방법 2: 콘솔에서 직접 테스트

브라우저 콘솔(F12 → Console)에서 다음 코드 실행:

```javascript
// API 서버 연결 테스트
fetch('http://localhost:3002/api/products')
  .then(res => {
    console.log('✅ 응답 상태:', res.status, res.statusText);
    return res.json();
  })
  .then(data => {
    console.log('✅ API 연결 성공!');
    console.log('상품 수:', data.length);
    if (data.length > 0) {
      console.log('첫 번째 상품:', data[0]);
    }
  })
  .catch(err => {
    console.error('❌ API 연결 실패:', err);
    console.error('에러 상세:', err.message);
  });
```

## 방법 3: Network 탭에서 All 필터 사용

1. F12 → Network 탭
2. 필터를 "All"로 설정
3. 페이지 새로고침
4. 목록에서 `products` 또는 `3002`를 검색
5. `localhost:3002/api/products` 요청 찾기

## 방법 4: 서버 로그 확인

터미널에서 API 서버가 실행 중인지 확인:

```bash
# API 서버가 실행 중인지 확인
curl http://localhost:3002/api/products

# 또는 상품 개수 확인
curl http://localhost:3002/api/products | jq 'length'
```

## 예상되는 문제들

### 문제 1: API 서버가 실행되지 않음
**증상**: 콘솔에 `Failed to fetch` 또는 `Network error`
**해결**: 
```bash
cd packages/server
npm start
```

### 문제 2: CORS 오류
**증상**: 콘솔에 `CORS policy` 관련 에러
**해결**: 서버의 CORS 설정 확인 (이미 설정되어 있음)

### 문제 3: 요청이 전혀 보이지 않음
**증상**: Network 탭에 `api/products` 요청이 없음
**원인**: 
- 페이지가 API를 호출하지 않음
- useEffect가 실행되지 않음
- 컴포넌트가 마운트되지 않음

**확인 방법**:
1. 콘솔에 `[SearchPage] 상품 로드 시작...` 로그가 있는지 확인
2. 없으면 컴포넌트가 제대로 렌더링되지 않은 것
