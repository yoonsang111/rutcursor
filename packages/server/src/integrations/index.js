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
    const price = Math.min(...prices);
    return { price, priceDisplay: `${price.toLocaleString('ko-KR')}원` };
  },

  async createTrackedLink(targetUrl) {
    const data = await myrealtrip.createMyLink(targetUrl);
    return data?.mylink || targetUrl;
  },
};

export const PARTNER_INTEGRATIONS = {
  myrealtrip: myrealtripIntegration,
};

export const getPartnerIntegration = (partnerKey) => {
  const integration = PARTNER_INTEGRATIONS[partnerKey];
  if (!integration) throw new Error(`알 수 없는 파트너입니다: ${partnerKey}`);
  return integration;
};
