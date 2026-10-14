// 2026-10-14 상품 정책 시험: 공개 상태(초안·공개·숨김·분류 필요)와 판매처 예약 가능 여부, 저장 안전성
// 실제 서버를 임시 데이터 폴더로 띄워 HTTP로 확인 (운영 데이터·외부 네트워크 사용 안 함)
// 실행: node --test packages/server/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const KEY = 'test-admin-key-0123456789abcdef';
const IMG = 'https://img.example.com/real.jpg';
const now = Date.now();
const iso = ms => new Date(ms).toISOString();
const ok = (extra = {}) => ({ status: 'available', source: '판매처 페이지', checkedAt: iso(now - 3600e3), scope: { whole: true }, ...extra }); // 7차: 예약 가능도 확인 범위 필수
const stopped = (extra = {}) => ({ status: 'unavailable', reason: 'sales_stopped', source: '판매처 페이지', checkedAt: iso(now - 3600e3), scope: { whole: true }, ...extra });
const link = (partner, availability) => ({ partner, url: `https://${partner.toLowerCase()}.example.com/p`, source: 'manual', externalId: `ext-${partner}`, ...(availability ? { availability } : {}) });

function seed() {
  return [
    { id: '1', name: '공개 상품', publishStatus: 'published', isAvailable: true, images: [IMG], views: 0, internalNote: '내부 메모', clientRequestId: 'req-1', approvals: [{ by: '대표' }],
      partnerLinks: [link('A', ok()), link('B', stopped()), link('C')] },
    { id: '2', name: '초안 상품', publishStatus: 'draft', isAvailable: false, images: [IMG], views: 0, partnerLinks: [link('A', ok())] },
    { id: '3', name: '숨긴 상품(예전 공개)', publishStatus: 'hidden', isAvailable: false, images: [IMG], views: 5, partnerLinks: [link('A', ok())] },
    { id: '4', name: '예전 비활성', isAvailable: false, images: [IMG], views: 0, partnerLinks: [link('A')] }, // 이전 전 데이터 → 분류 필요
    { id: '5', name: '예전 활성', isAvailable: true, images: [IMG], views: 0, partnerLinks: [link('A')] }, // 이전 전 데이터 → 공개
    { id: '6', name: '모두 판매 중지', publishStatus: 'published', isAvailable: true, images: [IMG], views: 0, partnerLinks: [link('A', stopped()), link('B', stopped({ reason: 'temporary_soldout' }))] },
    { id: '7', name: '하나 중지 하나 미확인', publishStatus: 'published', isAvailable: true, images: [IMG], views: 0, partnerLinks: [link('A', stopped()), link('B', { status: 'unknown', reason: 'captcha', checkedAt: iso(now) })] },
    { id: '8', name: '특정 날짜만 품절', publishStatus: 'published', isAvailable: true, images: [IMG], views: 0,
      partnerLinks: [link('A', { status: 'unavailable', reason: 'temporary_soldout', source: '판매처 달력', checkedAt: iso(now - 10 * 86400e3), scope: { whole: false, dates: ['2026-12-24'], options: ['성인'] } })] },
    { id: '9', name: '공개 placeholder', publishStatus: 'published', isAvailable: true, images: ['https://via.placeholder.com/300'], views: 0, partnerLinks: [link('A')] },
  ];
}

