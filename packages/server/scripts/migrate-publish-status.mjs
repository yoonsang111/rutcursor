// 예전 '활성/비활성(isAvailable)'을 새 공개 상태(publishStatus: 초안·공개·숨김·분류 필요)로 옮기는 스크립트.
// 기본은 미리보기(변경표만 출력, 파일 안 바꿈). 실제 적용은 --apply, 되돌리기는 --restore <백업 파일>.
//
//   DATA_DIR=./data/production node scripts/migrate-publish-status.mjs --evidence scripts/publish-status-evidence.json [--report 변경표.md]
//   DATA_DIR=./data/production node scripts/migrate-publish-status.mjs --evidence ... --apply
//   DATA_DIR=./data/production node scripts/migrate-publish-status.mjs --restore ./data/production/products.before-publish-status-<시각>.json
//
// 분류 규칙 (근거 없이 추정하지 않음 — 이름·사진·가격이 채워져 있다고 공개됐었다고 보지 않는다):
//   1) 이미 publishStatus가 있는 상품은 그대로 (몇 번 실행해도 결과가 같음)
//   2) 활성(isAvailable !== false) → 공개 (지금 손님에게 보이는 상태 그대로 유지). 판매처 예약 가능 여부는 건드리지 않음(따로 확인)
//   3) 비활성 + 근거 파일에 '숨김' 근거 → 숨김
//   4) 비활성 + 근거 파일에 '초안으로 등록된 기록' → 초안
//   5) 그 밖의 비활성 → 분류 필요 (비공개 유지, 관리자가 정함)
import fs from 'fs';
import path from 'path';
import { acquireFileLock, lockPathFor, readJsonArray, writeJsonAtomic } from '../src/productStore.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const DATA_DIR = path.resolve(process.cwd(), option('--data-dir') || process.env.DATA_DIR || 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// 근거 파일: { drafts: { "<상품 id>": { source, at, note } }, hidden: { "<상품 id>": { source, at, note } } }
export function loadEvidence(file) {
  if (!file) return { drafts: {}, hidden: {} };
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { drafts: parsed.drafts || {}, hidden: parsed.hidden || {} };
}

// 한 상품을 어떻게 옮길지 (순수 함수 — 시험에서 직접 확인)
export function classify(product, evidence, at) {
  if (['draft', 'published', 'hidden', 'needs_classification'].includes(product.publishStatus)) {
    return { product, change: null };
  }
  const id = String(product.id);
  let status;
  let rule;
  let basis = null;
  if (product.isAvailable !== false) {
    status = 'published';
    rule = '활성 → 공개 (지금 노출 유지)';
  } else if (evidence.hidden[id]) {
    status = 'hidden';
    rule = '비활성 + 숨김 근거';
    basis = evidence.hidden[id];
  } else if (evidence.drafts[id]) {
    status = 'draft';
    rule = '비활성 + 초안 등록 기록';
    basis = evidence.drafts[id];
  } else {
    status = 'needs_classification';
    rule = '비활성 + 근거 없음 → 분류 필요 (비공개 유지)';
  }
  const next = {
    ...product,
    publishStatus: status,
    isAvailable: status === 'published',
    publishMigration: { at, from: { isAvailable: product.isAvailable }, rule, ...(basis ? { evidence: basis } : {}) },
  };
  return { product: next, change: { id, name: product.name, before: product.isAvailable === false ? '비활성' : '활성', after: status, rule, evidence: basis } };
}

export function migrate(products, evidence, at = new Date().toISOString()) {
  const changes = [];
  const next = products.map((p) => {
    const { product, change } = classify(p, evidence, at);
    if (change) changes.push(change);
    return product;
  });
  return { products: next, changes };
}

const LABEL = { published: '공개', draft: '초안', hidden: '숨김', needs_classification: '분류 필요' };
export function changeTable(changes) {
  const counts = changes.reduce((acc, c) => ({ ...acc, [c.after]: (acc[c.after] || 0) + 1 }), {});
  const lines = [
    `# 공개 상태 이전 변경표 (${changes.length}개 바뀜)`,
    '',
    Object.entries(counts).map(([k, v]) => `- ${LABEL[k]}: ${v}개`).join('\n'),
    '',
    '| 상품 번호 | 이름 | 지금 | 바뀔 상태 | 규칙 | 근거 |',
    '|---|---|---|---|---|---|',
    ...changes.map((c) => `| ${c.id} | ${String(c.name || '').replace(/\|/g, '/')} | ${c.before} | ${LABEL[c.after]} | ${c.rule} | ${c.evidence ? `${c.evidence.source || ''} ${c.evidence.at || ''}`.trim() : '-'} |`),
  ];
  return lines.join('\n');
}

async function main() {
  if (!fs.existsSync(PRODUCTS_FILE)) throw new Error(`상품 파일이 없어요: ${PRODUCTS_FILE}`);
  const restoreFrom = option('--restore');
  const lock = await acquireFileLock(lockPathFor(PRODUCTS_FILE));
  try {
    if (restoreFrom) {
      const backup = readJsonArray(path.resolve(process.cwd(), restoreFrom)); // 깨진 백업이면 여기서 멈춤
      const safety = path.join(DATA_DIR, `products.before-restore-${stamp()}.json`);
      fs.copyFileSync(PRODUCTS_FILE, safety);
      writeJsonAtomic(PRODUCTS_FILE, backup);
      console.log(`[되돌리기] ${restoreFrom} 내용으로 되돌렸어요 (${backup.length}개). 되돌리기 직전 파일: ${safety}`);
      return;
    }
    const products = readJsonArray(PRODUCTS_FILE);
    const { products: next, changes } = migrate(products, loadEvidence(option('--evidence')));
    const table = changeTable(changes);
    if (option('--report')) fs.writeFileSync(option('--report'), table, 'utf8');
    console.log(table);
    if (!flag('--apply')) {
      console.log('\n(미리보기만 했어요. 파일은 바뀌지 않았어요. 적용하려면 --apply)');
      return;
    }
    if (!changes.length) {
      console.log('\n바꿀 상품이 없어요 (이미 이전됨). 파일은 그대로예요.');
      return;
    }
    const backup = path.join(DATA_DIR, `products.before-publish-status-${stamp()}.json`);
    fs.copyFileSync(PRODUCTS_FILE, backup);
    writeJsonAtomic(PRODUCTS_FILE, next);
    console.log(`\n적용했어요. 백업: ${backup}\n되돌리기: node scripts/migrate-publish-status.mjs --restore ${backup}`);
  } finally {
    lock.release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error('[이전 실패]', error.message);
    process.exit(1);
  });
}
