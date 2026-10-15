// 상품 타입 정의
// 판매처 예약 가능 여부 (상품 공개 여부와 따로 관리). 출처·확인 시각·범위를 함께 기록한다
export interface PartnerAvailability {
  status: 'available' | 'unavailable' | 'unknown';
  // unavailable: temporary_soldout 일시 품절 / sales_stopped 판매 중지 / sales_ended 판매 종료(근거 필수)
  // unknown: access_failed 접근 실패 / captcha / price_missing 가격 누락 / not_checked 미확인 / other
  reason?: string;
  scope?: { whole?: boolean; dates?: string[]; pax?: string[]; options?: string[] };
  source?: string;
  checkedAt?: string; // 판매처를 실제로 확인한 시각 (상태 변경·'지금 다시 확인함'에서만 바뀜)
  evidence?: string;
  updatedAt?: string; // 범위·근거 문구 같은 단순 수정 시각 (확인 시각과 따로)
}

// 공개 상태: draft 초안(관리자만) / published 공개 / hidden 숨김 / needs_classification 분류 필요(이전 때 근거 부족, 비공개)
export type PublishStatus = 'draft' | 'published' | 'hidden' | 'needs_classification';

export interface PartnerLink {
  partner: string;
  url: string;
  source: 'api' | 'manual';
  externalId?: string;
  price?: number | null; // 0보다 큰 실제 가격만 (null을 보내면 가격 삭제). 없으면 손님 화면에 '판매처에서 확인' (가격 비교·최저가에서 빠짐)
  priceCurrency?: string; // 통화 (KRW 등). 예전 가격은 비어 있을 수 있음 (원화로 등록됨)
  priceConditions?: string; // 가격 적용 조건 (예: 성인 1인, 2인 이상)
  priceCheckedAt?: string; // 가격을 확인한 시각 (모르면 비워 둠 — 지금 시각으로 채우지 않음)
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
  rev?: number; // 저장 번호 (서버가 저장마다 올림). 어드민은 불러온 번호를 baseRev로 보내 옛 화면 덮어쓰기를 막음
  // 공개 여부를 바꾼 뒤 정적 페이지·CDN 반영 상태 (관리자만 봄). pending = 반영 중, done = 다시 빌드·CDN 무효화 끝
  visibilitySync?: { state: 'pending' | 'done'; since: string; from: PublishStatus; to: PublishStatus; doneAt?: string };
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
