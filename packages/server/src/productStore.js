// 상품 파일(products.json) 저장 도구.
// 쓰는 쪽은 하나: 운영 API 서버 한 프로세스만 상품 파일을 쓴다 (가격·평점 갱신, 공개 상태 이전도 서버 API를 거침).
// 서버는 켜져 있는 동안 작성자 잠금(writerLock.js)을 쥐고, 두 번째 서버는 시작하지 못한다.
// 저장은 임시 파일에 다 쓴 뒤 이름 바꾸기로 통째로 교체하고, 읽기·쓰기 실패는 오류로 알린다 (빈 목록으로 덮어쓰지 않게).
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 파일 잠금 (서버는 쓰지 않음 — 서버의 작성자 잠금은 writerLock.js). 손으로 돌리는 도구용으로 남겨 둠.
// 잠금 파일을 새로 만들 수 있을 때까지 기다린다. 남의 잠금은 (주인이 죽었어도) 절대 지우지 않는다 — 시간 초과로 실패할 뿐.
export async function acquireFileLock(lockPath, { timeoutMs = 15000, pollMs = 25 } = {}) {
  const started = Date.now();
  const token = `${process.pid}-${started}-${Math.random().toString(36).slice(2)}`;
  for (;;) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, token, at: Date.now() }), { flag: 'wx' });
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

