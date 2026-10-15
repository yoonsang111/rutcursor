// C 공통 규칙 시험 (설계서 v2 C-1~C-10, 구현 전에 작성한 실패 조건)
// 실제 서버를 임시 데이터 폴더로 띄운 HTTP 시험. 실행: node --test packages/server/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const KEY = 'test-admin-key-0123456789abcdef';
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };
const IMG = 'https://img.example.com/real.jpg';
const T0 = '2026-10-14T00:00:00.000Z';
const T1 = '2026-10-15T00:00:00.000Z';
const OLD = '2026-10-01T00:00:00.000Z';
const ok = { status: 'available', source: '판매처', checkedAt: T0, scope: { whole: true } };
const klook = (extra = {}) => ({ partner: 'KLOOK', url: 'https://www.klook.com/activity/1', source: 'manual', externalId: '1', price: 30000, priceCurrency: 'KRW', priceConditions: '성인 1인', priceCheckedAt: T0, priceDisplay: '30,000원~', availability: ok, ...extra });
const seed = () => [{ id: '1', name: '상품', publishStatus: 'published', isAvailable: true, images: [IMG], views: 0, rev: 5, partnerLinks: [klook(), { partner: 'KKday', url: 'https://www.kkday.com/p/2', source: 'manual', price: 100, priceCurrency: 'USD', priceConditions: '성인', priceCheckedAt: T0 }] }];

let portBase = 30000 + Math.floor(Math.random() * 8000);
async function startServer(products = seed(), { dir = null, env = {} } = {}) {
  dir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'ts-rules-'));
  if (products) fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(products));
  if (!fs.existsSync(path.join(dir, 'counter.json'))) fs.writeFileSync(path.join(dir, 'counter.json'), '10');
  const port = portBase++;
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY, ...env }, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', d => (stderr += d));
  const exited = new Promise(r => proc.on('exit', (code, signal) => r(code ?? signal)));
  const base = `http://127.0.0.1:${port}/api`;
  let up = false;
  for (let i = 0; i < 150 && !up; i++) {
    if (proc.exitCode !== null || proc.signalCode !== null) break;
    try { await fetch(`${base}/counter`); up = true; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  const file = path.join(dir, 'products.json');
  return { base, dir, file, up, proc, exited, stderr: () => stderr, stored: () => JSON.parse(fs.readFileSync(file, 'utf8')), stop: async () => { if (proc.exitCode === null && proc.signalCode === null) { proc.kill(); await exited; } } };
}
const put = (s, id, body) => fetch(`${s.base}/products/${id}`, { method: 'PUT', headers: admin, body: JSON.stringify(body) });
const link0 = s => s.stored().find(p => p.id === '1').partnerLinks.find(l => l.partner.trim().toLowerCase() === 'klook');

// ── C-1 작성자 하나 (정체성·별칭·지원 안 하는 구성) ──
test('C-1 같은 데이터 폴더를 다른 경로(심볼릭 링크 폴더·이름 바꾼 경로)로 열어도 두 번째 서버는 시작하지 않음', async () => {
  const s = await startServer();
  try {
    const alias = path.join(os.tmpdir(), `ts-alias-${process.pid}-${Date.now()}`);
    fs.symlinkSync(s.dir, alias);
    try {
      const second = await startServer(null, { dir: alias });
      assert.equal(second.up, false, '별칭 경로 서버가 시작함');
      assert.notEqual(await second.exited, 0);
      assert.match(second.stderr(), /같은 데이터|다른 서버/);
    } finally { fs.unlinkSync(alias); }
    assert.equal((await put(s, '1', { tags: ['a'] })).status, 200, '첫 서버는 계속 저장');
  } finally { await s.stop(); }
});

test('C-1 products.json이 심볼릭 링크·하드 링크면 시작 거절 (폴더 잠금으로 보호 못 하는 구성)', async () => {
  for (const kind of ['symlink', 'hardlink']) {
    const real = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-real-'));
    fs.writeFileSync(path.join(real, 'products.json'), JSON.stringify(seed()));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-linked-'));
    if (kind === 'symlink') fs.symlinkSync(path.join(real, 'products.json'), path.join(dir, 'products.json'));
    else fs.linkSync(path.join(real, 'products.json'), path.join(dir, 'products.json'));
    const s = await startServer(null, { dir });
    try {
      assert.equal(s.up, false, kind);
      assert.match(s.stderr(), /링크/);
    } finally { await s.stop(); }
  }
});

test('C-1 잠금 포트를 다른 프로그램이 쥐면 시작 거절하고 이유를 구분해 알림 (파일 무변경), 환경 변수로 포트를 바꿀 수 없음', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-port-'));
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(seed()));
  const { writerLockPort, writerLockKey } = await import('../src/writerLock.js');
  const port = writerLockPort(await writerLockKey(dir));
  const holder = require('net').createServer(sock => { sock.end('HTTP/1.1 200 OK\r\n\r\nnot-ts'); });
  await new Promise(r => holder.listen({ host: '127.0.0.1', port, exclusive: true }, r));
  const before = fs.readFileSync(path.join(dir, 'products.json'), 'utf8');
  try {
    const s = await startServer(null, { dir, env: { WRITER_LOCK_PORT: String(port + 1) } });
    assert.equal(s.up, false, '환경 변수로 다른 포트를 써서 시작함');
    assert.match(s.stderr(), /다른 프로그램/);
    await s.stop();
  } finally { holder.close(); }
  assert.equal(fs.readFileSync(path.join(dir, 'products.json'), 'utf8'), before);
  assert.ok(!fs.existsSync(path.join(dir, 'schema.json')), '잠금 전에 아무것도 안 씀');
});