const OFFICE_KEY = 'test-office-key-0123456789abcdef';
async function startServer(products = seed(), env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-policy-'));
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(products));
  fs.writeFileSync(path.join(dir, 'counter.json'), '10');
  const port = 43000 + Math.floor(Math.random() * 2000);
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY, OFFICE_API_KEY: OFFICE_KEY, ...env }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/counter`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  return { base, dir, file: path.join(dir, 'products.json'), stored: () => JSON.parse(fs.readFileSync(path.join(dir, 'products.json'), 'utf8')), stop: () => proc.kill() };
}
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };
const office = { ...admin, 'x-tourstream-actor': 'office' };
const json = r => r.json();

test('공개 상태: 비로그인은 공개만(목록·상세·조회수·통계·분류), 관리자는 초안·숨김·분류 필요까지', async () => {
  const s = await startServer();
  try {
    const pub = await fetch(`${s.base}/products`);
    assert.equal(pub.headers.get('cache-control'), 'no-cache');
    const list = await pub.json();
    assert.deepEqual(list.map(p => p.id).sort(), ['1', '5', '6', '7', '8', '9'], '초안·숨김·분류 필요 제외, 예전 활성은 공개 유지');
    for (const id of ['2', '3', '4']) {
      assert.equal((await fetch(`${s.base}/products/${id}`)).status, 404, `상세 ${id}`);
      assert.equal((await fetch(`${s.base}/products/${id}/view`, { method: 'POST', headers: { 'user-agent': 'Mozilla/5.0' } })).status, 404, `조회수 ${id}`);
    }
    const metrics = await json(await fetch(`${s.base}/metrics/views`));
    assert.ok(![...metrics.topBy7d, ...metrics.topBy30d].some(m => ['2', '3', '4'].includes(m.id)));
    const adminRes = await fetch(`${s.base}/products`, { headers: admin });
    assert.equal(adminRes.headers.get('cache-control'), 'private, no-store', '관리자 응답은 어디에도 저장되지 않게');
    assert.match(adminRes.headers.get('vary') || '', /Cookie/);
    const all = await adminRes.json();
    assert.equal(all.length, 9);
    assert.deepEqual(Object.fromEntries(all.map(p => [p.id, p.publishStatus])), { 1: 'published', 2: 'draft', 3: 'hidden', 4: 'needs_classification', 5: 'published', 6: 'published', 7: 'published', 8: 'published', 9: 'published' });
    assert.equal((await fetch(`${s.base}/products/3`, { headers: admin })).status, 200, '관리자는 숨김 상세도 봄');
    // 로그인 쿠키(어드민 화면)로도 관리자 조회
    const login = await fetch(`${s.base}/admin/login`, { method: 'POST', headers: admin });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    assert.equal((await json(await fetch(`${s.base}/products`, { headers: { cookie } }))).length, 9);
  } finally { s.stop(); }
});

test('공개 API는 손님에게 필요한 칸만 (내부 메모·요청 번호·승인 이력·출처·외부 번호 제외), placeholder 사진 제외', async () => {
  const s = await startServer();
  try {
    const p1 = await json(await fetch(`${s.base}/products/1`, { headers: { 'user-agent': 'Mozilla/5.0' } }));
    const text = JSON.stringify(p1);
    for (const secret of ['internalNote', '내부 메모', 'clientRequestId', 'req-1', 'approvals', 'publishStatus', 'externalId', 'ext-A', '"source"', 'publishMigration']) assert.ok(!text.includes(secret), `공개 API에 ${secret}`);
    const p9 = (await json(await fetch(`${s.base}/products`))).find(p => p.id === '9');
    assert.deepEqual(p9.images, [], 'placeholder는 사진으로 내보내지 않음');
  } finally { s.stop(); }
});

test('판매처 예약 가능 여부: 일부 중지면 계속 노출·중지 판매처만 버튼 주소 없음 / 모두 중지면 bookable none(상세 안내용으로 남김) / 하나라도 미확인이면 단정 안 함 / 특정 날짜 품절은 전체 중지 아님 / 예전 확인 표시', async () => {
  const s = await startServer();
  try {
    const list = await json(await fetch(`${s.base}/products`));
    const by = Object.fromEntries(list.map(p => [p.id, p]));
    assert.equal(by[1].bookable, 'available');
    const [a, b, c] = by[1].partnerLinks;
    assert.equal(a.availability.state, 'available'); assert.ok(a.url);
    assert.equal(b.availability.state, 'stopped'); assert.equal(b.url, undefined, '중지된 판매처는 예약 주소 없음');
    assert.equal(c.availability.state, 'unknown'); assert.ok(c.url, '미확인 판매처 버튼은 유지');
    assert.equal(by[6].bookable, 'none', '모든 판매처 중지 확인');
    assert.ok(by[6].partnerLinks.every(l => !l.url));
    assert.equal((await fetch(`${s.base}/products/6`, { headers: { 'user-agent': 'Mozilla/5.0' } })).status, 200, '상세 주소는 안내용으로 유지');
    assert.equal(by[7].bookable, 'unknown', '하나라도 미확인이면 모두 중지라고 단정하지 않음');
    assert.equal(by[8].bookable, 'available', '특정 날짜·옵션 품절은 상품 전체 중지가 아님');
    assert.equal(by[8].partnerLinks[0].availability.state, 'partial');
    assert.deepEqual(by[8].partnerLinks[0].availability.dates, ['2026-12-24']);
    assert.equal(by[8].partnerLinks[0].availability.stale, true, '10일 전 확인은 예전 확인으로 표시');
    assert.ok(by[8].partnerLinks[0].url);
    assert.equal(by[1].partnerLinks[0].availability.stale, false);
  } finally { s.stop(); }
});

test('판매처 상태 입력 검사: 접근 실패·CAPTCHA·가격 누락은 판매 중지로 저장 불가 / 판매 종료는 근거 필요 / 불가 범위·출처·확인 시각 필수', async () => {
  const s = await startServer();
  try {
    const put = availability => fetch(`${s.base}/products/1/partner-availability`, { method: 'PUT', headers: admin, body: JSON.stringify({ updates: [{ externalId: 'ext-C', availability }] }) });
    for (const bad of [{ status: 'available', source: '판매처', checkedAt: iso(now) }, stopped({ reason: 'captcha' }), stopped({ reason: 'access_failed' }), stopped({ reason: 'price_missing' }), stopped({ reason: 'sales_ended' }), stopped({ scope: {} }), stopped({ source: '' }), stopped({ checkedAt: 'not-a-date' }), { status: 'sold?' }]) {
      const r = await put(bad);
      assert.equal(r.status, 400, JSON.stringify(bad));
    }
    assert.equal((await put({ status: 'unknown', reason: 'captcha', checkedAt: iso(now), scope: { dates: ['2026-12-24'], pax: ['성인 2명'] }, evidence: 'CAPTCHA 화면' })).status, 200, 'CAPTCHA는 확인 못 함으로');
    const unk = s.stored().find(p => p.id === '1').partnerLinks[2].availability;
    assert.deepEqual([unk.scope.dates, unk.scope.pax, unk.evidence], [['2026-12-24'], ['성인 2명'], 'CAPTCHA 화면'], '확인 못 함도 범위·근거 보존');
    assert.equal((await put(stopped({ reason: 'sales_ended', evidence: '판매처 공지: 2026-10-01 판매 종료' }))).status, 200, '근거 있는 판매 종료');
    assert.equal(s.stored().find(p => p.id === '1').partnerLinks[2].availability.evidence, '판매처 공지: 2026-10-01 판매 종료');
  } finally { s.stop(); }
});

test('판매처 상태 갱신은 공개 상태를 바꾸지 않음: 숨긴 상품이 다시 팔려도 비공개, 공개 상품이 모두 중지돼도 공개 상태 유지', async () => {
  const s = await startServer();
  try {
    let r = await fetch(`${s.base}/products/3/partner-availability`, { method: 'PUT', headers: admin, body: JSON.stringify({ updates: [{ index: 0, availability: ok({ checkedAt: iso(Date.now()) }) }] }) });
    assert.equal(r.status, 200);
    assert.equal((await json(r)).publishStatus, 'hidden');
    assert.equal((await fetch(`${s.base}/products/3`)).status, 404, '숨김 유지');
    r = await fetch(`${s.base}/products/1/partner-availability`, { method: 'PUT', headers: admin, body: JSON.stringify({ updates: [{ externalId: 'ext-A', availability: stopped() }, { externalId: 'ext-C', availability: stopped() }] }) });
    assert.equal((await json(r)).publishStatus, 'published');
    const p1 = (await json(await fetch(`${s.base}/products`))).find(p => p.id === '1');
    assert.equal(p1.bookable, 'none');
    // 일반 수정으로 판매처 목록을 상태 없이 보내도(예전 어드민) 기존 상태가 지워지지 않음
    r = await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ partnerLinks: s.stored().find(p => p.id === '1').partnerLinks.map(({ availability, ...rest }) => rest) }) });
    assert.equal(r.status, 200);
    assert.ok(s.stored().find(p => p.id === '1').partnerLinks.every(l => l.availability?.status === 'unavailable'));
  } finally { s.stop(); }
});

test('AI 사무실은 초안만: 공개 등록·공개 전환·숨김 해제 403, 초안 등록은 가능 / 관리자는 공개 가능', async () => {
  const s = await startServer();
  try {
    const draft = { name: '사무실 초안', images: [IMG], partnerLinks: [link('A')] };
    assert.equal((await fetch(`${s.base}/products`, { method: 'POST', headers: office, body: JSON.stringify({ ...draft, publishStatus: 'published' }) })).status, 403);
    assert.equal((await fetch(`${s.base}/products`, { method: 'POST', headers: office, body: JSON.stringify({ ...draft, isAvailable: true }) })).status, 403);
    const created = await fetch(`${s.base}/products`, { method: 'POST', headers: office, body: JSON.stringify({ ...draft, publishStatus: 'draft', isAvailable: false }) });
    assert.equal(created.status, 201);
    const id = (await created.json()).id;
    assert.equal((await fetch(`${s.base}/products/${id}`, { method: 'PUT', headers: office, body: JSON.stringify({ publishStatus: 'published' }) })).status, 403);
    assert.equal((await fetch(`${s.base}/products/3`, { method: 'PUT', headers: office, body: JSON.stringify({ publishStatus: 'draft' }) })).status, 403, '숨김 해제 불가');
    assert.equal((await fetch(`${s.base}/products/${id}`)).status, 404, '사무실 초안은 비공개');
    assert.equal((await fetch(`${s.base}/products/${id}`, { method: 'PUT', headers: admin, body: JSON.stringify({ publishStatus: 'published' }) })).status, 200, '관리자는 공개');
    assert.equal((await fetch(`${s.base}/products/${id}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).status, 200);
  } finally { s.stop(); }
});

