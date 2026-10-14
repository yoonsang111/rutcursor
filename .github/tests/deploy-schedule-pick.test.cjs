// deploy.yml 예약 실행의 '마지막 승인 커밋 고르기' 단계를 가짜 gh로 실행 (실제 GitHub·네트워크 사용 안 함)
// 실행: node --test .github/tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const wf = fs.readFileSync(path.join(__dirname, '../workflows/deploy.yml'), 'utf8');
const step = wf.slice(wf.indexOf('- name: Pick last approved commit'));
const script = step.slice(step.indexOf('run: |') + 'run: |'.length, step.indexOf('\n\n')).split('\n').map(l => l.replace(/^ {10}/, '')).join('\n');

// 가짜 gh: --jq 결과를 바로 돌려줌. runs = [{ id, main: 'success'|'failure', title }] (최신 순)
function pick(runs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pick-'));
  fs.writeFileSync(path.join(dir, 'runs.json'), JSON.stringify(runs));
  fs.writeFileSync(path.join(dir, 'gh'), `#!/usr/bin/env node
const runs = require(${JSON.stringify(path.join(dir, 'runs.json'))});
const a = process.argv.slice(2);
if (a[1] === 'list') console.log(runs.filter(r => /[0-9a-f]{40}/.test(r.title)).map(r => r.id).join('\\n')); // --jq select(displayTitle에 커밋 번호) 흉내
else { const r = runs.find(x => String(x.id) === a[2]); console.log(a.includes('jobs') ? (r.main || '') : r.title.match(/[0-9a-f]{40}/)[0]); }
`, { mode: 0o755 });
  const out = path.join(dir, 'out');
  const r = spawnSync('bash', ['-c', script], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_REPOSITORY: 'o/r', GITHUB_OUTPUT: out }, encoding: 'utf8' });
  return { code: r.status, sha: fs.existsSync(out) ? fs.readFileSync(out, 'utf8').trim() : null };
}
const A = 'a'.repeat(40), B = 'b'.repeat(40);

test('예약 배포: 메인이 성공한 가장 최근 수동 배포 커밋을 고름 (다른 서비스 실패여도)', () => {
  assert.deepEqual(pick([{ id: 2, main: 'success', title: `Deploy ${B} req2` }, { id: 1, main: 'success', title: `Deploy ${A} req1` }]), { code: 0, sha: `sha=${B}` });
  // B는 메인 성공·API 실패(전체 실패) → 메인에 올라간 B를 유지해야 함 (옛 A로 되돌리지 않음)
  assert.deepEqual(pick([{ id: 2, main: 'success', title: `Deploy ${B} req2` }, { id: 1, main: 'success', title: `Deploy ${A} req1` }]).sha, `sha=${B}`);
});
test('예약 배포: 메인이 실패한 최근 배포는 건너뛰고, 메인 성공이 하나도 없으면 배포하지 않음', () => {
  assert.equal(pick([{ id: 3, main: 'failure', title: `Deploy ${B} req3` }, { id: 1, main: 'success', title: `Deploy ${A} req1` }]).sha, `sha=${A}`);
  const none = pick([{ id: 3, main: 'failure', title: `Deploy ${B} req3` }]);
  assert.notEqual(none.code, 0);
  assert.equal(none.sha, null);
});

test('예약·다시 빌드: 커밋 번호 없는 다시 빌드 실행은 승인 배포로 보지 않고 건너뜀', () => {
  assert.equal(pick([{ id: 4, main: 'success', title: 'Deploy scheduled-rebuild-of-last-approved ' }, { id: 1, main: 'success', title: `Deploy ${A} req1` }]).sha, `sha=${A}`);
});
