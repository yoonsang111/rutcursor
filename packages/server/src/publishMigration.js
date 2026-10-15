// 예전 '활성/비활성(isAvailable)'을 새 공개 상태로 옮기는 규칙 (서버의 이전 API와 시험에서 함께 씀)
// 분류 규칙 (근거 없이 추정하지 않음 — 이름·사진·가격이 채워져 있다고 공개됐었다고 보지 않는다):
//   1) 이미 publishStatus가 있는 상품은 그대로 (몇 번 실행해도 결과가 같음)
//   2) 활성(isAvailable !== false) → 공개 (지금 손님에게 보이는 상태 그대로 유지). 판매처 예약 가능 여부는 건드리지 않음
//   3) 비활성 + 근거 파일에 '숨김' 근거 → 숨김
//   4) 비활성 + 근거 파일에 '초안으로 등록된 기록' → 초안
//   5) 그 밖의 비활성 → 분류 필요 (비공개 유지, 관리자가 정함)
// 근거 파일: { drafts: { "<상품 id>": { source, at, note } }, hidden: { "<상품 id>": { source, at, note } } }
export function normalizeEvidence(parsed) {
  return { drafts: (parsed && parsed.drafts) || {}, hidden: (parsed && parsed.hidden) || {} };
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
    publishMigration: { at, from: { isAvailable: product.isAvailable }, to: status, rule, ...(basis ? { evidence: basis } : {}) },
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

// 손님 공개 판정 — 서버(index.js)와 되돌리기가 함께 쓰는 단 하나의 판정
export const PUBLISH_STATUSES = ['draft', 'published', 'hidden', 'needs_classification'];
export const publishStatusOf = (product) => {
  if (PUBLISH_STATUSES.includes(product?.publishStatus)) {
    // 이 서버는 공개 상태와 isAvailable을 늘 같이 맞춰 저장한다. 둘이 다르면 예전 버전(복구 기간)이 isAvailable만 바꾼 것 →
    // 공개였는데 비활성으로 바뀜 = 숨김 (다시 공개되지 않게), 비공개였는데 활성으로 바뀜 = 분류 필요 (관리자가 확인 후 공개)
    if (product.publishStatus === 'published' && product.isAvailable === false) return 'hidden';
    if (product.publishStatus !== 'published' && product.isAvailable === true) return 'needs_classification';
    return product.publishStatus;
  }
  // 이전 전 데이터: 활성은 지금 노출 유지(공개), 비활성은 근거 없이 정하지 않음(분류 필요)
  return product?.isAvailable === false ? 'needs_classification' : 'published';
};
export const isPublicProduct = (product) => publishStatusOf(product) === 'published';

// 상태만 되돌리기 (2026-10-15): 이전이 바꾼 칸(공개 상태·활성·이전 표시)만 이전 전 백업 값으로. 그 밖의 칸·새 상품·지운 상품은 지금 그대로
// 이전 뒤 누군가 공개 상태를 바꾼 상품(지금 상태 ≠ 이전 결과)은 더 새로운 결정이라 건드리지 않고 알려 줌
export function rollback(products, backupProducts) {
  const before = new Map(backupProducts.map((b) => [String(b.id), b]));
  const changes = [];
  const next = products.map((p) => {
    const m = p.publishMigration;
    if (!m) return p;
    const b = before.get(String(p.id));
    const row = { id: String(p.id), name: p.name, now: p.publishStatus };
    if (!b) { changes.push({ ...row, restored: false, why: '이전 전 백업에 없는 상품 — 그대로' }); return p; }
    if (!m.to || p.publishStatus !== m.to) { changes.push({ ...row, restored: false, why: '이전 뒤 공개 상태가 바뀜 — 그대로' }); return p; }
    // 백업이 이 이전의 '이전 전' 모습인지 확인: 공개 상태가 없고, 활성 값(칸 없음 포함)이 이전 때 남긴 기록과 같아야 함 (Codex 20차 — 칸이 빠진 백업으로 공개되면 안 됨)
    if (b.publishStatus !== undefined || !m.from || !Object.is(b.isAvailable, m.from.isAvailable)) { changes.push({ ...row, restored: false, why: '백업이 이전 기록과 다름 — 그대로' }); return p; }
    const { publishStatus, publishMigration, ...rest } = p;
    const restored = { ...rest, rev: (Number(p.rev) || 0) + 1 };
    if (m.from.isAvailable === undefined) delete restored.isAvailable; else restored.isAvailable = m.from.isAvailable;
    // 손님 공개 여부는 절대 바꾸지 않음 (Codex 21·22차): 서버와 같은 판정(isPublicProduct)으로 지금과 되돌린 뒤를 비교해 다르면 그대로
    if (isPublicProduct(p) !== isPublicProduct(restored)) { changes.push({ ...row, restored: false, why: '되돌리면 손님 공개 여부가 바뀜 — 그대로' }); return p; }
    changes.push({ ...row, restored: true, why: `이전 전으로 (${m.from.isAvailable === false ? '비활성' : '활성'})` });
    return restored;
  });
  return { products: next, changes };
}
export function rollbackTable(changes) {
  const n = changes.filter((c) => c.restored).length;
  return [`# 공개 상태 되돌리기 (${n}개 되돌림, ${changes.length - n}개 그대로)`, '', '| 상품 번호 | 이름 | 지금 상태 | 처리 |', '|---|---|---|---|',
    ...changes.map((c) => `| ${c.id} | ${String(c.name || '').replace(/\|/g, '/')} | ${LABEL[c.now] || c.now || '-'} | ${c.why} |`)].join('\n');
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

