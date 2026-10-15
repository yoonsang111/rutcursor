// 복구 전 데이터 검사 스크립트 시험: 손상은 1, 정상은 0, 어떤 경우에도 파일을 바꾸지 않음
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '../scripts/recovery-check.mjs');
const good = [{ id: '100001', name: 'A', partnerLinks: [] }, { id: '100005', name: 'B' }];
function check(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-rcheck-'));
  for (const [n, t] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), t);
  const snap = () => fs.readdirSync(dir).sort().map((n) => [n, fs.readFileSync(path.join(dir, n), 'utf8')]);
  const before = JSON.stringify(snap());
  const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
  assert.equal(JSON.stringify(snap()), before, '파일을 바꾸지 않음');
  return r;
}

test('정상 데이터 → 0, 선택 파일이 없어도 정상', () => {
  const r = check({ 'products.json': JSON.stringify(good), 'counter.json': '100005', RECOVERY_READ_ONLY: '' });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /결과: 정상/);
});

test('손상 → 1: 상품 JSON 오류·배열 아님·id 중복·id 없음·카운터 손상·상품 파일 없음', () => {
  for (const [why, files] of [
    ['JSON 오류', { 'products.json': '[{"id":' }],
    ['배열 아님', { 'products.json': '{}' }],
    ['id 중복', { 'products.json': JSON.stringify([...good, { id: '100001', name: 'C' }]) }],
    ['id 없음', { 'products.json': JSON.stringify([{ name: 'x' }]) }],
    ['카운터 손상', { 'products.json': JSON.stringify(good), 'counter.json': '{broken' }],
    ['카운터 너무 큼', { 'products.json': JSON.stringify(good), 'counter.json': '9007199254740993' }],
    ['상품 파일 없음', { 'counter.json': '100005' }],
  ]) {
    const r = check(files);
    assert.equal(r.status, 1, `${why}: ${r.stdout}`);
    assert.match(r.stdout, /결과: 손상/, why);
  }
});

test('선택 파일이 깨진 것은 경고만 (복구 계속 가능), 카운터가 뒤처진 것도 경고', () => {
  const r = check({ 'products.json': JSON.stringify(good), 'counter.json': '100001', 'view-events.json': '{broken', RECOVERY_READ_ONLY: '' });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /view-events\.json가 깨져/);
  assert.match(r.stdout, /가장 큰 상품 번호\(100005\)보다 작아요/);
});
