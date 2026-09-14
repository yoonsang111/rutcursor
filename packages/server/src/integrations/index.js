// 파트너 API 연동 공통 규격
//
// 새 파트너(KLOOK, GetYourGuide 등)를 추가할 때는 이 파일에 아래 규격을 만족하는
// 항목을 PARTNER_INTEGRATIONS에 등록하면 됨. 어드민 검색 엔드포인트/가격 갱신
// 배치는 이 규격에만 의존하므로 파트너별 원본 API 응답 차이는 여기서 흡수한다.
//
//   search(keyword) -> Promise<Array<{
//     externalId: string,
//     name: string,
//     price?: number,
//     priceDisplay?: string,
//     url: string,
//     thumbnail?: string,
//     rating?: number,
//     reviewCount?: number,
//   }>>
//   refreshPrice(externalId) -> Promise<{ price: number, priceDisplay: string } | null>
//   refreshRating(externalId) -> Promise<{ rating: number, reviewCount: number } | null>  (선택)
//   createTrackedLink(targetUrl) -> Promise<string>  (선택. 어필리에이트 단축링크 생성)

import * as myrealtrip from './myrealtrip.js';

// ── 대표가 선정 ───────────────────────────────────────────────────────────────
// 마이리얼트립 옵션 목록에는 두 가지 함정이 있다.
//  1) 자리표시자 가격: 성인·아동·시니어 옵션이 모두 같은 값(예: 86,649원)으로 찍혀 있고, 이 값이 전혀 다른
//     상품들에도 동일하게 나타난다. 실제 판매가가 아니다. "가장 많이 나오는 가격"을 고르면 정확히 이걸 집는다.
//  2) 아동/유아/시니어 옵션: 성인가보다 싸므로 최저가로 고르면 사용자가 결제 단계에서 더 비싼 값을 보게 된다(다크패턴).
// 그래서 (a) 여러 상품에 걸쳐 반복되는 가격은 자리표시자로 보고 제외하고, (b) 성인/일반 옵션만 대상으로,
// (c) 그중 최저가를 "성인 기준 최저가"로 쓴다.

// 아동·유아·시니어처럼 성인이 살 수 없는 옵션인지. 이름에 나이 범위가 있으면 상한/하한으로 판단한다.
export const isNonAdultOption = (name = '') => {
  const n = String(name);
  if (/아동|어린이|소아|유아|키즈|초중학생|초등|중학생|child|kid|infant|시니어|경로|senior/i.test(n)) return true;
  // "만4-12세", "만 3세 ~ 11세", "AGED 3-11", "aged 3 to 11" → 상한이 17세 이하면 아동
  const range = n.match(/(\d+)\s*세?\s*(?:-|~|to)\s*(\d+)\s*세/i) || n.match(/aged\s*(\d+)\s*(?:-|~|to)\s*(\d+)/i);
  if (range && Number(range[2]) <= 17) return true;
  // "만65세이상", "만 60세 이상", "AGED 60+" → 하한이 60세 이상이면 시니어
  const over = n.match(/만?\s*(\d+)\s*세\s*이상/) || n.match(/aged\s*(\d+)\s*\+/i);
  if (over && Number(over[1]) >= 60) return true;
  return false;
};

// options: [{ price, name }], sentinelPrices: 배치가 여러 상품에서 공통으로 발견한 자리표시자 가격들
export const pickRepresentativePrice = (options = [], sentinelPrices = new Set()) => {
  const valid = options.filter((o) => Number.isFinite(o.price) && o.price > 0 && !sentinelPrices.has(o.price));
  if (valid.length === 0) return null;

  // 같은 상품 안에서 성인 옵션과 아동/시니어 옵션이 원 단위까지 같은 가격이면 실제 가격이 아니라
  // 채워지지 않은 세부 옵션(자리표시자)이다. 실제 판매가는 연령별로 다르기 마련이라 이 규칙으로 걸러진다.
  const adultPrices = new Set(valid.filter((o) => !isNonAdultOption(o.name)).map((o) => o.price));
  const nonAdultPrices = new Set(valid.filter((o) => isNonAdultOption(o.name)).map((o) => o.price));
  const ageFlatPrices = new Set([...adultPrices].filter((p) => nonAdultPrices.has(p)));

  // 단, 전 옵션이 같은 가격인 균일가 상품일 수 있으니 걸러서 아무것도 안 남으면 원래대로 둔다
  let candidates = valid.filter((o) => !ageFlatPrices.has(o.price));
  if (candidates.length === 0) candidates = valid;

  const adult = candidates.filter((o) => !isNonAdultOption(o.name));
  const pool = adult.length > 0 ? adult : candidates;
  const price = Math.min(...pool.map((o) => o.price));
  return { price, priceDisplay: `${price.toLocaleString('ko-KR')}원` };
};

