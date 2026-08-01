// 상품 마이그레이션 유틸리티 (메인 앱용)

/**
 * 기존 상품을 6자리 번호로 마이그레이션
 * @param products - 마이그레이션할 상품 배열
 * @returns 마이그레이션된 상품 배열
 */
export const migrateProductsToSixDigit = (products: any[]): any[] => {
  if (!products || products.length === 0) {
    return products;
  }
  
  // 이미 6자리 번호인지 확인
  const needsMigration = products.some((p: any) => !/^\d{6}$/.test(p.id));
  
  if (!needsMigration) {
    return products;
  }
  
  console.log('[productMigration] 마이그레이션 시작:', products.length, '개 상품');
  
  // 마이그레이션 수행
  let currentCounter = 100000;
  
  // 기존 카운터 확인
  if (typeof window !== 'undefined') {
    const savedCounter = localStorage.getItem('tourstream_product_counter');
    if (savedCounter) {
      currentCounter = parseInt(savedCounter, 10);
    }
  }
  
  const migratedProducts = products.map((product: any) => {
    // 이미지 제거
    const productWithoutImages = { ...product, images: [] };
    
    // 이미 6자리 번호면 그대로 사용
    if (/^\d{6}$/.test(product.id)) {
      return productWithoutImages;
    }
    
    // 기존 번호 추출 (product_1 -> 1, product_123 -> 123)
    const oldNumber = product.id.replace(/[^0-9]/g, '');
    if (oldNumber) {
      // 기존 번호를 6자리로 변환 (100001부터 시작)
      const newId = (100000 + parseInt(oldNumber)).toString();
      
      // 카운터 업데이트
      const newIdNum = parseInt(newId);
      if (newIdNum >= currentCounter) {
        currentCounter = newIdNum + 1;
      }
      
      console.log(`[productMigration] ${product.id} -> ${newId}`);
      return { ...productWithoutImages, id: newId };
    }
    
    // 번호를 추출할 수 없으면 새 번호 부여
    const newId = currentCounter.toString();
    currentCounter++;
    console.log(`[productMigration] 새 번호 부여: ${product.id} -> ${newId}`);
    return { ...productWithoutImages, id: newId };
  });
  
  // 카운터 저장
  if (typeof window !== 'undefined') {
    localStorage.setItem('tourstream_product_counter', currentCounter.toString());
    console.log(`[productMigration] 마이그레이션 완료. 다음 번호: ${currentCounter}`);
  }
  
  return migratedProducts;
};
