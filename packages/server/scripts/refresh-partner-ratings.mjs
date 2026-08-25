// source: 'api'로 연동된 partnerLinks가 있는 상품의 평점/리뷰수를 갱신하는 배치 스크립트.
// 가격과 달리 평점은 자주 바뀌지 않으므로 refresh-partner-prices.mjs(3시간 주기)와 분리해
// 하루 1회(자정 등)만 실행한다.
// 사용법: cd packages/server && node --env-file=.env.local scripts/refresh-partner-ratings.mjs
// (운영 서버에서는 DATA_DIR=./data/production 등을 지정해서 cron으로 매일 자정 실행)

import fs from 'fs';
import path from 'path';
import { getPartnerIntegration } from '../src/integrations/index.js';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.cwd(), process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

// 파트너 API 호출 간 최소 간격(ms). 마이리얼트립 옵션 조회 제한(분당 50건)보다 여유있게 설정.
const CALL_INTERVAL_MS = 1500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!fs.existsSync(PRODUCTS_FILE)) {
  console.error(`[refresh-partner-ratings] 상품 파일을 찾을 수 없습니다: ${PRODUCTS_FILE}`);
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
if (!Array.isArray(products)) {
  throw new Error('products.json 형식이 배열이 아닙니다.');
}

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

    product.rating = result.rating;
    product.reviewCount = result.reviewCount;
    refreshed += 1;
    console.log(`[refresh-partner-ratings] ${product.id} ${product.name} - 평점: ${result.rating} (${result.reviewCount}개)`);
  } catch (error) {
    failed += 1;
    console.error(`[refresh-partner-ratings] 갱신 실패 (상품 ${product.id}, ${ratingLink.partner}):`, error.message);
  }
}

fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');

console.log(`[refresh-partner-ratings] 완료 - 갱신: ${refreshed}, 건너뜀: ${skipped}, 실패: ${failed}`);
