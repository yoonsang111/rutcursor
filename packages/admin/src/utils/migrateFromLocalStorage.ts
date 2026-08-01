// 로컬스토리지에서 API 서버로 상품 마이그레이션 유틸리티

import { Product } from '@tourstream/shared';
import { api } from './api';
import { storage } from './storage';

/**
 * 로컬스토리지의 모든 상품을 API 서버로 마이그레이션
 * @returns 마이그레이션된 상품 수
 */
export const migrateProductsFromLocalStorage = async (): Promise<number> => {
  try {
    // API에서 현재 상품 목록 가져오기
    const apiProducts = await api.getProducts();
    const apiIds = new Set(apiProducts.map((p: Product) => p.id));
    const apiNames = new Set(apiProducts.map((p: Product) => p.name.toLowerCase().trim()));
    
    // 로컬스토리지에서 상품 가져오기
    const localProducts = storage.getProducts();
    
    console.log(`[migrate] API 상품 수: ${apiProducts.length}, 로컬스토리지 상품 수: ${localProducts.length}`);
    
    // API에 없는 상품만 필터링 (ID와 이름 모두 확인)
    const productsToMigrate = localProducts.filter((p: any) => {
      const idExists = apiIds.has(p.id);
      const nameExists = apiNames.has((p.name || '').toLowerCase().trim());
      const shouldMigrate = !idExists && !nameExists;
      
      if (!shouldMigrate) {
        console.log(`[migrate] 건너뜀: ${p.name} (ID: ${p.id}, ID존재: ${idExists}, 이름존재: ${nameExists})`);
      }
      return shouldMigrate;
    });
    
    console.log(`[migrate] 마이그레이션 대상: ${productsToMigrate.length}개`);
    
    if (productsToMigrate.length === 0) {
      console.log('[migrate] 마이그레이션할 상품이 없습니다. (모든 상품이 이미 API에 존재합니다)');
      return 0;
    }
    
    console.log(`[migrate] ${productsToMigrate.length}개 상품 마이그레이션 시작...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 각 상품을 API로 마이그레이션
    for (const product of productsToMigrate) {
      try {
        await api.createProduct({
          ...product,
          images: [] // 이미지 제거
        });
        successCount++;
        console.log(`[migrate] ✅ ${product.name} 마이그레이션 성공`);
      } catch (error) {
        failCount++;
        console.error(`[migrate] ❌ ${product.name} 마이그레이션 실패:`, error);
      }
    }
    
    console.log(`[migrate] 마이그레이션 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
    return successCount;
  } catch (error) {
    console.error('[migrate] 마이그레이션 오류:', error);
    throw error;
  }
};
