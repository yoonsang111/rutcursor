// 쓰기 API 속도 제한 자가 점검.
// 실행: node packages/server/scripts/check-rate-limit.mjs
// (index.js 와 같은 규칙을 복제한다. 바꿀 땐 양쪽 모두 수정)
import assert from 'assert';

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_WRITES = 600;
const RATE_MAX_FAILED_AUTH = 10;

const makeLimiter = () => {
  const buckets = new Map();
  return (key, max, now) => {
    const b = buckets.get(key);
    if (!b || now - b.start >= RATE_WINDOW_MS) {
      buckets.set(key, { start: now, count: 1 });
      return false;
    }
    b.count += 1;
    return b.count > max;
  };
};

// 무차별 대입: 10회까지는 401, 11회째부터 429
{
  const hit = makeLimiter();
  const t = 1_000_000;
  const results = [];
  for (let i = 0; i < 13; i += 1) results.push(hit(`auth:1.2.3.4`, RATE_MAX_FAILED_AUTH, t));
  assert.strictEqual(results.filter((blocked) => !blocked).length, RATE_MAX_FAILED_AUTH, '10회까지 허용');
  assert.ok(results[10] && results[12], '11회째부터 차단');
}

// 창이 지나면 다시 열린다
{
  const hit = makeLimiter();
  const t = 1_000_000;
  for (let i = 0; i < 12; i += 1) hit('auth:1.2.3.4', RATE_MAX_FAILED_AUTH, t);
  assert.strictEqual(hit('auth:1.2.3.4', RATE_MAX_FAILED_AUTH, t + RATE_WINDOW_MS + 1), false, '1분 뒤 해제');
}

// IP가 다르면 서로 영향 없음
{
  const hit = makeLimiter();
  const t = 1_000_000;
  for (let i = 0; i < 12; i += 1) hit('auth:1.1.1.1', RATE_MAX_FAILED_AUTH, t);
  assert.strictEqual(hit('auth:2.2.2.2', RATE_MAX_FAILED_AUTH, t), false, '다른 IP는 막히지 않음');
}

// 일괄 등록 스크립트(상품 설명 91건, 쿠폰 9건 등)가 막히면 안 된다
{
  const hit = makeLimiter();
  const t = 1_000_000;
  let blocked = 0;
  for (let i = 0; i < 100; i += 1) if (hit('write:10.0.0.1', RATE_MAX_WRITES, t)) blocked += 1;
  assert.strictEqual(blocked, 0, '100건 연속 쓰기는 통과해야 함 (설명 일괄 반영이 91건)');
}

console.log('속도 제한 점검 통과 (무차별 대입 차단, 창 해제, IP 분리, 일괄 쓰기 100건 통과)');
