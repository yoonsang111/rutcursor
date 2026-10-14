// 공개 상태 이전 스크립트 시험 (임시 폴더, 운영 데이터 사용 안 함)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '../scripts/migrate-publish-status.mjs');
const run = (dir, ...args) => spawnSync(process.execPath, [SCRIPT, '--data-dir', dir, ...args], { encoding: 'utf8' });
const IMG = 'https://img.example.com/a.jpg';

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-migrate-'));
  const products = [
    { id: '1', name: '활성 상품', isAvailable: true, images: [IMG], partnerLinks: [{ partner: 'A', url: 'https://a.example.com', availability: { status: 'unavailable', scope: { whole: true }, source: 'x', checkedAt: '2026-10-01T00:00:00Z' } }] },
    { id: '2', name: '초안으로 등록된 비활성 (이름·사진·가격 다 있음)', isAvailable: false, images: [IMG], price: 1000, partnerLinks: [] },
    { id: '3', name: '근거 없는 비활성 (이름·사진·가격 다 있음)', isAvailable: false, images: [IMG], price: 2000, views: 50, partnerLinks: [] },
    { id: '4', name: '숨김 근거 비활성', isAvailable: false, images: [], partnerLinks: [] },
    { id: '5', name: '이미 이전됨', publishStatus: 'hidden', isAvailable: false, images: [], partnerLinks: [] },
  ];
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(products, null, 2));
  const evidence = path.join(dir, 'evidence.json');
  fs.writeFileSync(evidence, JSON.stringify({ drafts: { 2: { source: '등록 기록', at: '2026-09-10' } }, hidden: { 4: { source: '대표 메모', at: '2026-10-01' } } }));
  return { dir, file: path.join(dir, 'products.json'), evidence, read: () => JSON.parse(fs.readFileSync(path.join(dir, 'products.json'), 'utf8')) };
}

test('미리보기는 파일을 바꾸지 않고 변경표만 보여 줌 / 근거 없는 비활성은 이름·사진·가격이 있어도 분류 필요', () => {
  const s = setup();
  const before = fs.readFileSync(s.file, 'utf8');
  const r = run(s.dir, '--evidence', s.evidence);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(s.file, 'utf8'), before);
  assert.match(r.stdout, /\| 1 \| 활성 상품 \| 활성 \| 공개 \|/);
  assert.match(r.stdout, /\| 2 \|.*\| 비활성 \| 초안 \|.*등록 기록/);
  assert.match(r.stdout, /\| 3 \|.*\| 비활성 \| 분류 필요 \|/);
  assert.match(r.stdout, /\| 4 \|.*\| 비활성 \| 숨김 \|/);
  assert.doesNotMatch(r.stdout, /\| 5 \|/, '이미 이전된 상품은 바꾸지 않음');
  assert.match(r.stdout, /미리보기만/);
});

test('적용: 백업을 만들고 이전, 다시 실행해도 결과가 그대로, 되돌리기로 원래대로', () => {
  const s = setup();
  const original = fs.readFileSync(s.file, 'utf8');
  const r = run(s.dir, '--evidence', s.evidence, '--apply');
  assert.equal(r.status, 0, r.stderr);
  const backup = r.stdout.match(/백업: (\S+)/)[1];
  assert.equal(fs.readFileSync(backup, 'utf8'), original, '적용 전 파일 그대로 백업');
  const after = s.read();
  assert.deepEqual(after.map(p => p.publishStatus), ['published', 'draft', 'needs_classification', 'hidden', 'hidden']);
  assert.deepEqual(after.map(p => p.isAvailable), [true, false, false, false, false]);
  assert.equal(after[0].partnerLinks[0].availability.status, 'unavailable', '판매처 상태는 건드리지 않음');
  const once = fs.readFileSync(s.file, 'utf8');
  const again = run(s.dir, '--evidence', s.evidence, '--apply');
  assert.equal(again.status, 0);
  assert.match(again.stdout, /바꿀 상품이 없어요/);
  assert.equal(fs.readFileSync(s.file, 'utf8'), once, '두 번 실행해도 같음');
  const restore = run(s.dir, '--restore', backup);
  assert.equal(restore.status, 0, restore.stderr);
  assert.equal(fs.readFileSync(s.file, 'utf8'), JSON.stringify(JSON.parse(original), null, 2), '되돌리기');
  assert.ok(fs.readdirSync(s.dir).some(f => f.startsWith('products.before-restore-')), '되돌리기 직전 파일도 보관');
});

test('깨진 백업으로는 되돌리지 않음', () => {
  const s = setup();
  const bad = path.join(s.dir, 'bad.json');
  fs.writeFileSync(bad, '{깨짐');
  const before = fs.readFileSync(s.file, 'utf8');
  const r = run(s.dir, '--restore', bad);
  assert.notEqual(r.status, 0);
  assert.equal(fs.readFileSync(s.file, 'utf8'), before);
});
