export interface Country {
  id: string;
  name: string;
  englishName: string;
  image: string;
  regionCount: number;
  productCount: number;
  regions: string[];
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  countryId: string;
  region: string;
  categoryId: string;
  price: number;
  views: number;
  recentViews7d: number;
  recentViews30d: number;
  popularityScore: number;
  rating: number;
  reviews: number;
  image: string;
  url: string;
  // state: 판매처 예약 가능 여부 (available 가능 · partial 일부 날짜/옵션 품절 · stopped 판매 중지 확인 · unknown 확인 못 함)
  // stopped인 판매처는 url이 비어 있다 (예약 버튼을 막음). checkedAt·stale은 언제 확인했는지 (stale = 7일 넘은 예전 확인)
  partnerLinks: Array<{
    name: string;
    url: string;
    price?: number;
    priceDisplay?: string;
    priceNote?: string; // 가격 적용 조건 (예: 성인 1인)
    state?: "available" | "partial" | "stopped" | "unknown";
    checkedAt?: string;
    stale?: boolean;
    soldOutNote?: string;
  }>;
  // 상품의 예약 가능 여부: none = 모든 판매처의 판매 중지가 확인됨 (일반 목록·추천에서 빠지고 상세는 안내용)
  bookable: "available" | "none" | "unknown";
  tags: string[];
  isPopular: boolean;
  isRecommended: boolean;
}
