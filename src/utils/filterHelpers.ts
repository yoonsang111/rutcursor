import { storage } from "./storage";

// 계층구조 필터링 헬퍼 함수들

export const getCategoryHierarchy = (categoryName: string): string[] => {
  if (categoryName === "전체") return [];
  
  const mainCategories = storage.getMainCategories();
  const subCategories = storage.getSubCategories();
  
  const mainCat = mainCategories.find(cat => cat.name === categoryName);
  if (!mainCat) return [categoryName]; // 대분류가 아니면 그냥 이름만 반환
  
  // 대분류인 경우, 해당 대분류의 모든 소분류 이름도 포함
  const subCatNames = subCategories
    .filter(sub => sub.mainCategoryId === mainCat.id)
    .map(sub => sub.name);
  
  return [categoryName, ...subCatNames];
};

export const getLocationHierarchy = (locationName: string): string[] => {
  if (locationName === "전체") return [];
  
  const countries = storage.getCountries();
  const regions = storage.getRegions();
  
  const country = countries.find(c => c.name === locationName);
  if (!country) return [locationName]; // 국가가 아니면 그냥 이름만 반환
  
  // 국가인 경우, 해당 국가의 모든 지역 이름도 포함
  const regionNames = regions
    .filter(region => region.countryId === country.id)
    .map(region => region.name);
  
  return [locationName, ...regionNames];
};

// 상품이 카테고리와 매칭되는지 확인 (계층구조 고려)
export const matchesCategory = (productCategories: string[], selectedCategory: string): boolean => {
  if (selectedCategory === "전체") return true;
  
  const categoryHierarchy = getCategoryHierarchy(selectedCategory);
  return productCategories.some(category => 
    categoryHierarchy.includes(category)
  );
};

// 상품이 지역과 매칭되는지 확인 (계층구조 고려)
export const matchesLocation = (productLocations: string[], selectedLocation: string): boolean => {
  if (selectedLocation === "전체") return true;
  
  const locationHierarchy = getLocationHierarchy(selectedLocation);
  return productLocations.some(location => 
    locationHierarchy.some(hierLocation => 
      location === hierLocation || location.includes(hierLocation)
    )
  );
};
