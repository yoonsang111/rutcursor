// API 유틸리티 (어드민용)

// 환경 변수에서 API URL 가져오기 (없으면 운영 API 기본값 사용)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.tourstream.kr/api';

const nowIso = () => new Date().toISOString();

const toSafeString = (value: unknown) => String(value || '').trim();
const isNotNull = <T>(value: T | null): value is T => value !== null;

const toLegacyId = (prefix: string, name: string, index: number) => {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '');
  return `${prefix}_${slug || index}`;
};

const COUNTRY_NAME_SET = new Set([
  '한국',
  '일본',
  '중국',
  '홍콩',
  '마카오',
  '대만',
  '싱가포르',
  '태국',
  '베트남',
  '말레이시아',
  '미국',
  '프랑스',
  '이탈리아',
  '스페인',
  '독일',
]);

const normalizeMainCategories = (input: unknown) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      if (typeof item === 'string') {
        const name = toSafeString(item);
        if (!name) return null;
        return {
          id: toLegacyId('main_cat_legacy', name, index),
          name,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
      }
      if (item && typeof item === 'object') {
        const name = toSafeString((item as any).name);
        if (!name) return null;
        return {
          id: toSafeString((item as any).id) || toLegacyId('main_cat_legacy', name, index),
          name,
          createdAt: toSafeString((item as any).createdAt) || nowIso(),
          updatedAt: toSafeString((item as any).updatedAt) || nowIso(),
        };
      }
      return null;
    })
    .filter(isNotNull);
};

const normalizeSubCategories = (input: unknown, validMainIds: Set<string>) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const name = toSafeString((item as any).name);
      const mainCategoryId = toSafeString((item as any).mainCategoryId);
      if (!name || !mainCategoryId || !validMainIds.has(mainCategoryId)) return null;
      return {
        id: toSafeString((item as any).id) || toLegacyId('sub_cat_legacy', name, index),
        name,
        mainCategoryId,
        createdAt: toSafeString((item as any).createdAt) || nowIso(),
        updatedAt: toSafeString((item as any).updatedAt) || nowIso(),
      };
    })
    .filter(isNotNull);
};

const buildSubCategoryParentMap = (products: any[], mainByName: Map<string, string>) => {
  const result = new Map<string, string>();
  products.forEach((product) => {
    const categories = Array.isArray(product?.categories)
      ? product.categories.map((item: unknown) => toSafeString(item)).filter(Boolean)
      : [];
    if (categories.length < 2) return;
    const mainCandidate = categories.find((name: string) => mainByName.has(name.toLowerCase()));
    if (!mainCandidate) return;
    const mainId = mainByName.get(mainCandidate.toLowerCase());
    if (!mainId) return;
    categories.forEach((name: string) => {
      if (name === mainCandidate) return;
      if (!result.has(name.toLowerCase())) {
        result.set(name.toLowerCase(), mainId);
      }
    });
  });
  return result;
};

// 서버에서 이미 object 형태로 반환하므로 이 함수는 레거시 데이터 안전망으로만 사용
const buildRegionCountryMapLegacy = (products: any[], countryByName: Map<string, string>) => {
  const result = new Map<string, string>();
  products.forEach((product) => {
    const locations = Array.isArray(product?.locations)
      ? product.locations.map((item: unknown) => toSafeString(item)).filter(Boolean)
      : [];
    if (locations.length < 2) return;
    const knownCountry = locations.find((name: string) => COUNTRY_NAME_SET.has(name));
    const explicitCountry = locations.find((name: string) => countryByName.has(name.toLowerCase()));
    const detectedCountry = knownCountry || explicitCountry || locations[0];
    const countryId = countryByName.get(detectedCountry.toLowerCase());
    if (!countryId) return;
    locations.forEach((name: string) => {
      if (name === detectedCountry) return;
      if (countryByName.has(name.toLowerCase()) && COUNTRY_NAME_SET.has(name)) return;
      if (!result.has(name.toLowerCase())) {
        result.set(name.toLowerCase(), countryId);
      }
    });
  });
  return result;
};

