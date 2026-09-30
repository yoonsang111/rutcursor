// source: 'api'로 연동된 partnerLinks의 가격을 주기적으로 갱신하는 배치 스크립트.
// 사용법: cd packages/server && node --env-file=.env.local scripts/refresh-partner-prices.mjs
// (운영 서버에서는 DATA_DIR=./data/production 등을 지정해서 cron/PM2로 주기 실행)

import fs from 'fs';
import path from 'path';
import { getPartnerIntegration, pickRepresentativePrice, detectSentinelPrices } from '../src/integrations/index.js';

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

// 파트너사 응답 데이터 자체에 섞여있는 이상치 옵션(오탈자/오등록된 가격 등) 때문에
// 가격이 이전 대비 비정상적으로 급등/급락하면 자동 반영하지 않고 보류한다.
// (기존 가격의 절반 미만으로 떨어지거나 2배를 넘게 오르면 의심스러운 것으로 간주)
const SUSPICIOUS_DROP_RATIO = 0.5;
const SUSPICIOUS_RISE_RATIO = 2;

let refreshed = 0;
let skipped = 0;
let flagged = 0;
let failed = 0;

// 1차: 모든 API 연동 링크의 옵션을 한 번씩만 조회해 모아둔다 (같은 externalId는 재사용)
const targets = [];
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
    targets.push({ product, link, partnerKey });
  }
}

// 1순위는 파트너 상품 페이지에 실제로 노출되는 "부터" 가격. 그게 안 잡히는 상품만 옵션에서 역산한다.
const displayedByExternalId = new Map();
const optionsByExternalId = new Map();
for (const { product, link, partnerKey } of targets) {
  if (displayedByExternalId.has(link.externalId) || optionsByExternalId.has(link.externalId)) continue;
  const integration = getPartnerIntegration(partnerKey);

  if (integration.fetchDisplayedPrice) {
    try {
      const displayed = await integration.fetchDisplayedPrice(link.externalId, product.name);
      await sleep(CALL_INTERVAL_MS);
      if (displayed) {
        displayedByExternalId.set(link.externalId, displayed);
        continue;
      }
      console.warn(`[refresh-partner-prices] 노출가 미확인, 옵션으로 대체 (상품 ${product.id} ${product.name})`);
    } catch (error) {
      await sleep(CALL_INTERVAL_MS);
      console.warn(`[refresh-partner-prices] 노출가 조회 실패, 옵션으로 대체 (상품 ${product.id}):`, error.message);
    }
  }

  try {
    optionsByExternalId.set(link.externalId, await integration.fetchPriceOptions(link.externalId));
  } catch (error) {
    optionsByExternalId.set(link.externalId, null);
    failed += 1;
    console.error(`[refresh-partner-prices] 옵션 조회 실패 (상품 ${product.id}, ${link.partner}):`, error.message);
  }
  await sleep(CALL_INTERVAL_MS);
}

// 서로 다른 상품 3개 이상에서 똑같이 나타나는 가격 = 자리표시자 → 대표가 후보에서 제외
const sentinelPrices = detectSentinelPrices([...optionsByExternalId.values()].filter(Boolean));
if (sentinelPrices.size > 0) {
  console.log(`[refresh-partner-prices] 자리표시자 가격 감지(제외): ${[...sentinelPrices].map((p) => p.toLocaleString('ko-KR') + '원').join(', ')}`);
}

// 2차: 자리표시자 제외 + 성인 옵션 우선으로 대표가 선정 후 반영
for (const { product, link } of targets) {
  const displayed = displayedByExternalId.get(link.externalId);
  const options = displayed ? null : optionsByExternalId.get(link.externalId);
  if (!displayed && !options) continue; // 조회 실패는 위에서 집계됨
  const result = displayed || pickRepresentativePrice(options, sentinelPrices);
  if (!result) {
    skipped += 1;
    continue;
  }

  // 파트너 노출가는 파트너가 내건 값 자체라 이상치 판정 대상이 아니다.
  // (잘못된 옵션 역산값에서 크게 튀는 게 정상적인 교정이므로 막으면 안 됨)
  // 기존 저장가가 이번에 감지된 자리표시자여도 비교 기준이 될 수 없으므로 마찬가지로 건너뛴다.
  const previousPrice = Number(link.price);
  if (!displayed && Number.isFinite(previousPrice) && previousPrice > 0 && !sentinelPrices.has(previousPrice)) {
    const ratio = result.price / previousPrice;
    if (ratio < SUSPICIOUS_DROP_RATIO || ratio > SUSPICIOUS_RISE_RATIO) {
      flagged += 1;
      console.warn(
        `[refresh-partner-prices] 의심스러운 가격 변동으로 보류 (상품 ${product.id} ${product.name}, ${link.partner}): ${previousPrice.toLocaleString('ko-KR')}원 -> ${result.price.toLocaleString('ko-KR')}원`
      );
      continue;
    }
  }

  link.price = result.price;
  link.priceDisplay = result.priceDisplay;
  link.updatedAt = new Date().toISOString();
  refreshed += 1;
  console.log(
    `[refresh-partner-prices] ${product.id} ${product.name} - ${link.partner}: ${result.priceDisplay} (${displayed ? '파트너 노출가' : '옵션 역산'})`
  );
}

fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');

console.log(`[refresh-partner-prices] 완료 - 갱신: ${refreshed}, 건너뜀: ${skipped}, 보류(의심 변동): ${flagged}, 실패: ${failed}`);
