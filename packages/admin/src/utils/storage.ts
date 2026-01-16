// 로컬스토리지 유틸리티

const STORAGE_KEYS = {
  PRODUCTS: 'tourstream_products',
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