test('공개 필수 검사는 모든 경로에 같게: 공개 등록 / 공개만 요청 / 공개 상품 사진을 placeholder로 수정 → 400, 관계없는 칸 수정은 그대로', async () => {
  const s = await startServer();
  try {
    const bad = { name: '사진 없음', images: ['https://via.placeholder.com/1'], partnerLinks: [link('A')] };
    assert.equal((await fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify({ ...bad, publishStatus: 'published' }) })).status, 400);
    const d = await json(await fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify(bad) }));
    assert.equal(d.publishStatus, 'draft', '기본은 초안');
    assert.deepEqual(d.images, [], 'placeholder는 저장하지 않음');
    assert.equal((await fetch(`${s.base}/products/${d.id}`, { method: 'PUT', headers: admin, body: JSON.stringify({ publishStatus: 'published' }) })).status, 400);
    assert.equal((await fetch(`${s.base}/products/${d.id}`, { method: 'PUT', headers: admin, body: JSON.stringify({ isAvailable: true }) })).status, 400, '예전 활성화 요청도 같은 검사');
    assert.equal((await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ images: ['https://placehold.co/600x400'] }) })).status, 400, '공개 상품 사진을 placeholder로');
    assert.equal(s.stored().find(p => p.id === '1').images[0], IMG, '거절되면 그대로');
    assert.equal((await fetch(`${s.base}/products/9`, { method: 'PUT', headers: admin, body: JSON.stringify({ tags: ['새 태그'] }) })).status, 200, '공개 필수와 관계없는 칸 수정은 가능');
    assert.deepEqual(s.stored().find(p => p.id === '9').images, [], '저장 때 placeholder 정리');
    // 예전 화면 호환: 공개 상품 비활성 = 숨김, 새 상품 비활성 = 초안
    const hid = await json(await fetch(`${s.base}/products/5`, { method: 'PUT', headers: admin, body: JSON.stringify({ isAvailable: false }) }));
    assert.equal(hid.publishStatus, 'hidden');
  } finally { s.stop(); }
});