test('C-1 강제 종료(kill -9) 직후 같은 데이터로 새 서버가 바로 시작', async () => {
  const s = await startServer();
  s.proc.kill('SIGKILL'); await s.exited;
  const t = Date.now();
  const s2 = await startServer(null, { dir: s.dir });
  try { assert.ok(s2.up); assert.ok(Date.now() - t < 10000); } finally { await s2.stop(); }
});

// ── C-9 저장 중 강제 종료 ──
test('C-9 저장 도중(임시 파일 쓴 뒤·이름 바꾸기 전/후) 강제 종료돼도 상품 파일은 이전 또는 새 완전본', async () => {
  for (const at of ['before-rename', 'after-rename']) {
    const s = await startServer(seed(), { env: { TS_TEST_CRASH_AT: at } });
    const before = fs.readFileSync(s.file, 'utf8');
    await put(s, '1', { name: `바뀜-${at}` }).catch(() => null);
    assert.notEqual(await s.exited, 0, `${at}에서 멈추지 않음`);
    const text = fs.readFileSync(s.file, 'utf8');
    const parsed = JSON.parse(text);
    if (at === 'before-rename') assert.equal(text, before, '이름 바꾸기 전 종료 → 이전 파일 그대로');
    else assert.equal(parsed.find(p => p.id === '1').name, `바뀜-${at}`, '이름 바꾼 뒤 종료 → 새 파일');
    assert.ok(!fs.readdirSync(s.dir).some(f => f.endsWith('.tmp') && at === 'after-rename'), '남은 임시 파일 없음');
    const s2 = await startServer(null, { dir: s.dir });
    try { assert.ok(s2.up, '다시 시작'); } finally { await s2.stop(); }
  }
});

