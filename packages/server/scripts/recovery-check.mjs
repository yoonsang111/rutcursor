#!/usr/bin/env node
// 복구 전 데이터 검사 (읽기만 — 아무 파일도 만들거나 고치지 않음). 복구절차.md 4번 단계에서 백업 뒤에 실행.
// 사용: node recovery-check.mjs <데이터 폴더>   → 끝 줄 "결과: 정상"(종료 코드 0) / "결과: 손상"(1) / 사용법 오류(2)
// 필수: products.json(배열, 각 상품 id 문자열·중복 없음·name 있음·사진/판매처 링크 칸 모양), counter.json(있으면 정확히 셀 수 있는 정수)
// 선택: categories.json·locations.json·coupons.json·view-events.json·schema.json — 없어도 정상, 있는데 깨졌으면 경고(A는 덮어쓰지 않고 대체 응답)
import fs from 'fs';
import path from 'path';

const dir = process.argv[2];
if (!dir) { console.error('사용: node recovery-check.mjs <데이터 폴더>'); process.exit(2); }
const problems = [];
const warnings = [];
const ok = [];
const file = (n) => path.join(dir, n);
const readJson = (n) => JSON.parse(fs.readFileSync(file(n), 'utf8'));

if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) { console.log(`❌ 데이터 폴더가 없어요: ${dir}\n결과: 손상`); process.exit(1); }

// 상품 파일 (필수)
let maxId = 0;
const pf = file('products.json');
if (!fs.existsSync(pf)) problems.push('products.json 없음 (필수 — 빈 목록으로 시작하면 안 됨)');
else {
  const st = fs.lstatSync(pf);
  if (st.isSymbolicLink()) problems.push('products.json이 심볼릭 링크예요');
  else if (st.nlink > 1) problems.push('products.json이 하드 링크로 다른 곳과 연결돼 있어요');
  try {
    const list = readJson('products.json');
    if (!Array.isArray(list)) problems.push('products.json이 목록(배열)이 아니에요');
    else {
      const seen = new Map();
      list.forEach((p, i) => {
        if (!p || typeof p !== 'object' || Array.isArray(p)) return problems.push(`상품 ${i + 1}번째 항목이 객체가 아니에요`);
        if (typeof p.id !== 'string' || !p.id) return problems.push(`상품 ${i + 1}번째 항목의 id가 없거나 문자가 아니에요`);
        if (seen.has(p.id)) problems.push(`상품 id 중복: ${p.id} (${seen.get(p.id) + 1}번째와 ${i + 1}번째)`);
        seen.set(p.id, i);
        if (typeof p.name !== 'string' || !p.name.trim()) problems.push(`상품 ${p.id}의 이름이 없어요`);
        // 조회 화면이 목록으로 읽는 칸 (A·C 서버 코드 기준: images는 글자마다 trim, partnerLinks는 목록 처리) — 모양이 다르면 조회가 실패함
        if (p.partnerLinks != null && !Array.isArray(p.partnerLinks)) problems.push(`상품 ${p.id}의 판매처 링크가 목록이 아니에요`);
        if (p.images != null && (!Array.isArray(p.images) || p.images.some((img) => img && typeof img !== 'string'))) problems.push(`상품 ${p.id}의 사진 칸이 글자 목록이 아니에요`);
        if (/^\d+$/.test(p.id)) { const n = Number(p.id); if (!Number.isSafeInteger(n)) problems.push(`상품 id ${p.id}가 너무 큰 숫자예요`); else maxId = Math.max(maxId, n); }
      });
      ok.push(`상품 ${list.length}개, id 중복 없음${problems.some((x) => x.startsWith('상품 id 중복')) ? ' — 아님' : ''}, 가장 큰 번호 ${maxId || '(숫자 id 없음)'}`);
    }
  } catch (e) { problems.push(`products.json을 읽을 수 없어요 (JSON 오류: ${e.message})`); }
}

// 상품 번호 파일 (등록에 필요 — 없으면 기존 최대 번호 다음부터라 정상, 깨졌으면 손상)
const cf = file('counter.json');
if (fs.existsSync(cf)) {
  const text = fs.readFileSync(cf, 'utf8').trim();
  let value;
  try { value = /^\d+$/.test(text) ? Number(text) : JSON.parse(text)?.counter; } catch { value = undefined; }
  if (!Number.isSafeInteger(value) || value < 0) problems.push(`counter.json이 정확히 셀 수 있는 숫자가 아니에요 ("${text.slice(0, 40)}")`);
  else {
    ok.push(`상품 번호 파일 ${value}`);
    if (maxId && value < maxId) warnings.push(`상품 번호 파일(${value})이 가장 큰 상품 번호(${maxId})보다 작아요 — A·C 모두 기존 최대 번호 다음으로 등록해서 겹치지는 않음`);
  }
} else warnings.push('counter.json 없음 — 새 번호는 기존 최대 번호 다음부터 (정상)');

// 선택 파일
for (const n of ['categories.json', 'locations.json', 'coupons.json', 'view-events.json', 'schema.json']) {
  if (!fs.existsSync(file(n))) continue;
  try { readJson(n); ok.push(`${n} 읽기 정상`); } catch (e) { warnings.push(`${n}가 깨져 있어요 (${e.message}) — 선택 파일이라 복구는 계속할 수 있지만 원본을 따로 보관하세요`); }
}
if (fs.existsSync(file('RECOVERY_READ_ONLY'))) ok.push('복구 표시 파일 있음 (조회 전용)');
else warnings.push('복구 표시 파일(RECOVERY_READ_ONLY)이 없어요 — 복구 중이라면 먼저 만드세요');

for (const x of ok) console.log(`✅ ${x}`);
for (const x of warnings) console.log(`⚠️  ${x}`);
for (const x of problems) console.log(`❌ ${x}`);
console.log(problems.length ? '결과: 손상 — 원본을 그대로 두고 멈추세요 (빈 데이터·기본값으로 덮어쓰지 않음)' : '결과: 정상');
process.exit(problems.length ? 1 : 0);
