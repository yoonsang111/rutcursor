// 상품 공개 범위·중복 등록 방지·활성화 점검 (실제 서버를 임시 데이터 폴더로 띄워서 확인, 운영 데이터는 건드리지 않음)
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
    const pubRes = await fetch(`${s.base}/products`);
    assert.equal(pubRes.headers.get('x-tourstream-products-api'), '2', '사무실이 새 기능을 알아보는 표시');
    const pub = await pubRes.json();
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

test('같은 요청 번호로 두 번 등록하면 상품은 하나 (두 번째는 처음 상품을 돌려줌)', async () => {
  const s = await startServer();
  try {
    const body = JSON.stringify({ name: '새 상품', isAvailable: false, partnerLinks: [{ partner: 'P', url: 'https://p.com/new', source: 'manual' }], clientRequestId: 'req-abc' });
    const a = await fetch(`${s.base}/products`, { method: 'POST', headers: admin, body });
    const b = await fetch(`${s.base}/products`, { method: 'POST', headers: admin, body });
    assert.equal(a.status, 201);
    assert.equal(b.status, 200);
    assert.equal((await a.json()).id, (await b.json()).id);
    const stored = JSON.parse(fs.readFileSync(path.join(s.dir, 'products.json'), 'utf8'));
    assert.equal(stored.filter(p => p.name === '새 상품').length, 1);
    const c = await fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify({ name: '요청 번호 없음', isAvailable: false, partnerLinks: [] }) });
    assert.equal(c.status, 201, '요청 번호 없는 기존 등록 방식도 그대로 동작');
  } finally { s.stop(); }
});

test('비활성 → 활성: 사진·가격·판매 링크가 없으면 거절하고 빠진 것을 알려 줌 / 다 있으면 활성화', async () => {
  const s = await startServer();
  try {
    for (const body of [{ isAvailable: true, images: ['https://x/b.jpg'], price: 'not-a-price' }, { isAvailable: true, images: ['https://x/b.jpg'], price: -5 }, { isAvailable: true, images: ['https://x/b.jpg'], price: 1000, partnerLinks: [{ partner: 'P', url: 'javascript:alert(1)', source: 'manual' }] }, { isAvailable: true, images: ['photo'], price: 1000 }]) {
      const r = await fetch(`${s.base}/products/2`, { method: 'PUT', headers: admin, body: JSON.stringify(body) });
      assert.equal(r.status, 400, `잘못된 값으로 활성화 거절: ${JSON.stringify(body)}`);
    }
    const stillHidden = JSON.parse(fs.readFileSync(path.join(s.dir, 'products.json'), 'utf8')).find(p => p.id === '2');
    assert.equal(stillHidden.isAvailable, false, '거절되면 비활성 그대로');
    const bad = await fetch(`${s.base}/products/2`, { method: 'PUT', headers: admin, body: JSON.stringify({ isAvailable: true }) });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /사진.*가격/);
    const good = await fetch(`${s.base}/products/2`, { method: 'PUT', headers: admin, body: JSON.stringify({ isAvailable: true, images: ['https://x/b.jpg'], price: 2000 }) });
    assert.equal(good.status, 200);
    assert.equal((await good.json()).isAvailable, true);
    const edit = await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ name: '이름만 수정' }) });
    assert.equal(edit.status, 200, '이미 활성인 상품 수정은 점검 대상 아님');
  } finally { s.stop(); }
});

test('동시 등록: 서로 다른 요청은 모두 보존, 같은 요청 번호는 하나만 생성 / 수정과 조회수 증가가 겹쳐도 조회수 유지', async () => {
  const s = await startServer();
  try {
    const post = body => fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify({ isAvailable: false, partnerLinks: [], ...body }) });
    const rs = await Promise.all([post({ name: '동시 A', clientRequestId: 'a' }), post({ name: '동시 B', clientRequestId: 'b' }), post({ name: '같은 요청', clientRequestId: 'same' }), post({ name: '같은 요청', clientRequestId: 'same' })]);
    assert.deepEqual(rs.map(r => r.status).slice(0, 2), [201, 201]);
    assert.deepEqual(rs.slice(2).map(r => r.status).sort(), [200, 201]);
    const stored = JSON.parse(fs.readFileSync(path.join(s.dir, 'products.json'), 'utf8'));
    assert.equal(stored.filter(p => p.name.startsWith('동시')).length, 2);
    assert.equal(stored.filter(p => p.name === '같은 요청').length, 1);
    assert.equal(new Set(stored.map(p => p.id)).size, stored.length, '상품 번호 중복 없음');
    const [put] = await Promise.all([fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ name: '수정' }) }), fetch(`${s.base}/products/1/view`, { method: 'POST' })]);
    assert.equal(put.status, 200);
    const one = JSON.parse(fs.readFileSync(path.join(s.dir, 'products.json'), 'utf8')).find(p => p.id === '1');
    assert.equal(one.name, '수정');
    assert.equal(one.views, 1, '조회수 1 유지');
  } finally { s.stop(); }
});
