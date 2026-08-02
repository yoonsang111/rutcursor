// source: 'api'로 연동된 partnerLinks의 가격을 주기적으로 갱신하는 배치 스크립트.
// 사용법: cd packages/server && node --env-file=.env.local scripts/refresh-partner-prices.mjs
// (운영 서버에서는 DATA_DIR=./data/production 등을 지정해서 cron/PM2로 주기 실행)

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
  console.error(`[refresh-partner-prices] 상품 파일을 찾을 수 없습니다: ${PRODUCTS_FILE}`);
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
  for (const link of links) {
    if (link.source !== 'api' || !link.externalId) continue;

    const partnerKey = PARTNER_KEY_BY_NAME[link.partner];
    if (!partnerKey) {
      console.warn(`[refresh-partner-prices] 알 수 없는 파트너, 건너뜀: ${link.partner} (상품 ${product.id})`);
      skipped += 1;
      continue;
    }

    try {
      const integration = getPartnerIntegration(partnerKey);
      const result = await integration.refreshPrice(link.externalId);
      await sleep(CALL_INTERVAL_MS);

      if (!result) {
        skipped += 1;
        continue;
      }

      link.price = result.price;
      link.priceDisplay = result.priceDisplay;
      link.updatedAt = new Date().toISOString();
      refreshed += 1;
      console.log(`[refresh-partner-prices] ${product.id} ${product.name} - ${link.partner}: ${result.priceDisplay}`);
    } catch (error) {
      failed += 1;
      console.error(`[refresh-partner-prices] 갱신 실패 (상품 ${product.id}, ${link.partner}):`, error.message);
    }
  }
}

fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');

console.log(`[refresh-partner-prices] 완료 - 갱신: ${refreshed}, 건너뜀: ${skipped}, 실패: ${failed}`);
