// 예전 '활성/비활성(isAvailable)'을 새 공개 상태(초안·공개·숨김·분류 필요)로 옮긴다.
// 상품 파일은 API 서버만 쓰므로, 이 스크립트는 서버의 이전 API에 부탁만 한다 (분류 규칙: src/publishMigration.js).
//
//   ADMIN_API_KEY=… node scripts/migrate-publish-status.mjs --evidence scripts/publish-status-evidence.json [--report 변경표.md]   ← 미리보기 (바꾸지 않음)
//   ADMIN_API_KEY=… node scripts/migrate-publish-status.mjs --evidence … --apply                                                  ← 적용 (서버가 백업 먼저)
//   ADMIN_API_KEY=… node scripts/migrate-publish-status.mjs --restore products.before-publish-status-<시각>.json                ← 되돌리기
//   API_BASE_URL 기본 http://127.0.0.1:3002/api
import fs from 'fs';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const API_BASE_URL = (process.env.API_BASE_URL || 'http://127.0.0.1:3002/api').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

async function post(p, body) {
  const res = await fetch(`${API_BASE_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_API_KEY }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status} ${json?.error || ''}`);
  return json;
}

async function main() {
  if (!ADMIN_API_KEY) throw new Error('ADMIN_API_KEY 환경변수가 필요해요');
  if (option('--restore')) {
    const r = await post('/admin/products-restore', { backup: option('--restore') });
    console.log(`[되돌리기] ${option('--restore')} 내용으로 되돌렸어요 (${r.restored}개). 되돌리기 직전 파일: ${r.safety}`);
    return;
  }
  const evidence = option('--evidence') ? JSON.parse(fs.readFileSync(option('--evidence'), 'utf8')) : {};
  const apply = args.includes('--apply');
  const r = await post('/admin/publish-status-migration', { evidence, apply });
  if (option('--report')) fs.writeFileSync(option('--report'), r.table, 'utf8');
  console.log(r.table);
  if (!apply) console.log('\n(미리보기만 했어요. 파일은 바뀌지 않았어요. 적용하려면 --apply)');
  else if (!r.applied) console.log('\n바꿀 상품이 없어요 (이미 이전됨). 파일은 그대로예요.');
  else console.log(`\n적용했어요. 백업: ${r.backup}\n되돌리기: node scripts/migrate-publish-status.mjs --restore ${r.backup}`);
}

main().catch((error) => {
  console.error('[이전 실패]', error.message);
  process.exit(1);
});
