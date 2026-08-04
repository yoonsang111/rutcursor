// API 유틸리티 (메인용)
// 우선순위:
// 1) REACT_APP_API_URL 명시값
// 2) 로컬 호스트면 local-beta API (실패 시 운영 API로 자동 폴백)
// 3) 그 외(운영/실서버)는 운영 API
const PROD_API_BASE_URL = 'https://api.tourstream.kr/api';
const LOCAL_API_BASE_URL = 'http://localhost:3102/api';

const resolveApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return LOCAL_API_BASE_URL;
    }
    return PROD_API_BASE_URL;
  }

  return PROD_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrl();
const IS_LOCAL = API_BASE_URL !== PROD_API_BASE_URL;

async function fetchWithFallback(path: string, options?: RequestInit): Promise<Response | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-cache', mode: 'cors', ...options });
    if (response.ok) return response;
  } catch {
    // 로컬 API 연결 실패 시 폴백
  }

  if (IS_LOCAL) {
    console.warn(`[api] 로컬 API(${API_BASE_URL}) 응답 없음 → 운영 API로 폴백합니다.`);
    try {
      const fallback = await fetch(`${PROD_API_BASE_URL}${path}`, { cache: 'no-cache', mode: 'cors', ...options });
      if (fallback.ok) return fallback;
    } catch {
      // 운영 API도 실패
    }
  }

  return null;
}

export const api = {
  // Products
  getProducts: async () => {
    try {
      const response = await fetchWithFallback('/products');
      if (!response) return [];
      return response.json();
    } catch (error: any) {
      console.warn('[api] 상품 목록을 불러올 수 없습니다:', error);
      return [];
    }
  },

  getProduct: async (id: string) => {
    try {
      const response = await fetchWithFallback(`/products/${id}`);
      if (!response) return null;
      return response.json();
    } catch (error) {
      console.warn('[api] 상품을 불러올 수 없습니다:', error);
      return null;
    }
  },

  incrementProductView: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}/view`, { method: 'POST' });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.warn('[api] 조회수 증가에 실패했습니다:', error);
      return null;
    }
  },

  getCategories: async () => {
    try {
      const response = await fetchWithFallback('/categories');
      if (!response) return { mainCategories: [], subCategories: [] };
      return response.json();
    } catch (error) {
      console.warn("[api] 카테고리를 불러올 수 없습니다:", error);
      return { mainCategories: [], subCategories: [] };
    }
  },

  getLocations: async () => {
    try {
      const response = await fetchWithFallback('/locations');
      if (!response) return { countries: [], regions: [] };
      return response.json();
    } catch (error) {
      console.warn("[api] 지역 정보를 불러올 수 없습니다:", error);
      return { countries: [], regions: [] };
    }
  },

  searchFlightAirports: async (keyword: string): Promise<FlightAirport[]> => {
    try {
      const response = await fetchWithFallback(`/flights/airports?keyword=${encodeURIComponent(keyword)}`);
      if (!response) return [];
      const data = await response.json();
      return Array.isArray(data.airports) ? data.airports : [];
    } catch (error) {
      console.warn('[api] 공항 검색에 실패했습니다:', error);
      return [];
    }
  },

  getFlightSearchLink: async (params: FlightSearchParams): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/flights/search-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return typeof data.url === 'string' ? data.url : null;
    } catch (error) {
      console.warn('[api] 항공권 검색 링크 생성에 실패했습니다:', error);
      return null;
    }
  },
};

export interface FlightAirport {
  code: string;
  name: string;
  cityName?: string;
  countryName?: string;
}

export interface FlightSearchParams {
  depAirportCd: string;
  arrAirportCd: string;
  tripTypeCd: 'OW' | 'RT' | 'MT';
  depDate?: string;
  arrDate?: string;
  adult?: number;
  child?: number;
  infant?: number;
  cabinClass?: 'FIRST' | 'BUSINESS' | 'PREMIUM_ECONOMY' | 'ECONOMY';
}