// ── C-3·4·5 판매처 정체성·가격 묶음 ──
test('C-4 일반 수정에서 가격 칸을 안 보내면 가격 묶음·표시 문구·예약 상태 그대로 (이름만·판매처 목록에 주소만)', async () => {
  const s = await startServer();
  try {
    assert.equal((await put(s, '1', { name: '이름만' })).status, 200);
    assert.deepEqual(link0(s), klook());
    const r = await put(s, '1', { partnerLinks: [{ partner: 'KLOOK', url: 'https://www.klook.com/activity/1' }, { partner: 'KKday', url: 'https://www.kkday.com/p/2' }] });
    assert.equal(r.status, 200, await r.text());
    const l = link0(s);
    assert.deepEqual([l.price, l.priceCurrency, l.priceConditions, l.priceCheckedAt, l.priceDisplay, l.externalId], [30000, 'KRW', '성인 1인', T0, '30,000원~', '1']);
    assert.deepEqual(l.availability, ok);
    assert.equal(s.stored()[0].partnerLinks[1].priceCurrency, 'USD', '외화 통화도 그대로');
  } finally { await s.stop(); }
});

test('C-4 값·통화·조건 중 하나라도 바뀌면 새 확인: 값·통화·조건·확인 시각이 다 있어야 하고, 없으면 400 (조용히 지우지 않음)', async () => {
  const s = await startServer();
  try {
    const cases = [
      { price: 35000 }, { priceCurrency: 'USD' }, { priceConditions: '2인' }, { price: 35000, priceCurrency: 'KRW', priceConditions: '성인 1인' },
      { price: 35000, priceCurrency: 'KRW', priceCheckedAt: T1 }, // 조건 키 없음 ('조건 없음'이면 빈 문자열을 명시)
    ];
    for (const c of cases) {
      const r = await put(s, '1', { partnerLinks: [{ partner: 'KLOOK', url: 'https://www.klook.com/activity/1', ...c }] });
      assert.equal(r.status, 400, JSON.stringify(c));
      assert.match((await r.json()).error, /KLOOK/);
      assert.deepEqual(link0(s), klook(), '거절되면 그대로');
    }
    const r = await put(s, '1', { partnerLinks: [{ partner: 'KLOOK', url: 'https://www.klook.com/activity/1', price: 35000, priceCurrency: 'KRW', priceConditions: '', priceCheckedAt: T1 }] });
    assert.equal(r.status, 200);
    const l = link0(s);
    assert.deepEqual([l.price, l.priceCurrency, l.priceConditions, l.priceCheckedAt, l.priceDisplay], [35000, 'KRW', '', T1, undefined], '새 확인이면 옛 표시 문구는 버림');
    assert.deepEqual(l.availability, ok, '가격을 바꿔도 예약 상태는 그대로');
  } finally { await s.stop(); }
});

test('C-4 같은 값으로 확인 시각만 새로 = 갱신, 저장된 것보다 옛 확인 시각 = 409 (옛 화면·옛 자동화 덮어쓰기 방지)', async () => {
  const s = await startServer();
  try {
    const same = { partner: 'KLOOK', url: 'https://www.klook.com/activity/1', price: 30000, priceCurrency: 'KRW', priceConditions: '성인 1인' };
    assert.equal((await put(s, '1', { partnerLinks: [{ ...same, priceCheckedAt: T1 }] })).status, 200);
    assert.equal(link0(s).priceCheckedAt, T1);
    assert.equal((await put(s, '1', { partnerLinks: [{ ...same, price: 29000, priceCheckedAt: OLD }] })).status, 409);
    assert.equal((await put(s, '1', { partnerLinks: [{ ...same, priceCheckedAt: OLD }] })).status, 409);
    assert.equal(link0(s).price, 30000);
  } finally { await s.stop(); }
});

