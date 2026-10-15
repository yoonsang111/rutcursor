// 공개 상태 이전 시험 (임시 폴더, 운영 데이터 사용 안 함)
// 2026-10-14 9차: 상품 파일은 API 서버만 쓰므로 이전 스크립트는 서버의 이전 API에 부탁 (예전: 스크립트가 파일을 직접 씀)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const freePort = () => new Promise((resolve) => { const srv = require('net').createServer(); srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); }); }); // 시험 포트는 운영체제가 빈 포트를 줌 (시험 파일끼리 겹치지 않게)

const KEY = 'test-admin-key-0123456789abcdef';
const SCRIPT = path.join(__dirname, '../scripts/migrate-publish-status.mjs');
const IMG = 'https://img.example.com/a.jpg';
const runAsync = (base, args, key = KEY) => new Promise((resolve) => {
  const p = spawn(process.execPath, [SCRIPT, ...args], { env: { ...process.env, API_BASE_URL: base, ADMIN_API_KEY: key } });
  let stdout = '', stderr = '';
  p.stdout.on('data', d => (stdout += d)); p.stderr.on('data', d => (stderr += d));
  p.on('exit', status => resolve({ status, stdout, stderr }));
});

async function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-migrate-'));
  const products = [
    { id: '1', name: '활성 상품', isAvailable: true, images: [IMG], partnerLinks: [{ partner: 'A', url: 'https://a.example.com', availability: { status: 'unavailable', scope: { whole: true }, source: 'x', checkedAt: '2026-10-01T00:00:00Z' } }] },
    { id: '2', name: '초안으로 등록된 비활성 (이름·사진·가격 다 있음)', isAvailable: false, images: [IMG], price: 1000, partnerLinks: [] },
    { id: '3', name: '근거 없는 비활성 (이름·사진·가격 다 있음)', isAvailable: false, images: [IMG], price: 2000, views: 50, partnerLinks: [] },
    { id: '4', name: '숨김 근거 비활성', isAvailable: false, images: [], partnerLinks: [] },
    { id: '5', name: '이미 이전됨', publishStatus: 'hidden', isAvailable: false, images: [], partnerLinks: [] },
  ];
  const file = path.join(dir, 'products.json');
  fs.writeFileSync(file, JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(dir, 'counter.json'), '10');
  const evidence = path.join(dir, 'evidence.json');
  fs.writeFileSync(evidence, JSON.stringify({ drafts: { 2: { source: '등록 기록', at: '2026-09-10' } }, hidden: { 4: { source: '대표 메모', at: '2026-10-01' } } }));
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/counter`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  return { dir, file, evidence, base, run: (...args) => runAsync(base, args), read: () => JSON.parse(fs.readFileSync(file, 'utf8')), stop: () => new Promise((r) => { if (proc.exitCode !== null || proc.signalCode !== null) return r(); proc.once('exit', r); proc.kill(); }) };
}

async function restart(s) {
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: s.dir, ADMIN_API_KEY: KEY }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/counter`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  return { base, run: (...args) => runAsync(base, args), stop: () => new Promise((r) => { if (proc.exitCode !== null || proc.signalCode !== null) return r(); proc.once('exit', r); proc.kill(); }) };
}

test('미리보기는 파일을 바꾸지 않고 변경표만 보여 줌 / 근거 없는 비활성은 이름·사진·가격이 있어도 분류 필요 / 관리자 키 필요', async () => {
  const s = await setup();
  try {
    const before = fs.readFileSync(s.file, 'utf8');
    const r = await s.run('--evidence', s.evidence);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.readFileSync(s.file, 'utf8'), before);
    assert.match(r.stdout, /\| 1 \| 활성 상품 \| 활성 \| 공개 \|/);
    assert.match(r.stdout, /\| 2 \|.*\| 비활성 \| 초안 \|.*등록 기록/);
    assert.match(r.stdout, /\| 3 \|.*\| 비활성 \| 분류 필요 \|/);
    assert.match(r.stdout, /\| 4 \|.*\| 비활성 \| 숨김 \|/);
    assert.doesNotMatch(r.stdout, /\| 5 \|/, '이미 이전된 상품은 바꾸지 않음');
    assert.match(r.stdout, /미리보기만/);
    assert.notEqual((await runAsync(s.base, ['--evidence', s.evidence, '--apply'], 'wrong-key')).status, 0, '키가 틀리면 실패');
    assert.equal(fs.readFileSync(s.file, 'utf8'), before);
  } finally { await s.stop(); }
});

