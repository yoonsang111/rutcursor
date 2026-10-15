// A5 조회 전용 복구 모드 시험 (구현 전에 작성한 실패 조건)
// 데이터 폴더에 RECOVERY_READ_ONLY 파일이 있으면: 쓰기 요청 503, GET 중 쓰기(조회수·조회 기록·분류 정리)도 안 함, 파일 직접 쓰기 스크립트는 멈춤.
// 표시 파일이 없으면 기존 동작 그대로. 실행: node --test packages/server/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const KEY = 'test-admin-key-0123456789abcdef';
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };
const IMG = 'https://img.example.com/a.jpg';

// 새 버전(C)이 쓴 모양의 데이터: 공개 상태·판매처 예약 상태·가격 정보·숨김 반영 기록
function newVersionData() {
  return [
    { id: '1', name: '공개', isAvailable: true, publishStatus: 'published', images: [IMG], views: 3, categories: ['테마파크'], locations: ['일본'],
      partnerLinks: [{ partner: 'KLOOK', url: 'https://k.example.com/1', source: 'manual', price: 30000, priceCurrency: 'KRW', priceConditions: '성인 1인', priceCheckedAt: '2026-10-14T00:00:00.000Z', availability: { status: 'available', scope: { whole: true }, source: '판매처', checkedAt: '2026-10-14T00:00:00.000Z' } }],
      visibilitySync: { state: 'done', since: '2026-10-13T00:00:00.000Z', from: 'hidden', to: 'published' } },
    { id: '2', name: '초안', isAvailable: false, publishStatus: 'draft', images: [], partnerLinks: [], views: 0 },
    { id: '3', name: '숨김(모순: 활성)', isAvailable: true, publishStatus: 'hidden', images: [IMG], partnerLinks: [], views: 0 },
  ];
}

