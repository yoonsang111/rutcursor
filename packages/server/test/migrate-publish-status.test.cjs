// 공개 상태 이전 시험 (임시 폴더, 운영 데이터 사용 안 함)
// 2026-10-14 9차: 상품 파일은 API 서버만 쓰므로 이전 스크립트는 서버의 이전 API에 부탁 (예전: 스크립트가 파일을 직접 씀)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

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
  const port = 45000 + Math.floor(Math.random() * 2000);
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/counter`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  return { dir, file, evidence, base, run: (...args) => runAsync(base, args), read: () => JSON.parse(fs.readFileSync(file, 'utf8')), stop: () => proc.kill() };
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
  } finally { s.stop(); }
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
  } finally { s.stop(); }
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
  } finally { s.stop(); }
});
