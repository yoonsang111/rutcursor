// 상품 파일 작성자 잠금 (9차 2회차 설계): 이 컴퓨터의 127.0.0.1 포트 하나를 '혼자' 열어 둔다.
// 운영체제가 한 프로세스에만 허락하고, 프로세스가 죽으면(강제 종료·재부팅 포함) 바로 풀어 준다 →
// 남는 잠금 파일·프로세스 번호 재사용·'죽은 잠금 정리' 경쟁이 없다 (예전 파일 잠금의 R8-03·R9-03 원인 제거).
// 포트는 데이터 폴더마다 정해짐 (같은 폴더를 쓰는 서버끼리만 겨룸). WRITER_LOCK_PORT로 바꿀 수 있음.
import net from 'net';
import crypto from 'crypto';

export const writerLockPort = (key) => 52000 + (parseInt(crypto.createHash('sha256').update(String(key)).digest('hex').slice(0, 8), 16) % 10000);

// 이전 서버가 끝나는 중이면 waitMs까지 기다리고, 그래도 쓰고 있으면 실패 (두 번째 서버 금지)
export function acquireWriterLock(key, { port = writerLockPort(key), waitMs = 15000 } = {}) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const server = net.createServer((socket) => socket.destroy());
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' && Date.now() - started < waitMs) return setTimeout(attempt, 250);
        const running = error.code === 'EADDRINUSE';
        reject(Object.assign(new Error(running ? `다른 서버가 이 상품 파일을 쓰고 있어요 (잠금 포트 ${port}). 서버는 하나만 켜야 해요` : `작성자 잠금 실패: ${error.message}`), { code: running ? 'WRITER_RUNNING' : 'WRITER_LOCK_FAILED' }));
      });
      server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
        server.unref();
        resolve({ port, release: () => server.close() });
      });
    };
    attempt();
  });
}
