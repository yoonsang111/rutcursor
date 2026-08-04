const BASE_URL = 'https://partner-ext-api.myrealtrip.com';

const getApiKey = () => {
  const key = process.env.MYREALTRIP_API_KEY;
  if (!key) throw new Error('MYREALTRIP_API_KEY 환경변수가 설정되지 않았습니다');
  return key;
};

const request = async (method, endpoint, body) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.result?.message || res.statusText;
    throw new Error(`마이리얼트립 API 오류 (${res.status}): ${message}`);
  }
  return json.data;
};

// 도시별 투어/티켓 카테고리 목록
export const getTourTicketCategories = (city) =>
  request('POST', '/v1/products/tna/categories', { city });

// 투어/티켓/액티비티 상품 검색
export const searchTourTickets = ({ keyword, category, minPrice, maxPrice, sort, page, size }) =>
  request('POST', '/v1/products/tna/search', {
    keyword,
    ...(category ? { category } : {}),
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    ...(sort ? { sort } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(size !== undefined ? { size } : {}),
  });

// 상품 상세
export const getTourTicketDetail = (gid) =>
  request('POST', '/v1/products/tna/detail', { gid });

// 특정 날짜의 예약 가능 옵션/가격
export const getTourTicketOptions = (gid, selectedDate) =>
  request('POST', '/v1/products/tna/options', { gid, selectedDate });

// 마이리얼트립 URL을 트래킹용 단축 링크로 변환
export const createMyLink = (targetUrl) =>
  request('POST', '/v1/mylink', { targetUrl });

// 항공권: 키워드로 공항/도시 자동완성 (응답의 airport.code를 출발/도착 입력값으로 사용)
export const searchFlightAirports = (keyword, size) =>
  request('POST', '/v1/products/flight/airport-autocomplete', {
    keyword,
    ...(size !== undefined ? { size } : {}),
  });

// 항공권: 운임 조회 랜딩 URL 생성 (이 URL을 createMyLink의 targetUrl로 다시 넘기면 추적 가능한 단축링크가 됨)
export const getFlightFareQueryLandingUrl = ({
  depAirportCd,
  arrAirportCd,
  tripTypeCd,
  depDate,
  arrDate,
  adult,
  child,
  infant,
  airline,
  cabinClass,
}) =>
  request('POST', '/v1/products/flight/fare-query-landing-url', {
    depAirportCd,
    arrAirportCd,
    tripTypeCd,
    ...(depDate ? { depDate } : {}),
    ...(arrDate ? { arrDate } : {}),
    ...(adult !== undefined ? { adult } : {}),
    ...(child !== undefined ? { child } : {}),
    ...(infant !== undefined ? { infant } : {}),
    ...(airline ? { airline } : {}),
    ...(cabinClass ? { cabinClass } : {}),
  });
