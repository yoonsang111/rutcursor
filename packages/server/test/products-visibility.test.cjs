// 비활성 상품 공개 숨김만 (최소 수정) — 실제 서버를 임시 데이터 폴더로 띄워서 확인, 운영 데이터는 건드리지 않음)
// 실행: node --test packages/server/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const KEY = 'test-admin-key-0123456789abcdef';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-server-test-'));
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify([
    { id: '1', name: '공개 상품', isAvailable: true, images: ['https://x/a.jpg'], price: 1000, partnerLinks: [{ partner: 'P', url: 'https://p.com/1', source: 'manual' }], views: 0 },
    { id: '2', name: '숨긴 상품', isAvailable: false, images: [], partnerLinks: [{ partner: 'P', url: 'https://p.com/2', source: 'manual' }], views: 0 },
  ]));
  fs.writeFileSync(path.join(dir, 'counter.json'), JSON.stringify({ counter: 10 }));
  const port = 41000 + Math.floor(Math.random() * 2000);
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/counter`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  return { base, dir, stop: () => proc.kill() };
}
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };

test('비활성 상품: 공개 목록·상세·조회수·통계에서 빠지고, 관리자 키·로그인 쿠키로는 보임', async () => {
  const s = await startServer();
  try {
    const pub = await (await fetch(`${s.base}/products`)).json();
    assert.deepEqual(pub.map(p => p.id), ['1']);
    assert.equal((await fetch(`${s.base}/products/2`)).status, 404);
    assert.equal((await fetch(`${s.base}/products/2/view`, { method: 'POST' })).status, 404);
    const metrics = await (await fetch(`${s.base}/metrics/views`)).json();
    assert.ok(![...metrics.topBy7d, ...metrics.topBy30d].some(m => m.id === '2'));
    const all = await (await fetch(`${s.base}/products`, { headers: admin })).json();
    assert.deepEqual(all.map(p => p.id).sort(), ['1', '2']);
    assert.equal((await fetch(`${s.base}/products/2`, { headers: admin })).status, 200);
    // 어드민 화면처럼 로그인 쿠키로
    const login = await fetch(`${s.base}/admin/login`, { method: 'POST', headers: admin });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie.startsWith('ts_admin_session='));
    const viaCookie = await (await fetch(`${s.base}/products`, { headers: { cookie } })).json();
    assert.equal(viaCookie.length, 2);
    const stored = JSON.parse(fs.readFileSync(path.join(s.dir, 'products.json'), 'utf8'));
    assert.equal(stored.find(p => p.id === '2').views, 0, '관리자 상세 조회는 조회수에 안 셈');
  } finally { s.stop(); }
});

test('캐시: 관리자 응답은 저장 금지, 손님 응답은 매번 확인 / 둘이 섞이지 않게 Vary / 틀린 키는 손님과 같음', async () => {
  const s = await startServer();
  try {
    const pub = await fetch(`${s.base}/products`);
    assert.equal(pub.headers.get('cache-control'), 'no-cache');
    assert.match(pub.headers.get('vary') || '', /Cookie/);
    assert.match(pub.headers.get('vary') || '', /X-Admin-Key/i);
    const adm = await fetch(`${s.base}/products`, { headers: admin });
    assert.equal(adm.headers.get('cache-control'), 'private, no-store');
    assert.equal((await fetch(`${s.base}/products/2`, { headers: admin })).headers.get('cache-control'), 'private, no-store');
    const wrong = await (await fetch(`${s.base}/products`, { headers: { 'x-admin-key': 'wrong' } })).json();
    assert.deepEqual(wrong.map(p => p.id), ['1'], '틀린 키는 공개만');
    assert.equal((await fetch(`${s.base}/products/2`, { headers: { cookie: 'ts_admin_session=forged' } })).status, 404, '가짜 쿠키는 공개만');
  } finally { s.stop(); }
});

test('호환: 손님 상세 조회수는 그대로 셈, 봇 조회는 안 셈, 관리자 수정·숨김 해제는 그대로', async () => {
  const s = await startServer();
  const stored = () => JSON.parse(fs.readFileSync(path.join(s.dir, 'products.json'), 'utf8'));
  try {
    assert.equal((await fetch(`${s.base}/products/1`, { headers: { 'user-agent': 'Mozilla/5.0' } })).status, 200);
    assert.equal(stored().find(p => p.id === '1').views, 1, '손님 조회수');
    assert.equal((await fetch(`${s.base}/products/2/view`, { method: 'POST', headers: { 'user-agent': 'Googlebot' } })).status, 404, '봇도 비활성은 404');
    const r = await fetch(`${s.base}/products/2`, { method: 'PUT', headers: admin, body: JSON.stringify({ isAvailable: true }) });
    assert.equal(r.status, 200, '관리자 활성화는 예전처럼 (이 수정은 공개 조건을 새로 만들지 않음)');
    assert.equal((await fetch(`${s.base}/products/2`)).status, 200, '활성화하면 바로 공개');
    await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ isAvailable: false }) });
    assert.deepEqual((await (await fetch(`${s.base}/products`)).json()).map(p => p.id), ['2'], '숨기면 바로 공개 목록에서 빠짐');
  } finally { s.stop(); }
});
