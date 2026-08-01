// API 유틸리티 (메인용)

const API_BASE_URL = 'http://localhost:3002/api';

// 즉시 실행되는 전역 테스트
console.log('🔥🔥🔥 api.ts 파일이 로드되었습니다! 🔥🔥🔥');
console.log('🔥 API_BASE_URL:', API_BASE_URL);
console.log('🔥 fetch 함수:', typeof fetch);
console.log('🔥 window 객체:', typeof window);

// 전역에서 직접 테스트
if (typeof window !== 'undefined') {
  console.log('🔥 window.location:', window.location.href);
  console.log('🔥 fetch 테스트 시작...');
  fetch('http://localhost:3002/api/products')
    .then(res => {
      console.log('🔥🔥🔥 전역 fetch 테스트 성공!', res.status);
      return res.json();
    })
    .then(data => {
      console.log('🔥🔥🔥 전역 fetch 데이터:', data.length, '개');
    })
    .catch(err => {
      console.error('🔥🔥🔥 전역 fetch 테스트 실패:', err);
    });
}

export const api = {
  // Products
  getProducts: async () => {
    const url = `${API_BASE_URL}/products`;
    console.log('🚀 [api.getProducts] ========== API 호출 시작 ==========');
    console.log('🚀 [api.getProducts] URL:', url);
    console.log('🚀 [api.getProducts] API_BASE_URL:', API_BASE_URL);
    console.log('🚀 [api.getProducts] fetch 함수 존재:', typeof fetch);
    console.log('🚀 [api.getProducts] window 객체:', typeof window);
    
    if (typeof fetch === 'undefined') {
      console.error('❌ [api.getProducts] fetch 함수가 없습니다!');
      return [];
    }
    
    try {
      console.log('⏳ [api.getProducts] fetch 호출 전...');
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
        mode: 'cors',
      });
      
      const endTime = Date.now();
      console.log('⏳ [api.getProducts] fetch 호출 완료 (소요 시간:', endTime - startTime, 'ms)');
      console.log('📊 [api.getProducts] 응답 상태:', response.status, response.statusText);
      console.log('📊 [api.getProducts] 응답 헤더:', response.headers.get('content-type'));
      console.log('📊 [api.getProducts] 응답 OK:', response.ok);
      console.log('📊 [api.getProducts] 응답 URL:', response.url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [api.getProducts] API 응답 오류:', response.status, response.statusText);
        console.error('❌ [api.getProducts] 에러 내용:', errorText);
        return [];
      }
      
      console.log('📥 [api.getProducts] JSON 파싱 시작...');
      const products = await response.json();
      console.log('✅ [api.getProducts] 상품 로드 성공:', products.length, '개');
      if (products.length > 0) {
        console.log('✅ [api.getProducts] 첫 번째 상품:', { id: products[0].id, name: products[0].name });
      }
      console.log('🎉 [api.getProducts] ========== API 호출 완료 ==========');
      return products;
    } catch (error: any) {
      console.error('❌❌❌ [api.getProducts] API 서버에 연결할 수 없습니다 ❌❌❌');
      console.error('❌ [api.getProducts] 에러 타입:', error?.constructor?.name);
      console.error('❌ [api.getProducts] 에러 이름:', error?.name);
      console.error('❌ [api.getProducts] 에러 메시지:', error?.message);
      console.error('❌ [api.getProducts] 에러 스택:', error?.stack);
      console.error('❌ [api.getProducts] 전체 에러 객체:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('💥 [api.getProducts] ========== API 호출 실패 ==========');
      return [];
    }
  },

  getProduct: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.warn('[api] 상품을 불러올 수 없습니다:', error);
      return null;
    }
  },
};
