import type { Product } from "../data";

// 쿠폰 적용 대상은 상품 id가 아니라 조건으로 저장한다.
// 상품이 늘어나도 쿠폰 데이터를 고치지 않아도 되도록 하기 위함.
export type CouponMatch = {
  type: "product" | "category" | "location" | "none";
  values?: string[];
  // category 타입에서 지역까지 좁히고 싶을 때 (예: 일본 버스만)
  locations?: string[];
};

export interface Coupon {
  id: string;
  partner: string;
  code: string;
  discount: string;
  label: string;
  description?: string;
  terms?: string;
  startsAt?: string;
  registerBy?: string;
  validUntil?: string;
  destinations?: string[];
  match: CouponMatch;
  landingUrl?: string;
  excludedListUrl?: string;
}

// 상품은 id만 들고 있어서 이름 비교를 하려면 변환표가 필요하다.
export interface CouponLookup {
  countryNameById: Map<string, string>;
  categoryNameById: Map<string, string>;
}

const includesAny = (haystack: string, needles?: string[]) =>
  (needles || []).some((n) => n && haystack.includes(n));

export function productMatchesCoupon(product: Product, coupon: Coupon, lookup: CouponLookup): boolean {
  const match = coupon?.match;
  if (!match || match.type === "none") return false;

  const countryName = lookup.countryNameById.get(product.countryId) || "";
  const locationText = `${countryName} ${product.region || ""}`;

  if (match.type === "product") return includesAny(product.name, match.values);
  if (match.type === "location") return includesAny(locationText, match.values);
  if (match.type === "category") {
    const categoryName = lookup.categoryNameById.get(product.categoryId) || "";
    if (!includesAny(categoryName, match.values)) return false;
    if (!match.locations || match.locations.length === 0) return true;
    return includesAny(locationText, match.locations);
  }
  return false;
}

export function productsForCoupon(products: Product[], coupon: Coupon, lookup: CouponLookup): Product[] {
  if (!coupon?.match || coupon.match.type === "none") return [];
  return products.filter((p) => productMatchesCoupon(p, coupon, lookup));
}

export function couponsForProduct(coupons: Coupon[], product: Product, lookup: CouponLookup): Coupon[] {
  return coupons.filter((c) => productMatchesCoupon(product, c, lookup));
}

// 마감일은 판매처가 적어둔 날짜(쿠폰 기준 시간대)를 그대로 보여준다.
// 한국 시각으로 환산하면 "10월 31일 23:59 GMT+8"이 "11월 1일"로 보여 사용자가 헷갈린다.
const deadlineParts = (coupon: Coupon) => {
  const raw = coupon?.registerBy || coupon?.validUntil || "";
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
};

// 등록 마감까지 남은 일수. 지났으면 음수.
export function daysLeft(coupon: Coupon, now = new Date()): number | null {
  const p = deadlineParts(coupon);
  if (!p) return null;
  const end = Date.UTC(p.year, p.month - 1, p.day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - today) / 86400000);
}

export function formatDeadline(coupon: Coupon): string {
  const p = deadlineParts(coupon);
  if (!p) return "";
  return `${p.month}월 ${p.day}일까지`;
}
