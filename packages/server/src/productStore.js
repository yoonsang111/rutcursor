// 상품 파일(products.json) 공용 저장 도구 — API 서버와 가격·평점 갱신 스크립트가 같이 쓴다.
// 상품 전체가 파일 하나라서, 서로 다른 프로세스가 동시에 "읽기 → 고치기 → 저장"을 하면 한쪽 변경이 사라진다.
// 그래서 (1) 잠금 파일로 한 번에 한 프로세스만 쓰게 하고, (2) 임시 파일에 쓴 뒤 이름을 바꿔 통째로 교체하고,
// (3) 읽기·쓰기 실패를 숨기지 않고 오류로 알린다 (빈 목록으로 읽고 덮어써서 전부 지우는 사고 방지).
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pidAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM'; // 다른 사용자 프로세스면 살아 있는 것으로 봄
  }
};

// 잠금 파일을 만들 수 있을 때까지 기다린다. 주인 프로세스가 죽었거나 너무 오래된 잠금은 치운다.
// ponytail: 같은 컴퓨터(EC2 한 대)의 프로세스끼리만 맞춰 줌. 서버가 여러 대가 되면 DB 잠금으로 바꿔야 함.
export async function acquireFileLock(lockPath, { timeoutMs = 15000, staleMs = 120000, pollMs = 25 } = {}) {
  const started = Date.now();
  const token = `${process.pid}-${started}-${Math.random().toString(36).slice(2)}`;
  for (;;) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, token, at: Date.now() }), { flag: 'wx' });
      let released = false;
      return {
        release() {
          if (released) return;
          released = true;
          try {
            const held = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
            if (held.token === token) fs.unlinkSync(lockPath);
          } catch {
            /* 이미 없음 */
          }
        },
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let held = null;
      try {
        held = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch {
        /* 쓰는 도중이거나 깨짐 → 아래 나이 검사로 판단 */
      }
      let age = 0;
      try {
        age = Date.now() - fs.statSync(lockPath).mtimeMs;
      } catch {
        continue; // 그사이 풀림
      }
      if ((held && held.pid && !pidAlive(held.pid)) || age > staleMs) {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          /* 다른 프로세스가 먼저 치움 */
        }
        continue;
      }
      if (Date.now() - started > timeoutMs) {
        throw Object.assign(new Error('상품 파일을 다른 작업이 쓰고 있어 잠시 뒤 다시 시도해 주세요'), { status: 503, code: 'LOCK_TIMEOUT' });
      }
      await sleep(pollMs);
    }
  }
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

// 잠금 → 최신 파일 읽기 → fn으로 고치기 → 통째로 저장 → 잠금 해제. fn은 고친 배열을 돌려준다 (undefined면 저장 안 함)
export async function updateProductsFile(productsFile, fn, lockOptions) {
  const lock = await acquireFileLock(lockPathFor(productsFile), lockOptions);
  try {
    const products = readJsonArray(productsFile);
    const next = await fn(products);
    if (next !== undefined) writeJsonAtomic(productsFile, next);
    return next;
  } finally {
    lock.release();
  }
}
