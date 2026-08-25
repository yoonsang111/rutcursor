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

  async refreshPrice(externalId) {
    const today = new Date().toISOString().slice(0, 10);
    const data = await myrealtrip.getTourTicketOptions(externalId, today);
    const options = Array.isArray(data?.options) ? data.options : [];
    const prices = options
      .map((option) => Number(option.salePrice))
      .filter((price) => Number.isFinite(price) && price > 0);
    if (prices.length === 0) return null;
    // 단순 최저가를 쓰면 마이리얼트립 옵션 중 이름은 비슷한데 가격만 비정상적으로 낮은
    // 이상치 옵션 하나 때문에 실제 판매가와 동떨어진 가격이 뽑힐 수 있어서,
    // 옵션들 중 가장 많이 등장하는(가장 대표적인) 가격을 사용한다. 동률이면 더 저렴한 쪽 선택.
    const counts = new Map();
    for (const p of prices) {
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    const [price] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    return { price, priceDisplay: `${price.toLocaleString('ko-KR')}원` };
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
