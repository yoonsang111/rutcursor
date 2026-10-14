// source: 'api'로 연동된 partnerLinks가 있는 상품의 평점/리뷰수를 갱신하는 배치 스크립트.
// 가격과 달리 평점은 자주 바뀌지 않으므로 refresh-partner-prices.mjs(3시간 주기)와 분리해
// 하루 1회(자정 등)만 실행한다.
// 사용법: cd packages/server && node --env-file=.env.local scripts/refresh-partner-ratings.mjs
// (운영 서버에서는 ADMIN_API_KEY와 API_BASE_URL을 지정해서 cron으로 매일 자정 실행 — 상품 파일은 API 서버만 씀)

import { getPartnerIntegration } from '../src/integrations/index.js';

// 상품 파일을 직접 쓰지 않고 운영 API 서버를 거친다 (상품 파일은 서버 한 프로세스만 씀 — 서로 덮어쓰지 않게)
//   API_BASE_URL (기본 http://127.0.0.1:3002/api — 같은 EC2의 API 서버), ADMIN_API_KEY 필요
const API_BASE_URL = (process.env.API_BASE_URL || 'http://127.0.0.1:3002/api').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
if (!ADMIN_API_KEY) {
  console.error('ADMIN_API_KEY 환경변수가 필요합니다 (상품 파일은 API 서버를 거쳐서만 바꿔요).');
  process.exit(1);
}
const api = async (method, p, body) => {
  const res = await fetch(`${API_BASE_URL}${p}`, { method, headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_API_KEY }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${p} 실패 (${res.status}) ${json?.error || ''}`);
  return json;
};

// 파트너 API 호출 간 최소 간격(ms). 마이리얼트립 옵션 조회 제한(분당 50건)보다 여유있게 설정.
const CALL_INTERVAL_MS = 1500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const products = await api('GET', '/products'); // 관리자 조회 (초안·숨김 포함)
const ratingUpdates = new Map(); // 상품 id → { rating, reviewCount }

const PARTNER_KEY_BY_NAME = { 마이리얼트립: 'myrealtrip' };

let refreshed = 0;
let skipped = 0;
let failed = 0;

for (const product of products) {
  const links = Array.isArray(product.partnerLinks) ? product.partnerLinks : [];
  // 상품 하나에 같은 파트너 링크가 여러 개여도 평점은 한 번만 갱신
  const ratingLink = links.find((link) => link.source === 'api' && link.externalId && PARTNER_KEY_BY_NAME[link.partner]);
  if (!ratingLink) continue;

  const integration = getPartnerIntegration(PARTNER_KEY_BY_NAME[ratingLink.partner]);
  if (typeof integration.refreshRating !== 'function') continue;

  try {
    const result = await integration.refreshRating(ratingLink.externalId);
    await sleep(CALL_INTERVAL_MS);

    if (!result) {
      skipped += 1;
      continue;
    }

    ratingUpdates.set(String(product.id), { rating: result.rating, reviewCount: result.reviewCount });
    refreshed += 1;
    console.log(`[refresh-partner-ratings] ${product.id} ${product.name} - 평점: ${result.rating} (${result.reviewCount}개)`);
  } catch (error) {
    failed += 1;
    console.error(`[refresh-partner-ratings] 갱신 실패 (상품 ${product.id}, ${ratingLink.partner}):`, error.message);
  }
}

// 바뀐 평점만 서버로 보냄 (평점·후기 수 칸만 — 다른 칸은 서버의 최신 값 그대로)
for (const [productId, update] of ratingUpdates) {
  try {
    await api('PUT', `/products/${encodeURIComponent(productId)}`, update);
  } catch (error) {
    failed += 1;
    console.error(`[refresh-partner-ratings] 저장 실패 (상품 ${productId}):`, error.message);
  }
}

console.log(`[refresh-partner-ratings] 완료 - 갱신: ${refreshed}, 건너뜀: ${skipped}, 실패: ${failed}`);