// 여러 상품의 옵션 가격을 모아, 서로 다른 상품 N개 이상에서 똑같이 나타나는 가격을 자리표시자로 판정한다.
// (실제 판매가가 원 단위까지 다른 상품과 겹칠 확률은 사실상 0)
export const detectSentinelPrices = (optionsByProduct = [], minProducts = 3) => {
  const productCountByPrice = new Map();
  optionsByProduct.forEach((options) => {
    new Set(options.map((o) => o.price)).forEach((price) => {
      productCountByPrice.set(price, (productCountByPrice.get(price) || 0) + 1);
    });
  });
  return new Set([...productCountByPrice.entries()].filter(([, count]) => count >= minProducts).map(([price]) => price));
};

const myrealtripIntegration = {
  displayName: '마이리얼트립',

  async search(keyword) {
    const data = await myrealtrip.searchTourTickets({ keyword, page: 1, size: 20 });
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((item) => ({
      externalId: String(item.gid),
      name: item.itemName,
      price: typeof item.salePrice === 'number' ? item.salePrice : undefined,
      priceDisplay: item.priceDisplay,
      url: item.productUrl,
      thumbnail: item.imageUrl,
      rating: item.reviewScore,
      reviewCount: item.reviewCount,
    }));
  },

  // 그날 예약 가능한 옵션들의 (가격, 이름)만 돌려준다. 대표가 선정은 pickRepresentativePrice 에서.
  async fetchPriceOptions(externalId) {
    const today = new Date().toISOString().slice(0, 10);
    const data = await myrealtrip.getTourTicketOptions(externalId, today);
    const options = Array.isArray(data?.options) ? data.options : [];
    return options
      .map((option) => ({ price: Number(option.salePrice), name: String(option.name || '') }))
      .filter((o) => Number.isFinite(o.price) && o.price > 0);
  },

  // 단일 상품만 볼 때의 편의 함수. 배치는 여러 상품을 함께 봐서 자리표시자 가격을 걸러내므로
  // fetchPriceOptions + pickRepresentativePrice 를 직접 쓴다.
  async refreshPrice(externalId) {
    const options = await this.fetchPriceOptions(externalId);
    return pickRepresentativePrice(options);
  },

  async createTrackedLink(targetUrl) {
    const data = await myrealtrip.createMyLink(targetUrl);
    return data?.mylink || targetUrl;
  },

  async refreshRating(externalId) {
    const detail = await myrealtrip.getTourTicketDetail(externalId);
    const rating = Number(detail?.reviewScore);
    const reviewCount = Number(detail?.reviewCount);
    if (!Number.isFinite(rating) || rating <= 0 || !Number.isFinite(reviewCount) || reviewCount <= 0) return null;
    return { rating: Math.round(rating * 10) / 10, reviewCount };
  },

  // 항공권 전용: 투어/티켓과 API 모양이 달라 공통 규격에는 넣지 않고 별도 메서드로 노출
  async searchFlightAirports(keyword) {
    const data = await myrealtrip.searchFlightAirports(keyword, 10);
    const airports = Array.isArray(data?.airports) ? data.airports : [];
    return airports.map((entry) => ({
      code: entry.airport?.code,
      name: entry.airport?.koName,
      cityName: entry.city?.koName,
      countryName: entry.country?.koName,
    }));
  },

  async createFlightSearchLink(params) {
    const landingUrl = await myrealtrip.getFlightFareQueryLandingUrl(params);
    if (!landingUrl || typeof landingUrl !== 'string') {
      throw new Error('항공 운임 조회 랜딩 URL을 받지 못했습니다');
    }
    const linkData = await myrealtrip.createMyLink(landingUrl);
    return linkData?.mylink || landingUrl;
  },
};

// KLOOK/KKday는 검색·가격 조회 API가 없고, 어필리에이트 링크가 "원본 URL + 고정 쿼리파라미터"
// 형태라서 API 호출 없이 URL을 조립하는 것만으로 트래킹 링크를 만들 수 있음.
const klookIntegration = {
  displayName: 'KLOOK',

  async createTrackedLink(targetUrl) {
    const url = new URL(targetUrl);
    // s.klook.com(모바일 공유 링크)은 트래킹되지 않으므로 www.klook.com으로 정규화
    if (url.hostname === 's.klook.com') {
      url.hostname = 'www.klook.com';
    }
    url.searchParams.set('aid', '65706');
    return url.toString();
  },
};

const kkdayIntegration = {
  displayName: 'KKday',

  async createTrackedLink(targetUrl) {
    const url = new URL(targetUrl);
    url.searchParams.set('cid', '19400');
    return url.toString();
  },
};

export const PARTNER_INTEGRATIONS = {
  myrealtrip: myrealtripIntegration,
  klook: klookIntegration,
  kkday: kkdayIntegration,
};

export const getPartnerIntegration = (partnerKey) => {
  const integration = PARTNER_INTEGRATIONS[partnerKey];
  if (!integration) throw new Error(`알 수 없는 파트너입니다: ${partnerKey}`);
  return integration;
};
