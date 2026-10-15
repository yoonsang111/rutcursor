// A 데이터 파일 규칙 시험 (13차 설계 재검토 — 구현 전에 작성)
// 필수: products.json(다른 데이터가 있을 때), counter.json(등록에 필요). 선택: view-events.json·categories.json·locations.json·coupons.json·images/
// 선택 파일이 없는 것은 정상. 손상된 필수 데이터는 기본값으로 덮어쓰지 않고, 그 파일에 기대는 쓰기를 거절. 새 번호 = max(카운터, 기존 최대 번호)+1
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const KEY = 'test-admin-key-0123456789abcdef';
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };
const products = () => [1, 5].map(n => ({ id: String(100000 + n), name: `상품 ${n}`, isAvailable: true, images: [], partnerLinks: [{ partner: 'P', url: `https://p.example.com/${n}`, source: 'manual' }], views: 0 }));
let port = 50000 + Math.floor(Math.random() * 1500);
async function start(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-files-'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  const p = port++;
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(p), DATA_DIR: dir, ADMIN_API_KEY: KEY }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${p}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/products`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
  return { base, dir, read, stop: () => new Promise(r => { proc.on('exit', r); proc.kill(); }) };
}
const post = (s, body = { name: '새 상품', isAvailable: false }) => fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify(body) });

test('카운터 파일이 손상되면 등록 거절(503)·상품·카운터 원문 그대로, 카운터 조회는 오류 — 기존 상품 수정은 계속 가능', async () => {
  const s = await start({ 'products.json': JSON.stringify(products()), 'counter.json': '{broken' });
  try {
    const before = s.read('products.json');
    const r = await post(s);
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /번호|카운터/);
    assert.equal(s.read('products.json'), before);
    assert.equal(s.read('counter.json'), '{broken', '손상된 카운터를 기본값으로 덮어쓰지 않음');
    assert.equal((await fetch(`${s.base}/counter`)).status, 500);
    assert.equal((await fetch(`${s.base}/products/100001`, { method: 'PUT', headers: admin, body: JSON.stringify({ tags: ['x'] }) })).status, 200, '번호가 필요 없는 수정은 됨');
  } finally { await s.stop(); }
});

test('카운터 파일이 없거나 뒤처져 있어도 새 번호는 기존 최대 번호 다음 (중복 번호 없음)', async () => {
  for (const counter of [undefined, '100001']) {
    const files = { 'products.json': JSON.stringify(products()) };
    if (counter !== undefined) files['counter.json'] = counter;
    const s = await start(files);
    try {
      const r = await post(s);
      assert.equal(r.status, 201, String(counter));
      assert.equal((await r.json()).id, '100006');
      assert.equal(s.read('counter.json').trim(), '100006');
      const ids = JSON.parse(s.read('products.json')).map(p => p.id);
      assert.equal(new Set(ids).size, ids.length, '번호 중복 없음');
    } finally { await s.stop(); }
  }
});

test('처음 설치(빈 데이터 폴더)는 정상: 등록 가능, 번호 100001부터', async () => {
  const s = await start({});
  try {
    assert.equal((await fetch(`${s.base}/products`)).status, 200);
    const r = await post(s);
    assert.equal(r.status, 201);
    assert.equal((await r.json()).id, '100001');
  } finally { await s.stop(); }
});

test('상품 파일이 없는데 카운터는 있음(데이터가 있던 폴더) → 상품 조회 오류·등록 거절 (빈 목록으로 시작하지 않음)', async () => {
  const s = await start({ 'counter.json': '100005' });
  try {
    assert.equal((await fetch(`${s.base}/products`)).status, 500);
    assert.ok((await post(s)).status >= 500);
    assert.ok(!fs.existsSync(path.join(s.dir, 'products.json')), '빈 상품 파일을 만들지 않음');
  } finally { await s.stop(); }
});

test('선택 파일: 조회 기록이 손상돼도 화면은 정상, 손상 파일은 덮어쓰지 않음 / 분류·지역 파일이 없거나 손상돼도 상품에서 만든 목록으로 정상, 파일 그대로', async () => {
  const s = await start({ 'products.json': JSON.stringify(products()), 'counter.json': '100005', 'view-events.json': '{broken', 'categories.json': '{broken' });
  try {
    assert.equal((await fetch(`${s.base}/products/100001`, { headers: { 'user-agent': 'Mozilla/5.0' } })).status, 200);
    assert.equal((await fetch(`${s.base}/products`)).status, 200);
    assert.equal((await fetch(`${s.base}/metrics/views`)).status, 200);
    assert.equal(s.read('view-events.json'), '{broken', '손상된 조회 기록을 빈 기록으로 덮어쓰지 않음');
    assert.equal((await fetch(`${s.base}/categories`)).status, 200);
    assert.equal((await fetch(`${s.base}/locations`)).status, 200, '지역 파일 없음 = 정상');
    assert.equal(s.read('categories.json'), '{broken');
    assert.equal(JSON.parse(s.read('products.json')).find(p => p.id === '100001').views, 1, '상품 조회수는 계속 셈');
  } finally { await s.stop(); }
});

test('R14 카운터가 정확히 셀 수 없는 큰 수(안전 정수 밖)면 손상으로 보고 등록 거절, 파일 그대로', async () => {
  for (const counter of ['9007199254740992', '99999999999999999999', '{"counter": 9007199254740993}']) {
    const s = await start({ 'products.json': JSON.stringify(products()), 'counter.json': counter });
    try {
      assert.equal((await post(s)).status, 503, counter);
      assert.equal(s.read('counter.json'), counter);
      assert.equal(JSON.parse(s.read('products.json')).length, 2);
    } finally { await s.stop(); }
  }
});

test('R14 상품 파일은 없는데 다른 데이터 파일(분류·지역·쿠폰·조회 기록)이 하나라도 있으면 처음 설치가 아님 → 조회 오류·등록 거절, 상품 파일 안 만듦', async () => {
  for (const name of ['categories.json', 'locations.json', 'coupons.json', 'view-events.json']) {
    const s = await start({ [name]: name === 'view-events.json' ? '{}' : name === 'coupons.json' ? '[]' : '{"mainCategories":[],"countries":[]}' });
    try {
      assert.equal((await fetch(`${s.base}/products`)).status, 500, name);
      assert.ok((await post(s)).status >= 500, name);
      assert.ok(!fs.existsSync(path.join(s.dir, 'products.json')), name);
    } finally { await s.stop(); }
  }
});