test('적용: 백업을 만들고 이전, 다시 실행해도 결과가 그대로, 되돌리기로 원래대로 (되돌리기 직전 파일 보관)', async () => {
  const s = await setup();
  try {
    const original = JSON.parse(fs.readFileSync(s.file, 'utf8'));
    const r = await s.run('--evidence', s.evidence, '--apply');
    assert.equal(r.status, 0, r.stderr);
    const backup = r.stdout.match(/백업: (\S+)/)[1];
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(s.dir, backup), 'utf8')), original, '적용 전 파일 그대로 백업');
    const after = s.read();
    assert.deepEqual(after.map(p => p.publishStatus), ['published', 'draft', 'needs_classification', 'hidden', 'hidden']);
    assert.deepEqual(after.map(p => p.isAvailable), [true, false, false, false, false]);
    assert.equal(after[0].partnerLinks[0].availability.status, 'unavailable', '판매처 상태는 건드리지 않음');
    assert.equal((await fetch(`${s.base}/products/3`)).status, 404, '분류 필요는 비공개');
    const once = fs.readFileSync(s.file, 'utf8');
    const again = await s.run('--evidence', s.evidence, '--apply');
    assert.equal(again.status, 0);
    assert.match(again.stdout, /바꿀 상품이 없어요/);
    assert.equal(fs.readFileSync(s.file, 'utf8'), once, '두 번 실행해도 같음');
    const restore = await s.run('--restore', backup);
    assert.equal(restore.status, 0, restore.stderr);
    assert.deepEqual(s.read(), original, '되돌리기');
    assert.ok(fs.readdirSync(s.dir).some(f => f.startsWith('products.before-restore-')), '되돌리기 직전 파일도 보관');
  } finally { await s.stop(); }
});

test('되돌리기는 데이터 폴더의 백업 이름만: 깨진 백업·다른 경로·없는 파일은 거절하고 그대로', async () => {
  const s = await setup();
  try {
    fs.writeFileSync(path.join(s.dir, 'products.before-bad.json'), '{깨짐');
    const before = fs.readFileSync(s.file, 'utf8');
    for (const name of ['products.before-bad.json', '../products.json', '/etc/passwd', 'products.before-none.json']) {
      const r = await s.run('--restore', name);
      assert.notEqual(r.status, 0, name);
    }
    assert.equal(fs.readFileSync(s.file, 'utf8'), before);
  } finally { await s.stop(); }
});

// 2026-10-15 대표 지시: 상태 이전 뒤 새 수정 내역을 잃지 않는 되돌리기. 파일 전체를 백업으로 덮으면 이전 뒤의 수정·가격 갱신·새 상품이 사라짐
// → 이전이 바꾼 칸(공개 상태·활성)만, 이전 뒤 아무도 상태를 바꾸지 않은 상품만 되돌림. 그사이 상태를 바꾼 상품은 그대로 두고 알려 줌
test('상태만 되돌리기: 이전 뒤의 이름 수정·가격·새 상품은 보존, 그사이 상태를 바꾼 상품은 그대로, 미리보기는 안 바꿈, 두 번째는 할 일 없음', async () => {
  const s = await setup();
  const admin = { 'Content-Type': 'application/json', 'X-Admin-Key': KEY };
  const put = async (id, body) => { const cur = await (await fetch(`${s.base}/products/${id}`, { headers: admin })).json(); return fetch(`${s.base}/products/${id}`, { method: 'PUT', headers: admin, body: JSON.stringify({ ...body, baseRev: cur.rev || 0 }) }); };
  try {
    const original = JSON.parse(fs.readFileSync(s.file, 'utf8'));
    const r = await s.run('--evidence', s.evidence, '--apply');
    const backup = r.stdout.match(/백업: (\S+)/)[1];
    // 이전 뒤의 운영 변화
    assert.equal((await put('2', { name: '이전 뒤 고친 이름' })).status, 200);
    assert.equal((await put('4', { price: 7777 })).status, 200);
    assert.equal((await put('3', { publishStatus: 'hidden' })).status, 200, '관리자가 분류 필요 → 숨김으로 정함');
    const created = await fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify({ name: '이전 뒤 새 상품', publishStatus: 'draft' }) });
    assert.equal(created.status, 201);
    const newId = (await created.json()).id;
    const beforePreview = fs.readFileSync(s.file, 'utf8');
    const preview = await s.run('--rollback', backup);
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(fs.readFileSync(s.file, 'utf8'), beforePreview, '미리보기는 파일을 바꾸지 않음');
    assert.match(preview.stdout, /\| 3 \|.*그대로/, '그사이 상태를 바꾼 상품은 그대로 둔다고 알려 줌');
    const applied = await s.run('--rollback', backup, '--apply');
    assert.equal(applied.status, 0, applied.stderr);
    const now = s.read();
    const byId = id => now.find(p => String(p.id) === String(id));
    for (const id of ['1', '2', '4']) {
      const o = original.find(p => p.id === id);
      assert.equal(byId(id).publishStatus, undefined, `${id}: 이전 전처럼 공개 상태 없음`);
      assert.equal(byId(id).isAvailable, o.isAvailable, `${id}: 활성 여부 원래대로`);
      assert.equal(byId(id).publishMigration, undefined, `${id}: 이전 표시 지움`);
    }
    assert.equal(byId('2').name, '이전 뒤 고친 이름', '이전 뒤 이름 수정 보존');
    assert.equal(byId('4').price, 7777, '이전 뒤 가격 보존');
    assert.equal(byId('3').publishStatus, 'hidden', '그사이 관리자가 정한 상태 보존');
    assert.equal(byId('5').publishStatus, 'hidden', '이번 이전과 무관한 상품 그대로');
    assert.ok(byId(newId), '이전 뒤 새 상품 보존');
    assert.ok(fs.readdirSync(s.dir).some(f => f.startsWith('products.before-rollback-')), '되돌리기 직전 파일 보관');
    const again = await s.run('--rollback', backup, '--apply');
    assert.equal(again.status, 0);
    assert.match(again.stdout, /되돌릴 상품이 없어요/);
  } finally { await s.stop(); }
});

