// 복구 왕복 시험 (설계서 v2 A-2·C-8): C(새 버전)로 데이터를 만든 뒤 → 강제 종료 → A(복구 서버)로 같은 데이터 → 다시 C.
// 사용: node packages/server/test/recovery-roundtrip.mjs <A 폴더(rutcursor-hide-min)> [상품 사본 JSON]
//   상품 사본이 없으면 시험용 합성 데이터(40개)를 만든다. 운영·외부 접속 없음, 127.0.0.1만.
// 실패가 하나라도 있으면 종료 코드 1.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import assert from 'assert/strict';
import { fileURLToPath } from 'url';

const C_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [, , A_ROOT, SNAPSHOT] = process.argv;
if (!A_ROOT) { console.error('사용: node recovery-roundtrip.mjs <A 폴더> [상품 사본 JSON]'); process.exit(2); }
const KEY = 'recovery-admin-key-0123456789abcdef';
const OFFICE_KEY = 'recovery-office-key-0123456789abcdef';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-roundtrip-'));
const file = path.join(dir, 'products.json');
const synthetic = () => Array.from({ length: 40 }, (_, i) => ({
  id: String(100001 + i), name: `시험 상품 ${i}`, isAvailable: i % 4 !== 0, isRecommended: false, views: i, images: i % 3 ? ['https://img.example.com/p.jpg'] : [],
  categories: ['테마파크'], locations: ['일본'], tags: [],
  partnerLinks: [{ partner: 'KLOOK', url: `https://www.klook.com/activity/${i}`, source: 'manual', ...(i % 2 ? { price: 10000 + i } : {}) }],
}));
fs.writeFileSync(file, JSON.stringify(SNAPSHOT ? JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')) : synthetic(), null, 2));
fs.writeFileSync(path.join(dir, 'counter.json'), JSON.stringify({ counter: 100200 }));
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(`✅ ${name}`); } catch (e) { results.push(`❌ ${name} — ${String(e.message).split('\n')[0]}`); } };
const fingerprint = () => {
  const out = {};
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else out[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } };
  walk(dir);
  return out;
};
let portBase = 38000 + Math.floor(Math.random() * 1500);
async function start(root) {
  const port = portBase++;
  const proc = spawn(process.execPath, [path.join(root, 'packages/server/src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY, OFFICE_API_KEY: OFFICE_KEY, GITHUB_DISPATCH_TOKEN: '' }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 150; i++) { try { await fetch(`${base}/counter`); return { base, proc }; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error(`서버 시작 실패: ${root}`);
}
const stop = async (s, signal = 'SIGTERM') => { s.proc.kill(signal); await new Promise((r) => s.proc.on('exit', r)); };
const j = (r) => r.json();

// 1) C로 운영처럼 사용: 이전 → 숨김 → 사무실 초안 → 가격 묶음 → 예약 상태
let s = await start(C_ROOT);
const evidenceFile = path.join(C_ROOT, 'packages/server/scripts/publish-status-evidence.json');
const evidence = SNAPSHOT && fs.existsSync(evidenceFile) ? JSON.parse(fs.readFileSync(evidenceFile, 'utf8')) : {};
const mig = await j(await fetch(`${s.base}/admin/publish-status-migration`, { method: 'POST', headers: admin, body: JSON.stringify({ evidence, apply: true }) }));
const afterMig = JSON.parse(fs.readFileSync(file, 'utf8'));
const count = (st) => afterMig.filter((p) => p.publishStatus === st).length;
results.push(`C 이전 적용: 공개 ${count('published')} · 초안 ${count('draft')} · 숨김 ${count('hidden')} · 분류 필요 ${count('needs_classification')} (백업 ${mig.backup})`);
const published = afterMig.filter((p) => p.publishStatus === 'published');
const hideId = String(published[0].id);
await fetch(`${s.base}/products/${hideId}`, { method: 'PUT', headers: admin, body: JSON.stringify({ publishStatus: 'hidden' }) });
const draft = await j(await fetch(`${s.base}/products`, { method: 'POST', headers: { ...admin, 'x-admin-key': OFFICE_KEY }, body: JSON.stringify({ name: '사무실 초안 (복구 시험)', images: ['https://img.example.com/a.jpg'], partnerLinks: [{ partner: 'P', url: 'https://p.example.com/x' }], clientRequestId: 'recovery-1' }) }));
const priced = published[1];
const pr = await fetch(`${s.base}/products/${priced.id}/partner-prices`, { method: 'PUT', headers: admin, body: JSON.stringify({ updates: [{ index: 0, price: 100, priceCurrency: 'USD', priceConditions: '성인 1인', priceCheckedAt: new Date().toISOString() }] }) });
await check('C에서 외화 가격 묶음 저장', () => assert.equal(pr.status, 200));
const newPublic = (await j(await fetch(`${s.base}/products`))).map((p) => String(p.id)).sort();
const nonPublic = JSON.parse(fs.readFileSync(file, 'utf8')).filter((p) => p.publishStatus !== 'published').map((p) => String(p.id));
await stop(s, 'SIGKILL'); // 강제 종료

// 2) 복구: A를 같은 데이터로 (표시 파일 없이도 schema.json으로 조회 전용)
const before = fingerprint();
s = await start(A_ROOT);
const pub = (await j(await fetch(`${s.base}/products`))).map((p) => String(p.id)).sort();
await check(`A 손님 목록 = C의 공개 상품 (${newPublic.length}개)`, () => assert.deepEqual(pub, newPublic));
const leaks = [];
for (const id of nonPublic) if ((await fetch(`${s.base}/products/${id}`)).status !== 404) leaks.push(id);
await check(`A 비공개 ${nonPublic.length}개 상세 모두 404`, () => assert.deepEqual(leaks, []));
const all = await j(await fetch(`${s.base}/products`, { headers: admin }));
await check('A 관리자 키로 전체 조회', () => assert.equal(all.length, JSON.parse(fs.readFileSync(file, 'utf8')).length));
const login = await fetch(`${s.base}/admin/login`, { method: 'POST', headers: admin });
const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
await check('A 어드민 로그인 쿠키로 전체 조회', async () => assert.equal((await j(await fetch(`${s.base}/products`, { headers: { cookie } }))).length, all.length));
await check('A 세션 응답이 읽기 전용을 알려 줌 (어드민 배너)', async () => assert.ok((await j(await fetch(`${s.base}/admin/session`, { headers: { cookie } }))).readOnly));
for (const [m, p, b] of [['PUT', `/products/${hideId}`, { tags: ['복구 중 수정'] }], ['PUT', `/products/${draft.id}`, { isAvailable: true }], ['POST', '/products', { name: '복구 중 새 상품' }], ['DELETE', `/products/${priced.id}`]]) {
  const r = await fetch(`${s.base}${p}`, { method: m, headers: admin, body: b ? JSON.stringify(b) : undefined });
  await check(`A ${m} ${p} → 503 (조회 전용)`, () => assert.equal(r.status, 503));
}
for (let i = 0; i < 3; i++) await fetch(`${s.base}/products/${priced.id}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
const pub1 = await j(await fetch(`${s.base}/products/${priced.id}`, { headers: { 'user-agent': 'Mozilla/5.0' } }));
await check('A 손님 응답에 통화가 같이 나감 (C 고객 화면이 원화와 구분)', () => assert.equal(pub1.partnerLinks[0].priceCurrency, 'USD'));
await check('A 손님 응답에 내부 칸 없음', () => assert.ok(!/publishStatus|publishMigration|visibilitySync|clientRequestId|availability|externalId/.test(JSON.stringify(pub1))));
await stop(s);
await check('A 기간 동안 데이터 폴더가 한 바이트도 안 바뀜 (조회수·시작 작업 포함)', () => assert.deepEqual(fingerprint(), before));

// 3) 다시 C
s = await start(C_ROOT);
const pub2 = (await j(await fetch(`${s.base}/products`))).map((p) => String(p.id)).sort();
await check('다시 C: 강제 종료 뒤에도 바로 시작, 공개 목록 그대로', () => assert.deepEqual(pub2, newPublic));
const back = await j(await fetch(`${s.base}/products/${priced.id}`, { headers: admin }));
await check('다시 C: 가격 묶음(USD·조건·확인 시각) 그대로', () => assert.deepEqual([back.partnerLinks[0].price, back.partnerLinks[0].priceCurrency, back.partnerLinks[0].priceConditions], [100, 'USD', '성인 1인']));
await stop(s);

console.log(`# 복구 왕복 (C=${C_ROOT}, A=${A_ROOT}, 데이터=${SNAPSHOT ? '사본' : '합성 40개'})\n${results.join('\n')}`);
fs.rmSync(dir, { recursive: true, force: true });
if (results.some((r) => r.startsWith('❌'))) process.exit(1);