test('C-4 가격 삭제는 null·0만 (묶음·표시 문구 함께 삭제), 빈 글자·숫자 아님·음수·NaN·true·배열·미래 시각·잘못된 통화·너무 긴 조건은 400', async () => {
  const s = await startServer();
  try {
    const u = { partner: 'KLOOK', url: 'https://www.klook.com/activity/1' };
    const full = { priceCurrency: 'KRW', priceConditions: '', priceCheckedAt: T1 };
    for (const bad of [{ price: '' }, { price: 'abc', ...full }, { price: -1, ...full }, { price: true, ...full }, { price: [1], ...full }, { price: 'NaN', ...full },
      { price: 1000, priceCurrency: 'won', priceConditions: '', priceCheckedAt: T1 }, { price: 1000, priceCurrency: 'KRW', priceConditions: '', priceCheckedAt: '2099-01-01T00:00:00Z' },
      { price: 1000, priceCurrency: 'KRW', priceConditions: 'x'.repeat(201), priceCheckedAt: T1 }, { price: 1000, priceCurrency: 'KRW', priceConditions: '', priceCheckedAt: 'yesterday' }]) {
      assert.equal((await put(s, '1', { partnerLinks: [{ ...u, ...bad }] })).status, 400, JSON.stringify(bad));
    }
    for (const bad of [{ rating: 6 }, { rating: 'x' }, { reviewCount: -1 }, { price: 'abc' }, { price: '' }, { images: ['https://via.placeholder.com/1'] }, { images: ['data:image/png;base64,'] }]) {
      assert.equal((await put(s, '1', bad)).status, 400, JSON.stringify(bad));
    }
    assert.deepEqual(link0(s), klook(), '거절되면 그대로');
    assert.equal((await put(s, '1', { partnerLinks: [{ ...u, price: null }] })).status, 200);
    const l = link0(s);
    assert.deepEqual([l.price, l.priceCurrency, l.priceConditions, l.priceCheckedAt, l.priceDisplay], [undefined, undefined, undefined, undefined, undefined]);
    assert.deepEqual(l.availability, ok);
  } finally { await s.stop(); }
});

test('C-3·5 판매처 정체성: 주소가 바뀌고 외부 번호가 없으면 새 판매처(승계 없음), 외부 번호가 다르면 새 판매처, 판매처 이름만 같다고 승계 안 함', async () => {
  const s = await startServer([{ ...seed()[0], partnerLinks: [{ partner: 'Manual', url: 'https://a.example.com/x', source: 'manual', price: 5000, priceCurrency: 'KRW', priceConditions: '', priceCheckedAt: T0, availability: ok }, klook()] }]);
  try {
    // 1) 외부 번호 없는 판매처 주소 변경 → 새 판매처: 가격 칸을 안 보냈으니 가격 없음, 예약 상태 없음
    let r = await put(s, '1', { partnerLinks: [{ partner: 'Manual', url: 'https://a.example.com/y' }, { partner: 'KLOOK', url: 'https://www.klook.com/activity/1' }] });
    assert.equal(r.status, 200);
    let m = s.stored()[0].partnerLinks.find(l => l.partner === 'Manual');
    assert.deepEqual([m.url, m.price, m.availability], ['https://a.example.com/y', undefined, undefined]);
    // 2) 같은 주소인데 외부 번호를 다르게 → 새 판매처
    r = await put(s, '1', { partnerLinks: [{ partner: 'KLOOK', url: 'https://www.klook.com/activity/1', externalId: '999' }] });
    assert.equal(r.status, 200);
    const k = link0(s);
    assert.deepEqual([k.externalId, k.price, k.availability], ['999', undefined, undefined]);
    // 3) 같은 판매처 이름 + 새 주소 + 가격 숫자만 → 새 판매처의 가격이라 정보가 다 있어야 함
    r = await put(s, '1', { partnerLinks: [{ partner: 'KLOOK', url: 'https://www.klook.com/activity/2', price: 30000 }] });
    assert.equal(r.status, 400);
  } finally { await s.stop(); }
});

