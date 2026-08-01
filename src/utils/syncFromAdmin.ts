// 어드민에서 메인으로 데이터 동기화 유틸리티

/**
 * 어드민에서 보낸 메시지를 수신하여 로컬스토리지에 저장
 * BroadcastChannel과 postMessage 모두 지원
 * @param setProducts - 상품 목록을 업데이트할 setState 함수
 */
export const setupAdminSync = (setProducts: (products: any[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  
  let broadcastChannel: BroadcastChannel | null = null;
  
  // BroadcastChannel 사용 (같은 브라우저의 모든 탭에서 수신 가능)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel('tourstream_products_sync');
      broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'TOURSTREAM_PRODUCTS_UPDATE') {
          const { products, counter } = event.data;
          
          // 이미지 제거 및 정리
          const cleanedProducts = products.map((product: any) => ({
            ...product,
            images: []
          }));
          
          // 로컬스토리지에 저장
          localStorage.setItem('tourstream_products', JSON.stringify(cleanedProducts));
          if (counter) {
            localStorage.setItem('tourstream_product_counter', counter.toString());
          }
          
          // 상태 업데이트
          setProducts(cleanedProducts);
        }
      };
    } catch (error) {
      console.warn('[syncFromAdmin] BroadcastChannel 초기화 실패:', error);
    }
  }
  
  // postMessage 리스너 (크로스 오리진 통신용)
  const handleMessage = (event: MessageEvent) => {
    // 보안: origin 확인 (로컬 개발 환경만 허용)
    if (event.origin !== 'http://localhost:3001' && event.origin !== 'http://localhost:3000') {
      return;
    }
    
    if (event.data && event.data.type === 'TOURSTREAM_PRODUCTS_UPDATE') {
      const { products, counter } = event.data;
      
      // 이미지 제거 및 정리
      const cleanedProducts = products.map((product: any) => ({
        ...product,
        images: []
      }));
      
      // 로컬스토리지에 저장
      localStorage.setItem('tourstream_products', JSON.stringify(cleanedProducts));
      if (counter) {
        localStorage.setItem('tourstream_product_counter', counter.toString());
      }
      
      // 상태 업데이트
      setProducts(cleanedProducts);
    }
  };
  
  window.addEventListener('message', handleMessage);
  
  // cleanup 함수 반환
  return () => {
    window.removeEventListener('message', handleMessage);
    if (broadcastChannel) {
      broadcastChannel.close();
    }
  };
};