test('저장 실패: 쓰기 실패면 500이고 파일 그대로 / 파일이 깨지면 읽기·쓰기 모두 오류(빈 목록으로 덮어쓰지 않음) / 다시 보내도 같은 요청 번호는 하나', async () => {
  const s = await startServer();
  try {
    const before = fs.readFileSync(s.file, 'utf8');
    fs.chmodSync(s.dir, 0o555); // 폴더에 쓸 수 없게 → 임시 파일 만들기 실패
    try {
      const r = await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ name: '실패해야 함' }) });
      assert.equal(r.status, 500);
      const p = await fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify({ name: '재시도 상품', clientRequestId: 'retry-1' }) });
      assert.equal(p.status, 500, '저장 실패를 성공처럼 답하지 않음');
    } finally { fs.chmodSync(s.dir, 0o755); }
    assert.equal(fs.readFileSync(s.file, 'utf8'), before, '실패한 변경은 반영되지 않음');
    const again = [];
    for (let i = 0; i < 2; i++) again.push(await fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify({ name: '재시도 상품', clientRequestId: 'retry-1' }) }));
    assert.deepEqual(again.map(r => r.status), [201, 200]);
    assert.equal(s.stored().filter(p => p.name === '재시도 상품').length, 1);
    fs.writeFileSync(s.file, '{깨진 파일');
    assert.equal((await fetch(`${s.base}/products`)).status, 500);
    assert.equal((await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ name: 'x' }) })).status, 500);
    assert.equal(fs.readFileSync(s.file, 'utf8'), '{깨진 파일', '깨진 파일을 빈 목록으로 덮어쓰지 않음');
  } finally { s.stop(); }
});