const normalizeCountries = (input: unknown) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      if (typeof item === 'string') {
        const name = toSafeString(item);
        if (!name) return null;
        return {
          id: toLegacyId('country_legacy', name, index),
          name,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
      }
      if (item && typeof item === 'object') {
        const name = toSafeString((item as any).name);
        if (!name) return null;
        return {
          id: toSafeString((item as any).id) || toLegacyId('country_legacy', name, index),
          name,
          image: toSafeString((item as any).image) || undefined,
          createdAt: toSafeString((item as any).createdAt) || nowIso(),
          updatedAt: toSafeString((item as any).updatedAt) || nowIso(),
        };
      }
      return null;
    })
    .filter(isNotNull);
};

const normalizeRegions = (input: unknown, validCountryIds: Set<string>) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const name = toSafeString((item as any).name);
      const countryId = toSafeString((item as any).countryId);
      if (!name || !countryId || !validCountryIds.has(countryId)) return null;
      return {
        id: toSafeString((item as any).id) || toLegacyId('region_legacy', name, index),
        name,
        countryId,
        image: toSafeString((item as any).image) || undefined,
        createdAt: toSafeString((item as any).createdAt) || nowIso(),
        updatedAt: toSafeString((item as any).updatedAt) || nowIso(),
      };
    })
    .filter(isNotNull);
};


const normalizeProducts = (input: unknown) => {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const source = item as any;
      return {
        ...source,
        id: toSafeString(source.id),
      };
    })
    .filter((item) => item.id);
};

