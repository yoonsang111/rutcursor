// 로컬스토리지 유틸리티 (메인 앱용)

const STORAGE_KEYS = {
  PRODUCTS: 'tourstream_products',
  MAIN_CATEGORIES: 'tourstream_main_categories',
  SUB_CATEGORIES: 'tourstream_sub_categories',
  COUNTRIES: 'tourstream_countries',
  REGIONS: 'tourstream_regions',
} as const;

export const storage = {
  // Products
  getProducts: () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },

  // Main Categories
  getMainCategories: () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.MAIN_CATEGORIES);
    return data ? JSON.parse(data) : [];
  },

  // Sub Categories
  getSubCategories: () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.SUB_CATEGORIES);
    return data ? JSON.parse(data) : [];
  },

  // Countries
  getCountries: () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.COUNTRIES);
    return data ? JSON.parse(data) : [];
  },

  // Regions
  getRegions: () => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.REGIONS);
    return data ? JSON.parse(data) : [];
  },
};
