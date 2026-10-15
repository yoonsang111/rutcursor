// 상품 데이터 작성자 잠금 (설계서 v2 C-1): 이 컴퓨터의 127.0.0.1 포트 하나를 '혼자' 열어 둔다.
// 운영체제가 한 프로세스에만 허락하고, 프로세스가 죽으면(강제 종료·재부팅 포함) 바로 풀어 준다 → 남는 잠금·정리 경쟁이 없다.
// 열쇠 = 데이터 폴더의 실제 정체성(장치·inode 번호). 경로 글자가 달라도(심볼릭 링크·이름 바꾼 경로) 같은 폴더면 같은 열쇠.
// 포트는 열쇠로만 정한다 (환경 변수로 못 바꿈). 포트가 쓰이고 있으면 연결해서 누가 쓰는지 알려 주지만, 어느 경우든 시작하지 않는다.
// 한계: 같은 컴퓨터·같은 네트워크 공간에서만 효과. 다른 폴더가 우연히 같은 포트(1/10000)면 그 폴더 서버는 시작 못 함(안전한 쪽).
import net from 'net';
import fs from 'fs';
import crypto from 'crypto';

export async function writerLockKey(dataDir) {
  const st = fs.statSync(dataDir, { bigint: true });
  return `${st.dev}:${st.ino}`;
}
export const writerLockPort = (key) => 52000 + (parseInt(crypto.createHash('sha256').update(String(key)).digest('hex').slice(0, 8), 16) % 10000);

// 포트를 쥔 쪽에 연결해 짧은 응답을 읽고 누구인지 구분 (진단용 — 소유 증명이 아님)
function probe(port, key) {
  return new Promise((resolve) => {
    let data = '';
    const sock = net.connect({ host: '127.0.0.1', port });
    const finish = (who) => { sock.destroy(); resolve(who); };
    sock.setTimeout(1000, () => finish('응답 없는 프로그램'));
    sock.on('data', (chunk) => { data += chunk; if (data.length > 300) finish('다른 프로그램'); });
    sock.on('end', () => {
      try {
        const msg = JSON.parse(data);
        if (msg.tsWriter === 1) return finish(msg.key === key ? '같은 데이터를 쓰는 다른 서버' : '다른 데이터 폴더의 서버(포트 번호 겹침)');
      } catch { /* JSON 아님 */ }
      finish('다른 프로그램');
    });
    sock.on('error', () => finish('확인할 수 없는 프로그램'));
  });
}

// 이전 서버가 끝나는 중이면 waitMs까지 기다리고, 그래도 쓰이고 있으면 실패
export async function acquireWriterLock(dataDir, { waitMs = 15000 } = {}) {
  const key = await writerLockKey(dataDir);
  const port = writerLockPort(key);
  const started = Date.now();
  for (;;) {
    const result = await new Promise((resolve) => {
      const server = net.createServer((sock) => { sock.end(JSON.stringify({ tsWriter: 1, key, pid: process.pid })); });
      server.maxConnections = 4;
      server.once('error', (error) => resolve({ error }));
      server.listen({ host: '127.0.0.1', port, exclusive: true }, () => { server.unref(); resolve({ server }); });
    });
    if (result.server) return { key, port, release: () => result.server.close() };
    if (result.error.code !== 'EADDRINUSE' || Date.now() - started >= waitMs) {
      const who = result.error.code === 'EADDRINUSE' ? await probe(port, key) : null;
      const message = who ? `잠금 포트 ${port}를 ${who}가 쓰고 있어요` : `작성자 잠금 실패 (${result.error.code || result.error.message})`;
      throw Object.assign(new Error(message), { code: who ? 'WRITER_RUNNING' : 'WRITER_LOCK_FAILED' });
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}
