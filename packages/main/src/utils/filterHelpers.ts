// 필터링 헬퍼 함수들

// 카테고리 계층구조 매칭
export const matchesCategory = (productCategories: string[], selectedCategory: string): boolean => {
  if (selectedCategory === "전체") return true;
  if (!productCategories || productCategories.length === 0) {
    // 카테고리가 없는 상품은 "전체"일 때만 보임
    return false;
  }
  
  const match = productCategories.some(cat => 
    cat === selectedCategory || cat.includes(selectedCategory) || selectedCategory.includes(cat)
  );
  
  console.log('🔍 [filterHelpers] matchesCategory:', {
    productCategories,
    selectedCategory,
    match
  });
  
  return match;
};

// 지역 계층구조 매칭
export const matchesLocation = (productLocations: string[], selectedLocation: string): boolean => {
  if (selectedLocation === "전체") return true;
  if (!productLocations || productLocations.length === 0) {
    // 지역이 없는 상품은 "전체"일 때만 보임
    return false;
  }
  
  const match = productLocations.some(loc => 
    loc === selectedLocation || loc.includes(selectedLocation) || selectedLocation.includes(loc)
  );
  
  console.log('🔍 [filterHelpers] matchesLocation:', {
    productLocations,
    selectedLocation,
    match
  });
  
  return match;
};

// 카테고리 계층구조 가져오기
export const getCategoryHierarchy = (categoryName: string): string[] => {
  const hierarchy: string[] = [categoryName];
  // 필요시 계층 구조 확장
  return hierarchy;
};

// 지역 계층구조 가져오기
export const getLocationHierarchy = (locationName: string): string[] => {
  const hierarchy: string[] = [locationName];
  // 필요시 계층 구조 확장
  return hierarchy;
};