async function start(dir, port) {
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/counter`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  return { base, stop: () => new Promise(r => { proc.on('exit', r); proc.kill(); }) };
}
// 데이터 폴더 전체(하위 폴더 포함)의 파일 지문
function fingerprint(dir) {
  const out = {};
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else out[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } };
  walk(dir);
  return out;
}
function setup(readOnly) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-ro-'));
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(newVersionData(), null, 2));
  fs.writeFileSync(path.join(dir, 'counter.json'), '100');
  fs.writeFileSync(path.join(dir, 'view-events.json'), JSON.stringify({ 1: [Date.now() - 100 * 86400e3, Date.now() - 1000] })); // 오래된 기록(정리 대상) 포함
  if (readOnly) fs.writeFileSync(path.join(dir, 'RECOVERY_READ_ONLY'), '2026-10-15 복구 시험');
  return dir;
}

test('조회 전용: 모든 쓰기 요청 503, GET(목록·상세·조회수·통계·분류·지역·쿠폰) 뒤에도 데이터 폴더 지문이 그대로', async () => {
  const dir = setup(true);
  const s = await start(dir, 47000 + Math.floor(Math.random() * 1000));
  try {
    const before = fingerprint(dir);
    const writes = [
      ['POST', '/products', { name: '새 상품', images: ['data:image/png;base64,iVBORw0KGgo='] }],
      ['PUT', '/products/1', { name: '바꿈', isAvailable: true }],
      ['DELETE', '/products/2'],
      ['POST', '/products/1/view'],
      ['POST', '/categories', { mainCategories: [] }],
      ['POST', '/locations', { countries: [] }],
      ['POST', '/coupons', []],
    ];
    for (const [method, p, body] of writes) {
      const r = await fetch(`${s.base}${p}`, { method, headers: { ...admin, 'user-agent': 'Mozilla/5.0' }, body: body ? JSON.stringify(body) : undefined });
      assert.equal(r.status, 503, `${method} ${p}`);
      assert.match((await r.json()).error, /복구|읽기 전용/);
    }
    for (const p of ['/products', '/products/1', '/metrics/views', '/categories', '/locations', '/coupons']) {
      assert.ok((await fetch(`${s.base}${p}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).status < 500, p);
      await fetch(`${s.base}${p}`, { headers: { ...admin, 'user-agent': 'Mozilla/5.0' } });
    }
    // 로그인은 허용 (어드민이 들어와서 조회는 할 수 있게)
    assert.equal((await fetch(`${s.base}/admin/login`, { method: 'POST', headers: admin })).status, 200);
    assert.deepEqual(fingerprint(dir), before, '데이터 폴더가 한 바이트도 바뀌지 않음');
    assert.match((await (await fetch(`${s.base}/admin/session`)).json()).readOnly, /복구/, '어드민이 읽기 전용을 알 수 있음');
    // 손님에게는 여전히 공개만, 관리자는 전체
    assert.deepEqual((await (await fetch(`${s.base}/products`)).json()).map(p => p.id), ['1']);
    assert.equal((await (await fetch(`${s.base}/products`, { headers: admin })).json()).length, 3);
  } finally { await s.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('조회 전용: 서버 시작 때도 아무것도 쓰지 않음 (예전 링크 형식 변환·기본 파일 만들기 포함)', async () => {
  const dir = setup(true);
  const legacy = JSON.parse(fs.readFileSync(path.join(dir, 'products.json'), 'utf8'));
  legacy.push({ id: '9', name: '예전 형식', isAvailable: true, externalUrl: 'https://old.example.com', images: [], views: 0 });
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(legacy));
  fs.unlinkSync(path.join(dir, 'counter.json'));
  const before = fingerprint(dir);
  const s = await start(dir, 48000 + Math.floor(Math.random() * 1000));
  try {
    await fetch(`${s.base}/products`);
    assert.deepEqual(fingerprint(dir), before);
  } finally { await s.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('조회 전용: 파일 직접 쓰기 스크립트(가격·평점 갱신)는 외부 호출 전에 멈추고 파일 그대로', () => {
  const dir = setup(true);
  const before = fingerprint(dir);
  for (const script of ['refresh-partner-prices.mjs', 'refresh-partner-ratings.mjs']) {
    const r = spawnSync(process.execPath, [path.join(__dirname, '../scripts', script)], { env: { ...process.env, DATA_DIR: dir, HTTPS_PROXY: 'http://127.0.0.1:9', HTTP_PROXY: 'http://127.0.0.1:9' }, encoding: 'utf8', timeout: 20000 });
    assert.equal(r.status, 0, `${script}: ${r.stderr}`);
    assert.match(r.stdout + r.stderr, /읽기 전용|복구/, script);
  }
  assert.deepEqual(fingerprint(dir), before);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('새 버전 데이터면 표시 파일이 없어도 조회 전용 (표시를 잊어도 새 칸을 지우지 않음) — schema.json / 상품 공개 상태 칸', async () => {
  for (const variant of ['schema', 'publishStatus']) {
    const dir = setup(false);
    if (variant === 'schema') {
      const legacyShape = newVersionData().map(({ publishStatus, ...rest }) => rest);
      fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(legacyShape, null, 2));
      fs.writeFileSync(path.join(dir, 'schema.json'), JSON.stringify({ schemaVersion: 2 }));
    }
    const s = await start(dir, 49000 + Math.floor(Math.random() * 900));
    try {
      const before = fingerprint(dir);
      const r = await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ name: '이름만' }) });
      assert.equal(r.status, 503, variant);
      await fetch(`${s.base}/products/1`, { headers: { 'user-agent': 'Mozilla/5.0' } });
      assert.deepEqual(fingerprint(dir), before, variant);
      assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'products.json'), 'utf8'))[0].partnerLinks[0].priceCurrency, 'KRW', '새 칸 그대로');
    } finally { await s.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test('예전 데이터(공개 상태 칸·schema.json 없음)이고 표시 파일이 없으면 기존 동작 그대로 (쓰기 가능, 조회수 증가)', async () => {
  const dir = setup(false);
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(newVersionData().map(({ publishStatus, visibilitySync, ...rest }) => rest), null, 2));
  const s = await start(dir, 49000 + Math.floor(Math.random() * 900));
  try {
    assert.equal((await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ tags: ['x'] }) })).status, 200);
    await fetch(`${s.base}/products/1`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    const p = JSON.parse(fs.readFileSync(path.join(dir, 'products.json'), 'utf8')).find(x => x.id === '1');
    assert.deepEqual(p.tags, ['x']);
    assert.equal(p.views, 4);
  } finally { await s.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('손님 응답은 허용 칸만: 위·아래(판매처·SEO) 어디에 새 내부 칸이 있어도 안 나감, 관리자는 전부', async () => {
  const dir = setup(false);
  const data = newVersionData().map(({ publishStatus, visibilitySync, ...rest }) => rest);
  Object.assign(data[0], { auditNote: '내부-감사', seo: { title: 't', description: 'd', keywords: 'k', draftMemo: '내부-SEO' } });
  Object.assign(data[0].partnerLinks[0], { internalNote: '내부-판매처', externalId: 'ext-secret', source: 'api' });
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(data, null, 2));
  const s = await start(dir, 49000 + Math.floor(Math.random() * 900));
  try {
    const texts = [JSON.stringify(await (await fetch(`${s.base}/products`)).json()), JSON.stringify(await (await fetch(`${s.base}/products/1`, { headers: { 'user-agent': 'Mozilla/5.0' } })).json())];
    for (const t of texts) for (const secret of ['내부-감사', '내부-SEO', '내부-판매처', 'ext-secret', 'availability', '"source"']) assert.ok(!t.includes(secret), secret);
    const one = JSON.parse(texts[1]);
    assert.equal(one.partnerLinks[0].priceCurrency, 'KRW', '공개해도 되는 가격 정보는 그대로');
    assert.equal(one.seo.title, 't');
    const adminText = JSON.stringify(await (await fetch(`${s.base}/products`, { headers: admin })).json());
    assert.ok(adminText.includes('내부-감사') && adminText.includes('ext-secret'));
  } finally { await s.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});