test('다른 프로세스(가격 갱신 스크립트)와 동시에 써도 서로의 변경이 사라지지 않음 (같은 잠금 파일)', async () => {
  const s = await startServer();
  try {
    const store = path.join(__dirname, '../src/productStore.js');
    // 다른 프로세스: 잠금을 잡고 0.8초 동안 일한 뒤 상품 1의 가격만 바꿈
    const script = `import { updateProductsFile } from ${JSON.stringify(store)};
      await updateProductsFile(${JSON.stringify(s.file)}, async (latest) => { await new Promise(r => setTimeout(r, 800)); latest.find(p => p.id === '1').scriptPrice = 777; return latest; });`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: 'inherit' });
    await new Promise(r => setTimeout(r, 200)); // 스크립트가 잠금을 잡은 뒤
    const putting = fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ name: '어드민 수정' }) });
    const [r, code] = await Promise.all([putting, new Promise(res => child.on('exit', res))]);
    assert.equal(code, 0);
    assert.equal(r.status, 200);
    const p1 = s.stored().find(p => p.id === '1');
    assert.equal(p1.scriptPrice, 777, '스크립트 변경 유지');
    assert.equal(p1.name, '어드민 수정', '어드민 변경 유지');
    assert.ok(!fs.existsSync(`${s.file}.lock`), '잠금 파일 정리');
  } finally { s.stop(); }
});

test('잠금 주인이 죽으면(강제 종료) 남은 잠금을 치우고 계속 저장', async () => {
  const s = await startServer();
  try {
    const dead = spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], { encoding: 'utf8' });
    fs.writeFileSync(`${s.file}.lock`, JSON.stringify({ pid: Number(dead.stdout.trim()), token: 'x', at: Date.now() }));
    const r = await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ name: '잠금 복구' }) });
    assert.equal(r.status, 200);
    assert.equal(s.stored().find(p => p.id === '1').name, '잠금 복구');
  } finally { s.stop(); }
});

