// 쿠폰 적용 조건과 마감일 계산 자가 점검.
// 실행: node packages/main/src/v2/utils/coupons.check.mjs
// (TS 파일을 그대로 못 읽으므로 같은 규칙을 복제한다. coupons.ts 를 고치면 여기도 맞출 것)
import assert from 'assert';

const includesAny = (hay, needles) => (needles || []).some((n) => n && hay.includes(n));

const matches = (product, coupon, lookup) => {
  const m = coupon.match;
  if (!m || m.type === 'none') return false;
  const country = lookup.countryNameById.get(product.countryId) || '';
  const locationText = `${country} ${product.region || ''}`;
  if (m.type === 'product') return includesAny(product.name, m.values);
  if (m.type === 'location') return includesAny(locationText, m.values);
  if (m.type === 'category') {
    const cat = lookup.categoryNameById.get(product.categoryId) || '';
    if (!includesAny(cat, m.values)) return false;
    if (!m.locations || m.locations.length === 0) return true;
    return includesAny(locationText, m.locations);
  }
  return false;
};

const deadlineParts = (c) => {
  const raw = c.registerBy || c.validUntil || '';
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { year: +m[1], month: +m[2], day: +m[3] } : null;
};
const daysLeft = (c, now) => {
  const p = deadlineParts(c);
  if (!p) return null;
  return Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
};
const formatDeadline = (c) => {
  const p = deadlineParts(c);
  return p ? `${p.month}월 ${p.day}일까지` : '';
};

const lookup = {
  countryNameById: new Map([['jp', '일본'], ['vn', '베트남'], ['fr', '프랑스']]),
  categoryNameById: new Map([['bus', '버스/이동'], ['ticket', '티켓/입장권']]),
};
const metro = { name: '도쿄 지하철 메트로 패스 (24/48/72시간)', countryId: 'jp', region: '도쿄', categoryId: 'ticket' };
const limo = { name: '도쿄 공항 리무진 버스', countryId: 'jp', region: '도쿄', categoryId: 'bus' };
const danang = { name: '다낭 바나힐 케이블카', countryId: 'vn', region: '다낭', categoryId: 'ticket' };
const paris = { name: '루브르 박물관 입장권', countryId: 'fr', region: '파리', categoryId: 'ticket' };

const C = {
  product: { match: { type: 'product', values: ['메트로 패스'] } },
  jpAll: { match: { type: 'location', values: ['일본'] } },
  jpBus: { match: { type: 'category', values: ['버스/이동'], locations: ['일본'] } },
  vn: { match: { type: 'location', values: ['베트남'] } },
  none: { match: { type: 'none' } },
};

assert.ok(matches(metro, C.product, lookup), '상품명 매칭');
assert.ok(!matches(limo, C.product, lookup), '다른 상품은 제외');
assert.ok(matches(metro, C.jpAll, lookup) && matches(limo, C.jpAll, lookup), '지역 전체 매칭');
assert.ok(!matches(danang, C.jpAll, lookup), '다른 나라는 제외');
assert.ok(matches(limo, C.jpBus, lookup), '카테고리+지역 매칭');
assert.ok(!matches(metro, C.jpBus, lookup), '같은 지역이어도 카테고리 다르면 제외');
assert.ok(matches(danang, C.vn, lookup) && !matches(paris, C.vn, lookup), '베트남 매칭');
assert.ok(![metro, limo, danang, paris].some((p) => matches(p, C.none, lookup)), 'none 은 아무것도 안 붙음');

// 마감일: 판매처 표기 날짜를 그대로 쓴다 (시간대 환산으로 하루 밀리면 안 됨)
const kstEdge = { registerBy: '2026-10-31T23:59:59+08:00' };
assert.strictEqual(formatDeadline(kstEdge), '10월 31일까지', '시간대 환산으로 11월 1일이 되면 안 됨');
assert.strictEqual(daysLeft(kstEdge, new Date(2026, 9, 6)), 25);
assert.strictEqual(daysLeft(kstEdge, new Date(2026, 9, 31)), 0, '마감 당일은 D-0');
assert.strictEqual(daysLeft(kstEdge, new Date(2026, 10, 2)), -2, '지난 쿠폰은 음수');
assert.strictEqual(formatDeadline({}), '');

// 배지에 들어갈 짧은 할인 표기 (원본이 제각각이라 그대로 쓰면 배지가 깨진다)
const CURRENCY_SUFFIX = { JPY: '엔', KRW: '원', USD: '달러', TWD: '대만달러', HKD: '홍콩달러', EUR: '유로', SGD: '싱가포르달러', THB: '바트' };
const formatDiscount = (raw) => {
  const text = String(raw || '').trim();
  const p = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (p) return `${p[1]}%`;
  const a = text.match(/([A-Z]{3})\s*([\d,]+)/);
  if (a) return `${a[2]}${CURRENCY_SUFFIX[a[1]] || a[1]}`;
  return text.replace(/\s*할인!?$/, '') || '할인';
};

assert.strictEqual(formatDiscount('5% 할인'), '5%');
assert.strictEqual(formatDiscount('20% 할인'), '20%');
assert.strictEqual(formatDiscount('숙소 5% 할인!'), '5%', '배지에 "숙소"가 들어가면 두 줄로 깨진다');
assert.strictEqual(formatDiscount('JPY2,800'), '2,800엔', '통화 코드를 그대로 노출하면 안 됨');
assert.strictEqual(formatDiscount('KRW5,000'), '5,000원');
assert.strictEqual(formatDiscount(''), '할인');

// D-day는 임박했을 때만 보여준다 (유효기간이 2200년인 쿠폰이 있어 D-63638 같은 값이 나온다)
const shouldShowDday = (c, now) => {
  const d = daysLeft(c, now);
  return d !== null && d <= 30;
};
const now = new Date(2026, 9, 6);
assert.ok(shouldShowDday({ registerBy: '2026-10-11T22:59:59+08:00' }, now), '5일 남았으면 표시');
assert.ok(!shouldShowDday({ registerBy: '2027-03-31T23:59:59+08:00' }, now), '176일 남았으면 숨김');
assert.ok(!shouldShowDday({ registerBy: '2200-12-31T23:59:59+08:00' }, now), '2200년이면 숨김');

console.log('쿠폰 점검 통과 (매칭 8건, 날짜 5건, 할인표기 6건, D-day 3건)');
