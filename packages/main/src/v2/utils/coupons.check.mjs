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

console.log('쿠폰 매칭·마감일 점검 통과 (매칭 8건, 날짜 5건)');
