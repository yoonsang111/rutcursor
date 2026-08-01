// 로컬스토리지 유틸리티

const STORAGE_KEYS = {
  PRODUCTS: 'tourstream_products',
  DELETED_PRODUCTS: 'tourstream_deleted_products', // 삭제된 상품 추적용
  PRODUCT_COUNTER: 'tourstream_product_counter', // 다음 상품 번호
  MAIN_CATEGORIES: 'tourstream_main_categories',
  SUB_CATEGORIES: 'tourstream_sub_categories',
  COUNTRIES: 'tourstream_countries',
  REGIONS: 'tourstream_regions',
  AUTH: 'tourstream_auth',
  VISITORS: 'tourstream_visitors',
} as const;

export const storage = {
  // Products
  getProducts: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },
  saveProducts: (products: any[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  // Deleted Products (삭제된 상품 추적)
  getDeletedProducts: () => {
    const data = localStorage.getItem(STORAGE_KEYS.DELETED_PRODUCTS);
    return data ? JSON.parse(data) : [];
  },
  saveDeletedProduct: (product: any) => {
    const deleted = storage.getDeletedProducts();
    deleted.push(product);
    localStorage.setItem(STORAGE_KEYS.DELETED_PRODUCTS, JSON.stringify(deleted));
  },

  // Product Counter (다음 상품 번호)
  getProductCounter: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCT_COUNTER);
    return data ? parseInt(data, 10) : 100000; // 100000부터 시작 (100001이 첫 번째)
  },
  incrementProductCounter: () => {
    const current = storage.getProductCounter();
    const next = current + 1;
    localStorage.setItem(STORAGE_KEYS.PRODUCT_COUNTER, next.toString());
    return next;
  },

  // Main Categories
  getMainCategories: () => {
    const data = localStorage.getItem(STORAGE_KEYS.MAIN_CATEGORIES);
    return data ? JSON.parse(data) : [];
  },
  saveMainCategories: (categories: any[]) => {
    localStorage.setItem(STORAGE_KEYS.MAIN_CATEGORIES, JSON.stringify(categories));
  },

  // Sub Categories
  getSubCategories: () => {
    const data = localStorage.getItem(STORAGE_KEYS.SUB_CATEGORIES);
    return data ? JSON.parse(data) : [];
  },
  saveSubCategories: (categories: any[]) => {
    localStorage.setItem(STORAGE_KEYS.SUB_CATEGORIES, JSON.stringify(categories));
  },

  // Countries
  getCountries: () => {
    const data = localStorage.getItem(STORAGE_KEYS.COUNTRIES);
    return data ? JSON.parse(data) : [];
  },
  saveCountries: (countries: any[]) => {
    localStorage.setItem(STORAGE_KEYS.COUNTRIES, JSON.stringify(countries));
  },

  // Regions
  getRegions: () => {
    const data = localStorage.getItem(STORAGE_KEYS.REGIONS);
    return data ? JSON.parse(data) : [];
  },
  saveRegions: (regions: any[]) => {
    localStorage.setItem(STORAGE_KEYS.REGIONS, JSON.stringify(regions));
  },

  // Auth
  getAuth: () => {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH);
    return data ? JSON.parse(data) : null;
  },
  saveAuth: (auth: any) => {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
  },
  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },

  // Visitors (통계용)
  getVisitors: () => {
    const data = localStorage.getItem(STORAGE_KEYS.VISITORS);
    return data ? JSON.parse(data) : { count: 0, lastUpdated: new Date().toISOString() };
  },
  incrementVisitors: () => {
    const visitors = storage.getVisitors();
    visitors.count += 1;
    visitors.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(visitors));
    return visitors.count;
  },
};
