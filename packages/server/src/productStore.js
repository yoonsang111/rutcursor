// 상품 파일(products.json) 저장 도구.
// 쓰는 쪽은 하나: 운영 API 서버 한 프로세스만 상품 파일을 쓴다 (가격·평점 갱신, 공개 상태 이전도 서버 API를 거침).
// 서버는 켜져 있는 동안 '작성자 잠금'을 쥐고, 두 번째 서버는 시작하지 못한다.
// 저장은 임시 파일에 다 쓴 뒤 이름 바꾸기로 통째로 교체하고, 읽기·쓰기 실패는 오류로 알린다 (빈 목록으로 덮어쓰지 않게).
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// boot = 이 컴퓨터가 켜진 시각 (서버가 넘겨 줌). 재부팅 전에 만든 잠금은 같은 번호의 다른 프로세스가 살아 있어도 죽은 잠금
// ponytail: 같은 부팅 안에서 프로세스 번호가 한 바퀴 돌아 재사용되면 구별 못 함 — 그때는 '다른 서버 있음'으로 멈춤(안전한 쪽)
const sameBoot = (a, b) => !a || !b || Math.abs(Number(a) - Number(b)) < 120000;

const pidAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM'; // 다른 사용자 프로세스면 살아 있는 것으로 봄
  }
};

// 잠금 파일을 새로 만들 수 있을 때까지 기다린다. 남의 잠금은 (주인이 죽었어도) 절대 지우지 않는다 — 시간 초과로 실패할 뿐.
// 죽은 주인의 잠금 정리는 서버 시작 때 reclaimDeadLock 한 곳에서만 한다.
export async function acquireFileLock(lockPath, { timeoutMs = 15000, pollMs = 25, boot } = {}) {
  const started = Date.now();
  const token = `${process.pid}-${started}-${Math.random().toString(36).slice(2)}`;
  for (;;) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, token, at: Date.now(), ...(boot ? { boot } : {}) }), { flag: 'wx' });
      let released = false;
      return {
        token,
        release() {
          if (released) return;
          released = true;
          try {
            if (JSON.parse(fs.readFileSync(lockPath, 'utf8')).token === token) fs.unlinkSync(lockPath);
          } catch {
            /* 이미 없음 */
          }
        },
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - started > timeoutMs) {
        throw Object.assign(new Error('상품 파일을 다른 작업이 쓰고 있어 잠시 뒤 다시 시도해 주세요'), { status: 503, code: 'LOCK_TIMEOUT' });
      }
      await sleep(pollMs);
    }
  }
}

// 지금 잠금의 주인 정보 (없으면 null, 깨졌으면 { broken: true })
export function lockHolder(lockPath, boot) {
  try {
    const held = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    return { ...held, alive: Boolean(held.pid) && sameBoot(held.boot, boot) && pidAlive(held.pid) };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    return { broken: true, alive: false };
  }
}

// 주인이 죽은 잠금 정리 (서버 시작 때만). 지우기 전에 이름 바꾸기로 잠금 파일을 '내 것'으로 옮긴다 —
// 이름 바꾸기는 한 번에 일어나서 두 정리자가 같은 파일을 동시에 가져갈 수 없다.
// 옮긴 파일이 확인한 죽은 잠금이 아니면(그사이 새 주인이 생김) 원래 자리로 되돌린다.
export function reclaimDeadLock(lockPath, boot) {
  const before = lockHolder(lockPath, boot);
  if (!before || before.alive) return false;
  const grave = `${lockPath}.reclaim-${process.pid}-${Date.now()}`;
  try {
    fs.renameSync(lockPath, grave);
  } catch {
    return false; // 그사이 다른 정리자가 가져감
  }
  let moved = null;
  try { moved = JSON.parse(fs.readFileSync(grave, 'utf8')); } catch { moved = null; }
  const same = before.broken ? moved === null : Boolean(moved) && moved.token === before.token;
  if (!same) {
    try { fs.linkSync(grave, lockPath); } catch { /* 이미 다른 주인이 있으면 둠 */ }
  }
  try { fs.unlinkSync(grave); } catch { /* 없음 */ }
  return same;
}

// 서버의 작성자 잠금: 시작할 때 얻고 끝날 때까지 쥔다. 이전 서버가 끝나는 중이면 잠깐 기다리고,
// 주인이 죽은 잠금이면 정리한 뒤 다시 시도한다. 살아 있는 다른 서버가 쥐고 있으면 오류 (두 번째 서버 금지).
export async function acquireWriterLock(lockPath, { waitMs = 15000, boot } = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    // 주인이 이미 죽은 잠금은 기다리지 않고 바로 정리 (기다림은 살아 있는 이전 서버가 끝나는 중일 때만)
    const before = lockHolder(lockPath, boot);
    if (before && !before.alive) reclaimDeadLock(lockPath, boot);
    try {
      return await acquireFileLock(lockPath, { timeoutMs: attempt === 0 ? waitMs : 1000, pollMs: 100, boot });
    } catch (error) {
      if (error.code !== 'LOCK_TIMEOUT') throw error;
      const holder = lockHolder(lockPath, boot);
      if (holder && holder.alive) {
        throw Object.assign(new Error(`다른 서버(pid ${holder.pid})가 상품 파일을 쓰고 있어요. 서버는 하나만 켜야 해요`), { code: 'WRITER_RUNNING' });
      }
    }
  }
  throw Object.assign(new Error('작성자 잠금을 얻지 못했어요'), { code: 'WRITER_LOCK_FAILED' });
}

// 배열 JSON 읽기. 파일이 없으면 빈 배열, 깨졌으면 오류 (빈 배열로 착각해 덮어쓰지 않게)
export function readJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${path.basename(file)} 형식이 배열이 아닙니다`);
  return parsed;
}

// 같은 폴더의 임시 파일에 다 쓴 뒤 이름 바꾸기로 교체 → 쓰는 도중 꺼져도 예전 파일이 그대로 남음
export function writeFileAtomic(file, text) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  try {
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeFileSync(fd, text, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
  } catch (error) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* 임시 파일 없음 */
    }
    throw error;
  }
}

export const writeJsonAtomic = (file, data) => writeFileAtomic(file, JSON.stringify(data, null, 2));

export const lockPathFor = (productsFile) => `${productsFile}.lock`;
