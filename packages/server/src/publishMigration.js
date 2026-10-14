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

