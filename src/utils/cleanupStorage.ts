// 로컬스토리지 정리 유틸리티

/**
 * 모든 상품의 이미지를 제거하고 ID를 6자리로 마이그레이션
 * @param force - 강제로 정리 실행 (기본값: true)
 */
export const cleanupProducts = (force: boolean = true): any[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const productsData = localStorage.getItem('tourstream_products');
    if (!productsData) {
      return [];
    }
    
    const products = JSON.parse(productsData);
    if (!Array.isArray(products)) {
      return [];
    }
    
    let currentCounter = 100000;
    const savedCounter = localStorage.getItem('tourstream_product_counter');
    if (savedCounter) {
      currentCounter = parseInt(savedCounter, 10);
      if (currentCounter < 100000) {
        currentCounter = 100000;
      }
    }
    
    let hasChanges = false;
    const cleanedProducts = products.map((product: any, index: number) => {
      const originalId = product.id;
      const originalImages = product.images;
      
      // 이미지 완전히 제거
      const cleanedProduct = {
        ...product,
        images: []
      };
      
      // ID가 6자리가 아니면 변환
      if (!/^\d{6}$/.test(cleanedProduct.id)) {
        hasChanges = true;
        const oldNumber = cleanedProduct.id.replace(/[^0-9]/g, '');
        if (oldNumber) {
          const newId = (100000 + parseInt(oldNumber)).toString();
          const newIdNum = parseInt(newId);
          if (newIdNum >= currentCounter) {
            currentCounter = newIdNum + 1;
          }
          cleanedProduct.id = newId;
        } else {
          cleanedProduct.id = currentCounter.toString();
          currentCounter++;
        }
      }
      
      // 이미지가 있으면 제거
      if (originalImages && originalImages.length > 0) {
        hasChanges = true;
      }
      
      return cleanedProduct;
    });
    
    // 변경사항이 있거나 강제 실행이면 저장
    if (hasChanges || force) {
      localStorage.setItem('tourstream_products', JSON.stringify(cleanedProducts));
      localStorage.setItem('tourstream_product_counter', currentCounter.toString());
    }
    
    return cleanedProducts;
  } catch (error) {
    console.error('[cleanupStorage] 오류:', error);
    return [];
  }
};
