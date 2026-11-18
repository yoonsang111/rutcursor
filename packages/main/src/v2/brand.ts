import { Product } from "./data";

/** 나라 이름 → 국기 그림 (packages/main/public/flags). 모르는 나라는 빈 값 */
const FLAG_BY_COUNTRY: Record<string, string> = {
  일본: "jp",
  태국: "th",
  베트남: "vn",
  대만: "tw",
  홍콩: "hk",
  싱가포르: "sg",
  마카오: "mo",
  중국: "cn",
  한국: "kr",
  미국: "us",
  프랑스: "fr",
  이탈리아: "it",
  말레이시아: "my",
  필리핀: "ph",
  인도네시아: "id",
  영국: "gb",
  스페인: "es",
  아랍에미리트: "ae",
};

export function flagSrc(countryName?: string): string {
  const code = countryName ? FLAG_BY_COUNTRY[countryName.trim()] : undefined;
  return code ? `/flags/${code}.png` : "";
}

/** 판매처 이름 → 로고 그림 (packages/main/public/partners) */
const LOGO_BY_PARTNER: Record<string, string> = {
  마이리얼트립: "myrealtrip",
  myrealtrip: "myrealtrip",
  klook: "klook",
  클룩: "klook",
  kkday: "kkday",
  케이케이데이: "kkday",
  getyourguide: "getyourguide",
  겟유어가이드: "getyourguide",
  트립닷컴: "trip",
  "trip.com": "trip",
  tripcom: "trip",
  와그: "waug",
  waug: "waug",
};

export function partnerLogoSrc(partnerName?: string): string {
  if (!partnerName) return "";
  const key = partnerName.trim().toLowerCase().replace(/\s+/g, "");
  const file = LOGO_BY_PARTNER[partnerName.trim()] || LOGO_BY_PARTNER[key];
  return file ? `/partners/${file}.png` : "";
}

/**
 * 판매처가 주는 값은 "성인 1인 정가"가 아니라 상품 페이지에 찍히는 "○○원~"(최저 옵션가)다.
 * 그래서 두 판매처가 서로 다른 옵션(1일권 vs 7일권 같은)을 기준으로 값을 줄 때가 있고,
 * 그러면 차이가 비현실적으로 크게 나온다. 그 경우를 할인으로 보여 주면 손님을 속이게 된다.
 * 차이가 이 비율을 넘으면 "같은 것을 비교한 게 아니다"로 보고 할인율·취소선을 감춘다.
 */
const MAX_TRUSTED_OFF = 50;

export interface PriceSpread {
  /** 값을 아는 판매처 중 가장 싼 값 */
  low?: number;
  /** 값을 아는 판매처 중 가장 비싼 값 (low 와 같으면 undefined) */
  high?: number;
  /** high 대비 할인율 (%). 차이가 없으면 0 */
  off: number;
  /** high - low */
  gap: number;
  /** 링크가 살아 있는 판매처 수 */
  sellerCount: number;
  lowPartner?: string;
  highPartner?: string;
}

/**
 * 한 상품의 판매처 가격을 훑어 최저/최고를 뽑는다.
 * 판매 중지(state === "stopped")와 링크 없는 판매처는 세지 않는다.
 */
export function priceSpread(product: Pick<Product, "partnerLinks">): PriceSpread {
  const live = product.partnerLinks.filter((l) => l.url && l.state !== "stopped");
  const priced = live.filter((l) => typeof l.price === "number" && l.price > 0);

  if (priced.length === 0) return { off: 0, gap: 0, sellerCount: live.length };

  let lo = priced[0];
  let hi = priced[0];
  priced.forEach((l) => {
    if (l.price! < lo.price!) lo = l;
    if (l.price! > hi.price!) hi = l;
  });

  const low = lo.price!;
  const high = hi.price!;
  const rawGap = high - low;
  const off = rawGap > 0 ? Math.round((rawGap / high) * 100) : 0;
  const trusted = rawGap > 0 && off <= MAX_TRUSTED_OFF;

  return {
    low,
    high: trusted ? high : undefined,
    off: trusted ? off : 0,
    gap: trusted ? rawGap : 0,
    sellerCount: live.length,
    lowPartner: lo.name,
    highPartner: trusted ? hi.name : undefined,
  };
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 목록 정렬. 값을 모르는 상품은 늘 뒤로 민다. */
export function sortProducts<T extends { popularityScore: number; views: number; partnerLinks: Product["partnerLinks"] }>(
  list: T[],
  sort: "popular" | "priceAsc" | "off",
): T[] {
  const copy = list.slice();
  if (sort === "popular") return copy.sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views);
  if (sort === "priceAsc")
    return copy.sort((a, b) => (priceSpread(a).low ?? Infinity) - (priceSpread(b).low ?? Infinity));
  return copy.sort((a, b) => priceSpread(b).off - priceSpread(a).off);
}