test('C-3 모호한 요청은 400: 요청 안에 같은 판매처 둘, 한 요청 판매처가 기존 두 판매처에 걸림, 외부 번호 숫자·글자 같은 값은 같은 판매처', async () => {
  const s = await startServer();
  try {
    const k = { partner: 'KLOOK', url: 'https://www.klook.com/activity/1' };
    assert.equal((await put(s, '1', { partnerLinks: [k, k] })).status, 400);
    assert.equal((await put(s, '1', { partnerLinks: [{ partner: 'KLOOK', url: 'https://www.kkday.com/p/2', externalId: '1' }] })).status, 400, '외부 번호는 KLOOK 1, 주소는 KKday 판매처');
    assert.equal((await put(s, '1', { partnerLinks: [{ partner: ' klook ', url: 'https://www.klook.com/activity/1', externalId: 1 }, { partner: 'KKday', url: 'https://www.kkday.com/p/2' }] })).status, 200);
    assert.equal(link0(s).priceCheckedAt, T0, '같은 판매처로 보고 정보 유지');
  } finally { await s.stop(); }
});

// ── C-7 옛 화면 덮어쓰기 ──
test('C-7 어드민이 읽은 뒤 다른 저장이 있으면(rev 다름) 409, 맞으면 저장되고 rev 증가 / 조회수는 rev를 바꾸지 않음', async () => {
  const s = await startServer();
  try {
    assert.equal((await put(s, '1', { name: 'a', baseRev: 4 })).status, 409);
    const r = await put(s, '1', { name: 'b', baseRev: 5 });
    assert.equal(r.status, 200);
    assert.equal(s.stored()[0].rev, 6);
    await fetch(`${s.base}/products/1`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    assert.equal(s.stored()[0].rev, 6, '조회수는 내용 변경이 아님');
    assert.equal((await put(s, '1', { name: 'c', rev: 99 })).status, 200);
    assert.equal(s.stored()[0].rev, 7, 'rev는 서버만 정함');
  } finally { await s.stop(); }
});

test('C-7 같은 상품의 다른 칸·같은 판매처의 가격과 예약 상태를 동시에 고쳐도 둘 다 남음 (40건)', async () => {
  const s = await startServer();
  try {
    const jobs = [];
    for (let i = 0; i < 20; i++) jobs.push(put(s, '1', { [`f${i}`]: i }));
    for (let i = 0; i < 10; i++) jobs.push(fetch(`${s.base}/products/1/partner-prices`, { method: 'PUT', headers: admin, body: JSON.stringify({ updates: [{ externalId: '1', price: 30000 + i, priceCurrency: 'KRW', priceConditions: '성인 1인', priceCheckedAt: new Date(Date.parse(T1) + i * 1000).toISOString() }] }) }));
    for (let i = 0; i < 10; i++) jobs.push(fetch(`${s.base}/products/1/partner-availability`, { method: 'PUT', headers: admin, body: JSON.stringify({ updates: [{ externalId: '1', availability: { ...ok, checkedAt: new Date(Date.parse(T1) + i * 1000).toISOString() } }] }) }));
    const rs = await Promise.all(jobs);
    assert.ok(rs.every(r => r.status === 200 || r.status === 409), rs.map(r => r.status).join(','));
    const p = s.stored()[0];
    for (let i = 0; i < 20; i++) assert.equal(p[`f${i}`], i, `f${i}`);
    const l = p.partnerLinks.find(x => x.partner === 'KLOOK');
    assert.ok(l.price >= 30000 && l.priceCurrency === 'KRW' && l.availability.status === 'available');
  } finally { await s.stop(); }
});

// ── C-6 정리 알림, C-8 조회 전용·schema ──
test('C-6 저장된 예전 데이터의 정리(placeholder 사진)는 응답 warnings로 알림', async () => {
  const s = await startServer([{ ...seed()[0], images: [IMG, 'https://via.placeholder.com/1'] }]);
  try {
    const r = await put(s, '1', { tags: ['x'] });
    assert.equal(r.status, 200);
    assert.ok((await r.json()).warnings.some(w => /placeholder|사진/.test(w)));
  } finally { await s.stop(); }
});

function fingerprint(dir) {
  const out = {};
  for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isFile()) out[f] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
  return out;
}
test('C-8 시작하면 schema.json 기록 / RECOVERY_READ_ONLY면 모든 쓰기 503·GET 쓰기 0·스크립트 API도 503', async () => {
  const s = await startServer();
  try {
    assert.equal(JSON.parse(fs.readFileSync(path.join(s.dir, 'schema.json'), 'utf8')).schemaVersion, 2);
  } finally { await s.stop(); }
  fs.writeFileSync(path.join(s.dir, 'RECOVERY_READ_ONLY'), '시험');
  const r = await startServer(null, { dir: s.dir });
  try {
    const before = fingerprint(r.dir);
    for (const [m, p, b] of [['PUT', '/products/1', { name: 'x' }], ['POST', '/products', { name: 'n' }], ['PUT', '/products/1/partner-prices', { updates: [{ externalId: '1', price: null }] }], ['POST', '/products/1/view'], ['DELETE', '/products/1']]) {
      assert.equal((await fetch(`${r.base}${p}`, { method: m, headers: { ...admin, 'user-agent': 'Mozilla/5.0' }, body: b ? JSON.stringify(b) : undefined })).status, 503, `${m} ${p}`);
    }
    for (const p of ['/products', '/products/1', '/metrics/views', '/categories', '/locations']) await fetch(`${r.base}${p}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    assert.deepEqual(fingerprint(r.dir), before);
    assert.match((await (await fetch(`${r.base}/admin/session`)).json()).readOnly, /복구/);
  } finally { await r.stop(); }
});

// ── C-10 숨김 반영 알림 순서 ──
test('C-10 숨김 → 재공개 → 숨김 뒤 늦게 온 첫 번째 빌드 완료 알림은 반영 중을 끝내지 않음', async () => {
  const s = await startServer(seed(), { env: { VISIBILITY_SYNC_KEY: 'sync-key-0123456789' } });
  try {
    await put(s, '1', { publishStatus: 'hidden' });
    const hide1At = new Date().toISOString();
    await new Promise(r => setTimeout(r, 30));
    await put(s, '1', { publishStatus: 'published' });
    await new Promise(r => setTimeout(r, 30));
    await put(s, '1', { publishStatus: 'hidden' });
    const r = await fetch(`${s.base}/admin/visibility-synced`, { method: 'POST', headers: { 'x-visibility-sync-key': 'sync-key-0123456789', 'Content-Type': 'application/json' }, body: JSON.stringify({ fetchedAt: hide1At, runId: '1' }) });
    assert.equal(r.status, 200);
    assert.equal(s.stored()[0].visibilitySync.state, 'pending');
  } finally { await s.stop(); }
});

// Codex R6 '부분 PUT id·views 보호 및 같은 칸 최종 완료 요청 유지'의 대체: 잘못된 가격 'bad'는 이제 400(대표 결정 2026-10-15), 나머지 보호는 그대로
test('R6 대체: 일반 수정으로 id·조회수를 바꿀 수 없고, 같은 칸을 차례로 고치면 나중 요청이 남음 / 잘못된 가격은 400이고 그 요청의 다른 칸도 저장 안 됨', async () => {
  const s = await startServer();
  try {
    const views = s.stored()[0].views;
    assert.equal((await put(s, '1', { name: '첫째', id: '다름', views: 99 })).status, 200);
    assert.equal(s.stored()[0].id, '1');
    assert.equal(s.stored()[0].views, views);
    assert.equal((await put(s, '1', { name: '둘째', price: 'bad' })).status, 400);
    assert.equal(s.stored()[0].name, '첫째', '거절된 요청의 이름은 저장 안 됨');
    assert.equal((await put(s, '1', { name: '셋째' })).status, 200);
    assert.equal(s.stored()[0].name, '셋째');
  } finally { await s.stop(); }
});