test('사무실 전용 키: 머리글을 빼도 초안 등록만 (공개 등록 403·수정 403·삭제 403), 조회는 초안까지 / 관리자 키는 그대로', async () => {
  const s = await startServer();
  try {
    const officeOnly = { 'x-admin-key': OFFICE_KEY, 'Content-Type': 'application/json' }; // x-tourstream-actor 없음
    const draft = { name: '사무실 초안', images: [IMG], partnerLinks: [link('A')] };
    assert.equal((await fetch(`${s.base}/products`, { method: 'POST', headers: officeOnly, body: JSON.stringify({ ...draft, publishStatus: 'published' }) })).status, 403);
    const created = await fetch(`${s.base}/products`, { method: 'POST', headers: officeOnly, body: JSON.stringify(draft) });
    assert.equal(created.status, 201);
    const id = (await created.json()).id;
    assert.equal((await fetch(`${s.base}/products/${id}`, { method: 'PUT', headers: officeOnly, body: JSON.stringify({ publishStatus: 'published' }) })).status, 403);
    assert.equal((await fetch(`${s.base}/products/1`, { method: 'DELETE', headers: officeOnly })).status, 403);
    assert.equal((await fetch(`${s.base}/products/1/partner-availability`, { method: 'PUT', headers: officeOnly, body: JSON.stringify({ updates: [{ index: 0, availability: null }] }) })).status, 403);
    assert.ok((await (await fetch(`${s.base}/products`, { headers: officeOnly })).json()).some(p => p.id === id), '사무실 키로 초안 조회 (비공개·중복 확인용)');
    assert.equal((await fetch(`${s.base}/products/${id}`)).status, 404, '손님에게는 안 보임');
    assert.equal((await fetch(`${s.base}/products/${id}`, { method: 'PUT', headers: admin, body: JSON.stringify({ publishStatus: 'published' }) })).status, 200, '관리자 키는 공개 가능');
  } finally { s.stop(); }
});

test('이미 공개인 상품도 공개를 다시 요청하면 필수 검사 (placeholder만 남았으면 400)', async () => {
  const s = await startServer();
  try {
    assert.equal((await fetch(`${s.base}/products/9`, { method: 'PUT', headers: admin, body: JSON.stringify({ publishStatus: 'published' }) })).status, 400);
    assert.equal((await fetch(`${s.base}/products/9`, { method: 'PUT', headers: admin, body: JSON.stringify({ isAvailable: true }) })).status, 400);
    assert.equal((await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ publishStatus: 'published' }) })).status, 200, '정상 공개 상품은 그대로');
  } finally { s.stop(); }
});

test('숨김·공개 전환 뒤 메인 사이트 다시 빌드 요청 (가짜 GitHub로 확인, 여러 변경은 한 번으로) / 확인용 상세 조회는 조회수 안 셈', async () => {
  const http = require('http');
  const got = [];
  const fake = http.createServer((req, res) => { let b = ''; req.on('data', c => (b += c)); req.on('end', () => { got.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(b || '{}') }); res.writeHead(204); res.end(); }); });
  await new Promise(r => fake.listen(0, '127.0.0.1', r));
  const s = await startServer(seed(), { GITHUB_DISPATCH_TOKEN: 'fake-token', GITHUB_API_URL: `http://127.0.0.1:${fake.address().port}`, REBUILD_DEBOUNCE_MS: '300' });
  try {
    await fetch(`${s.base}/products/1`, { method: 'PUT', headers: admin, body: JSON.stringify({ publishStatus: 'hidden' }) });
    await fetch(`${s.base}/products/7`, { method: 'PUT', headers: admin, body: JSON.stringify({ publishStatus: 'hidden' }) });
    await fetch(`${s.base}/products/5`, { method: 'PUT', headers: admin, body: JSON.stringify({ tags: ['x'] }) }); // 공개 여부 그대로 → 요청 없음
    for (let i = 0; i < 40 && !got.length; i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 400));
    assert.equal(got.length, 1, '두 변경을 한 번으로');
    assert.equal(got[0].url, '/repos/yoonsang111/rutcursor/actions/workflows/deploy.yml/dispatches');
    assert.deepEqual(got[0].body, { ref: 'main', inputs: { mode: 'rebuild-main' } }, '커밋은 고르지 않음 (워크플로가 마지막 승인 배포에서 고름)');
    assert.equal(got[0].auth, 'Bearer fake-token');
    const before = s.stored().find(p => p.id === '6').views;
    assert.equal((await fetch(`${s.base}/products/6?check=1`, { headers: { 'user-agent': 'Mozilla/5.0' } })).status, 200);
    assert.equal(s.stored().find(p => p.id === '6').views, before, '확인용 조회는 조회수 그대로');
    assert.equal((await fetch(`${s.base}/products/1?check=1`)).status, 404, '숨긴 상품 확인 → 404');
  } finally { s.stop(); fake.close(); }
});