export const api = {
  // Products
  getProducts: async () => {
    try {
      console.log('[API] 상품 목록 요청:', `${API_BASE_URL}/products`);
      const response = await fetch(`${API_BASE_URL}/products`);
      console.log('[API] 응답 상태:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
        console.error('[API] 응답 오류:', error);
        throw new Error(`상품 목록을 불러올 수 없습니다: ${error.error || response.statusText}`);
      }
      
      const products = normalizeProducts(await response.json());
      console.log('[API] 상품 로드 성공:', products.length, '개');
      return products;
    } catch (error: any) {
      console.error('[API] getProducts 오류:', error);
      if (error.message) throw error;
      throw new Error('API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
  },

  getProduct: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('상품을 불러올 수 없습니다');
    const product = await response.json();
    return { ...product, id: toSafeString((product as any)?.id) };
  },

  createProduct: async (product: Omit<any, 'id' | 'views'>) => {
    try {
      console.log('[API] 상품 등록 요청:', product.name);
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      console.log('[API] 등록 응답 상태:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
        console.error('[API] 등록 응답 오류:', error);
        throw new Error(`상품을 등록할 수 없습니다: ${error.error || response.statusText}`);
      }
      
      const createdProduct = await response.json();
      console.log('[API] 상품 등록 성공:', createdProduct.id, createdProduct.name);
      return createdProduct;
    } catch (error: any) {
      console.error('[API] createProduct 오류:', error);
      if (error.message) throw error;
      throw new Error('API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
  },

  updateProduct: async (id: string, product: Partial<any>) => {
    const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = typeof errBody?.error === 'string' && errBody.error.trim()
        ? errBody.error
        : `상품을 수정할 수 없습니다 (${response.status})`;
      throw new Error(msg);
    }
    return response.json();
  },

  deleteProduct: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('상품을 삭제할 수 없습니다');
    return response.json();
  },

  getCounter: async () => {
    const response = await fetch(`${API_BASE_URL}/counter`);
    if (!response.ok) return { counter: 100000 };
    const data = await response.json();
    return data;
  },

  // Categories
  getCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) return { mainCategories: [], subCategories: [] };
    const raw = await response.json();

    // 서버가 이미 object 형태로 정규화해서 반환하므로 기본 검증만 수행
    const mainCategories = normalizeMainCategories((raw as any)?.mainCategories);
    const validMainIds = new Set(mainCategories.map((item: any) => item.id));
    const mainByName = new Map(mainCategories.map((item: any) => [item.name.toLowerCase(), item.id]));
    const rawSub = Array.isArray((raw as any)?.subCategories) ? (raw as any).subCategories : [];

    let subCategories = normalizeSubCategories(rawSub, validMainIds);

    // 레거시 string subCategories 처리 (서버가 아직 이전 데이터를 가진 경우 안전망)
    const hasStringSub = rawSub.some((item: unknown) => typeof item === 'string');
    if (hasStringSub) {
      let products: any[] = [];
      try {
        const productsRes = await fetch(`${API_BASE_URL}/products`);
        if (productsRes.ok) products = await productsRes.json();
      } catch { products = []; }

      const subParentMap = buildSubCategoryParentMap(products, mainByName);
      const fallbackMainId = mainCategories[0]?.id;
      const fromString = rawSub
        .map((item: unknown, index: number) => {
          if (typeof item !== 'string') return null;
          const name = toSafeString(item);
          if (!name) return null;
          const parentId = subParentMap.get(name.toLowerCase()) || fallbackMainId;
          if (!parentId) return null;
          return { id: toLegacyId('sub_cat_legacy', name, index), name, mainCategoryId: parentId, createdAt: nowIso(), updatedAt: nowIso() };
        })
        .filter(isNotNull);
      subCategories = [...subCategories, ...fromString];
    }

    const dedupSub = new Map<string, any>();
    subCategories.forEach((item: any) => {
      const key = `${item.mainCategoryId}::${item.name.toLowerCase()}`;
      if (!dedupSub.has(key)) dedupSub.set(key, item);
    });

    return { mainCategories, subCategories: Array.from(dedupSub.values()) };
  },

  saveCategories: async (categories: any) => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories)
    });
    if (!response.ok) throw new Error('카테고리를 저장할 수 없습니다');
    return response.json();
  },

  // Locations
  getLocations: async () => {
    const response = await fetch(`${API_BASE_URL}/locations`);
    if (!response.ok) return { countries: [], regions: [] };
    const raw = await response.json();

    // 서버가 이미 object 형태로 정규화해서 반환하므로 기본 검증만 수행
    const countries = normalizeCountries((raw as any)?.countries);
    const countryByName = new Map(countries.map((item: any) => [item.name.toLowerCase(), item.id]));
    const validCountryIds = new Set(countries.map((item: any) => item.id));
    const rawRegions = Array.isArray((raw as any)?.regions) ? (raw as any).regions : [];

    let regions = normalizeRegions(rawRegions, validCountryIds);

    // 레거시 string regions 처리 (서버가 아직 이전 데이터를 가진 경우 안전망)
    const hasStringRegion = rawRegions.some((item: unknown) => typeof item === 'string');
    if (hasStringRegion) {
      let products: any[] = [];
      try {
        const productsRes = await fetch(`${API_BASE_URL}/products`);
        if (productsRes.ok) products = await productsRes.json();
      } catch { products = []; }

      const regionCountryMap = buildRegionCountryMapLegacy(products, countryByName);
      const fallbackCountryId = countries[0]?.id;
      const fromString = rawRegions
        .map((item: unknown, index: number) => {
          if (typeof item !== 'string') return null;
          const name = toSafeString(item);
          if (!name || countryByName.has(name.toLowerCase())) return null;
          const countryId = regionCountryMap.get(name.toLowerCase()) || fallbackCountryId;
          if (!countryId) return null;
          return { id: toLegacyId('region_legacy', name, index), name, countryId, createdAt: nowIso(), updatedAt: nowIso() };
        })
        .filter(isNotNull);
      regions = [...regions, ...fromString];
    }

    const dedupRegions = new Map<string, any>();
    regions.forEach((item: any) => {
      const key = `${item.countryId}::${item.name.toLowerCase()}`;
      if (!dedupRegions.has(key)) dedupRegions.set(key, item);
    });

    return { countries, regions: Array.from(dedupRegions.values()) };
  },

  saveLocations: async (locations: any) => {
    const response = await fetch(`${API_BASE_URL}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locations)
    });
    if (!response.ok) throw new Error('지역을 저장할 수 없습니다');
    return response.json();
  },

  // Partner integrations
  searchPartnerProducts: async (partner: string, keyword: string) => {
    const params = new URLSearchParams({ partner, keyword });
    const response = await fetch(`${API_BASE_URL}/admin/partner-search?${params.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || '파트너 상품 검색에 실패했습니다');
    }
    const data = await response.json();
    return (data.results || []) as Array<{
      externalId: string;
      name: string;
      price?: number;
      priceDisplay?: string;
      url: string;
      thumbnail?: string;
      rating?: number;
      reviewCount?: number;
    }>;
  },

  createPartnerTrackedLink: async (partner: string, url: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/partner-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner, url }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || '추적 링크 생성에 실패했습니다');
    }
    const data = await response.json();
    return data.url as string;
  },
};
