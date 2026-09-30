// draft-product-descriptions.mjs가 만든 초안을 운영 상품에 반영한다.
//
// 안전장치: 초안을 만든 시점의 설명과 지금 설명이 다르면 건너뛴다.
// (그 사이 사람이 직접 고쳤다는 뜻이므로 사람이 쓴 글을 덮어쓰지 않는다)
// 초안 파일에 이전 설명이 그대로 남아 있어 되돌릴 근거도 된다.
//
// 사용법:
//   DRY_RUN=1 ADMIN_API_KEY=... node packages/server/scripts/apply-product-descriptions.mjs
//   ADMIN_API_KEY=... node packages/server/scripts/apply-product-descriptions.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE_URL = (process.env.API_BASE_URL || 'https://api.tourstream.kr/api').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const DRAFTS_FILE = process.env.DRAFTS_FILE || path.resolve(__dirname, '../../../docs/product-description-drafts.json');
const DRY_RUN = process.env.DRY_RUN === '1';

if (!ADMIN_API_KEY) {
  console.error('[apply-descriptions] ADMIN_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}
if (!fs.existsSync(DRAFTS_FILE)) {
  console.error(`[apply-descriptions] 초안 파일이 없습니다: ${DRAFTS_FILE}`);
  process.exit(1);
}

const main = async () => {
  const { drafts } = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8'));
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) throw new Error(`상품 조회 실패 (${res.status})`);
  const products = await res.json();
  const byId = new Map(products.map((p) => [String(p.id), p]));

  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const draft of drafts) {
    const product = byId.get(String(draft.id));
    if (!product) {
      console.warn(`  - 건너뜀 [${draft.id}] 상품이 없음`);
      skipped += 1;
      continue;
    }
    const now = String(product.description || '').trim();
    if (now !== String(draft.currentDescription || '').trim()) {
      console.warn(`  - 건너뜀 [${draft.id}] ${product.name}: 초안 생성 이후 설명이 변경됨`);
      skipped += 1;
      continue;
    }
    if (now === draft.draft) {
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  (계획) [${draft.id}] ${product.name}: ${now.length}자 -> ${draft.draft.length}자`);
      applied += 1;
      continue;
    }

    try {
      const put = await fetch(`${API_BASE_URL}/products/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_API_KEY },
        body: JSON.stringify({ description: draft.draft }),
      });
      if (!put.ok) throw new Error(`HTTP ${put.status} ${(await put.text().catch(() => '')).slice(0, 120)}`);
      applied += 1;
      console.log(`  ✓ [${draft.id}] ${product.name}: ${now.length}자 -> ${draft.draft.length}자`);
    } catch (error) {
      failed += 1;
      console.error(`  ✗ [${draft.id}] ${product.name}: ${error.message}`);
    }
  }

  console.log(`[apply-descriptions] ${DRY_RUN ? '(DRY RUN) ' : ''}반영 ${applied}, 건너뜀 ${skipped}, 실패 ${failed}`);
  if (failed > 0) process.exit(1);
};

main().catch((error) => {
  console.error('[apply-descriptions] 오류:', error.message);
  process.exit(1);
});
