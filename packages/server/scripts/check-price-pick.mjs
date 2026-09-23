// 대표가 선정 로직 자가 점검. 실제 사고가 났던 케이스들을 그대로 넣어둔다.
// 실행: node packages/server/scripts/check-price-pick.mjs
import assert from 'assert';
import { pickListedPrice, pickRepresentativePrice, detectSentinelPrices, isNonAdultOption } from '../src/integrations/index.js';

// 파트너 표시가: 상세 응답에서 첫 번째로 유효한 가격 필드를 쓴다
assert.strictEqual(pickListedPrice({ salePrice: 49217 }), 49217);
assert.strictEqual(pickListedPrice({ salePrice: 0, price: 29644 }), 29644, '0원은 유효한 가격이 아님');
assert.strictEqual(pickListedPrice({ reviewScore: 4.9 }), null, '가격 필드가 없으면 null');
assert.strictEqual(pickListedPrice(null), null);

// 아동/시니어 판별
assert.ok(isNonAdultOption('어린이(만3-11세)'));
assert.ok(isNonAdultOption('AGED 3-11'));
assert.ok(isNonAdultOption('만 65세 이상'));
assert.ok(!isNonAdultOption('성인 1매'));
assert.ok(!isNonAdultOption('만 18세 이상'));

// 자리표시자: 서로 다른 상품 3곳 이상에 같은 가격이 나오면 실제 판매가가 아니다
const sentinels = detectSentinelPrices([
  [{ price: 86649, name: '성인' }, { price: 45900, name: '성인' }],
  [{ price: 86649, name: '성인' }],
  [{ price: 86649, name: '어린이' }],
]);
assert.ok(sentinels.has(86649));
assert.ok(!sentinels.has(45900));

// 자리표시자를 뺀 성인 옵션 중 최저가
assert.strictEqual(
  pickRepresentativePrice(
    [
      { price: 86649, name: '성인' },
      { price: 45900, name: '성인 1매' },
      { price: 30000, name: '어린이(만3-11세)' },
    ],
    sentinels,
  ).price,
  45900,
  '자리표시자 제외 + 아동가 제외',
);

// 성인가와 아동가가 원 단위까지 같으면 채워지지 않은 옵션이므로 제외
assert.strictEqual(
  pickRepresentativePrice([
    { price: 70000, name: '성인' },
    { price: 70000, name: '아동' },
    { price: 93400, name: '성인 1일권' },
  ]).price,
  93400,
  '연령 무관 동일가는 자리표시자',
);

// 전 옵션이 균일가인 상품은 그대로 둔다
assert.strictEqual(
  pickRepresentativePrice([
    { price: 12000, name: '성인' },
    { price: 12000, name: '아동' },
  ]).price,
  12000,
);

assert.strictEqual(pickRepresentativePrice([]), null);
assert.strictEqual(pickRepresentativePrice([{ price: 0, name: '성인' }]), null);

console.log('대표가 선정 로직 점검 통과');