// Codex 20차: 백업 값이 이전 때 남긴 기록(이전 전 활성 여부)과 다르면 되돌리지 않음 — 칸이 빠진 백업으로 비공개 상품이 공개되면 안 됨
test('상태만 되돌리기: 백업 값이 이전 기록과 다르거나 빠졌으면 그 상품은 그대로(비공개 유지), 맞는 상품만 되돌림', async () => {
  const s = await setup();
  try {
    const r = await s.run('--evidence', s.evidence, '--apply');
    const backup = r.stdout.match(/백업: (\S+)/)[1];
    const bad = 'products.before-publish-status-bad-copy.json';
    const orig = JSON.parse(fs.readFileSync(path.join(s.dir, backup), 'utf8'));
    // 2: 활성 칸이 빠짐, 3: 활성 값이 기록과 반대, 4: 백업에 이미 공개 상태가 있음(이전 전 백업이 아님), 1: 정상
    const tampered = orig.map(p => p.id === '2' ? { id: '2' } : p.id === '3' ? { ...p, isAvailable: true } : p.id === '4' ? { ...p, publishStatus: 'published' } : p);
    fs.writeFileSync(path.join(s.dir, bad), JSON.stringify(tampered));
    const applied = await s.run('--rollback', bad, '--apply');
    assert.equal(applied.status, 0, applied.stderr);
    const now = s.read(); const byId = id => now.find(p => p.id === id);
    for (const id of ['2', '3', '4']) {
      assert.ok(byId(id).publishStatus, `${id}: 그대로 (공개 상태 유지)`);
      assert.equal(byId(id).isAvailable, false, `${id}: 비공개 유지`);
      assert.equal((await fetch(`${s.base}/products/${id}`)).status, 404, `${id}: 손님에게 안 보임`);
    }
    assert.match(applied.stdout, /\| 2 \|.*기록과 다름/);
    assert.equal(byId('1').publishStatus, undefined, '1: 정상 상품은 되돌림');
    assert.equal(byId('1').isAvailable, true);
    // Codex 21차: 백업과 이전 기록에서 활성 값이 함께 빠져도(둘 다 손상) 비공개 상품은 공개되면 안 됨 — 되돌리기는 손님 공개 여부를 절대 바꾸지 않음
    const cur = JSON.parse(fs.readFileSync(s.file, 'utf8'));
    fs.writeFileSync(s.file, JSON.stringify(cur.map(p => p.id === '2' ? { ...p, publishMigration: { ...p.publishMigration, from: {} } } : p)));
    fs.writeFileSync(path.join(s.dir, bad), JSON.stringify(orig.map(p => p.id === '2' ? { id: '2', name: p.name } : p)));
    await s.stop(); Object.assign(s, await restart(s));
    const again = await s.run('--rollback', bad, '--apply');
    assert.equal(again.status, 0, again.stderr);
    assert.equal(s.read().find(p => p.id === '2').isAvailable, false, '2: 둘 다 손상돼도 비공개 유지');
    assert.equal((await fetch(`${s.base}/products/2`)).status, 404);
    // Codex 22차: 정상 백업·온전한 기록이어도, 지금 '공개'인데 활성만 꺼진(= 서버 판정상 숨김) 상품은 되돌려서 공개되면 안 됨
    const cur1 = JSON.parse(fs.readFileSync(s.file, 'utf8'));
    fs.writeFileSync(s.file, JSON.stringify(cur1.map(p => p.id === '1' ? { ...p, publishStatus: 'published', isAvailable: false, publishMigration: { at: 'x', from: { isAvailable: true }, to: 'published', rule: 't' } } : p)));
    fs.writeFileSync(path.join(s.dir, bad), JSON.stringify(orig));
    await s.stop(); Object.assign(s, await restart(s));
    assert.equal((await fetch(`${s.base}/products/1`)).status, 404, '1: 지금 손님에게 안 보임');
    const third = await s.run('--rollback', bad, '--apply');
    assert.equal(third.status, 0, third.stderr);
    assert.equal((await fetch(`${s.base}/products/1`)).status, 404, '1: 되돌린 뒤에도 안 보임');
    assert.match(third.stdout, /\| 1 \|.*공개 여부가 바뀜/);
    const p1 = s.read().find(p => p.id === '1');
    assert.equal(p1.publishStatus, 'published', '1: 저장된 상태 그대로');
    assert.equal(p1.isAvailable, false, '1: 저장된 활성 값 그대로');
  } finally { await s.stop(); }
});
