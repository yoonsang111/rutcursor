// 상품 타입 정의
// 판매처 예약 가능 여부 (상품 공개 여부와 따로 관리). 출처·확인 시각·범위를 함께 기록한다
export interface PartnerAvailability {
  status: 'available' | 'unavailable' | 'unknown';
  // unavailable: temporary_soldout 일시 품절 / sales_stopped 판매 중지 / sales_ended 판매 종료(근거 필수)
  // unknown: access_failed 접근 실패 / captcha / price_missing 가격 누락 / not_checked 미확인 / other
  reason?: string;
  scope?: { whole?: boolean; dates?: string[]; pax?: string[]; options?: string[] };
  source?: string;
  checkedAt?: string;
  evidence?: string;
}

// 공개 상태: draft 초안(관리자만) / published 공개 / hidden 숨김 / needs_classification 분류 필요(이전 때 근거 부족, 비공개)
export type PublishStatus = 'draft' | 'published' | 'hidden' | 'needs_classification';

export interface PartnerLink {
  partner: string;
  url: string;
  source: 'api' | 'manual';
  externalId?: string;
  price?: number;
  priceDisplay?: string;
  updatedAt?: string;
  availability?: PartnerAvailability;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  categories: string[];
  locations: string[];
  tags: string[];
  price?: number;
  minPrice?: number;
  salePrice?: number;
  rating?: number;
  reviewCount?: number;
  isRecommended: boolean;
  isAvailable: boolean; // 예전 호환: 공개(published)일 때만 true
  publishStatus?: PublishStatus;
  bookable?: 'available' | 'none' | 'unknown'; // 서버가 계산: none = 모든 판매처 판매 중지 확인
  views: number;
  partnerLinks: PartnerLink[];
  seo?: {
    title: string;
    description: string;
    keywords: string;
  };
}

export interface ProductFormData {
  name: string;
  description: string;
  images: string[];
  categories: string[];
  locations: string[];
  tags: string[];
  price?: number;
  minPrice?: number;
  salePrice?: number;
  rating?: number;
  reviewCount?: number;
  isRecommended: boolean;
  isAvailable: boolean;
  publishStatus?: PublishStatus;
  partnerLinks: PartnerLink[];
}
