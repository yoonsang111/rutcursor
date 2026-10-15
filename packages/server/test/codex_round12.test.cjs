// C 공통 규칙 시험 (설계서 v2 C-1~C-10, 구현 전에 작성한 실패 조건)
// 실제 서버를 임시 데이터 폴더로 띄운 HTTP 시험. 실행: node --test packages/server/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const KEY = 'test-admin-key-0123456789abcdef';
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };
const IMG = 'https://img.example.com/real.jpg';
const T0 = '2026-10-14T00:00:00.000Z';
const T1 = '2026-10-15T00:00:00.000Z';
const OLD = '2026-10-01T00:00:00.000Z';
const ok = { status: 'available', source: '판매처', checkedAt: T0, scope: { whole: true } };
const klook = (extra = {}) => ({ partner: 'KLOOK', url: 'https://www.klook.com/activity/1', source: 'manual', externalId: '1', price: 30000, priceCurrency: 'KRW', priceConditions: '성인 1인', priceCheckedAt: T0, priceDisplay: '30,000원~', availability: ok, ...extra });
const seed = () => [{ id: '1', name: '상품', publishStatus: 'published', isAvailable: true, images: [IMG], views: 0, rev: 5, partnerLinks: [klook(), { partner: 'KKday', url: 'https://www.kkday.com/p/2', source: 'manual', price: 100, priceCurrency: 'USD', priceConditions: '성인', priceCheckedAt: T0 }] }];

let portBase = 30000 + Math.floor(Math.random() * 8000);
async function startServer(products = seed(), { dir = null, env = {} } = {}) {
  dir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'ts-rules-'));
  if (products) fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(products));
  if (!fs.existsSync(path.join(dir, 'counter.json'))) fs.writeFileSync(path.join(dir, 'counter.json'), '10');
  const port = portBase++;
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY, ...env }, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', d => (stderr += d));
  const exited = new Promise(r => proc.on('exit', (code, signal) => r(code ?? signal)));
  const base = `http://127.0.0.1:${port}/api`;
  let up = false;
  for (let i = 0; i < 150 && !up; i++) {
    if (proc.exitCode !== null || proc.signalCode !== null) break;
    try { await fetch(`${base}/counter`); up = true; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  const file = path.join(dir, 'products.json');
  return { base, dir, file, up, proc, exited, stderr: () => stderr, stored: () => JSON.parse(fs.readFileSync(file, 'utf8')), stop: async () => { if (proc.exitCode === null && proc.signalCode === null) { proc.kill(); await exited; } } };
}
const put = (s, id, body) => fetch(`${s.base}/products/${id}`, { method: 'PUT', headers: admin, body: JSON.stringify(body) });
const link0 = s => s.stored().find(p => p.id === '1').partnerLinks.find(l => l.partner.trim().toLowerCase() === 'klook');


test('R12-C same revision simultaneous saves: one success one 409',async()=>{
 const s=await startServer();try{const rs=await Promise.all([put(s,'1',{baseRev:5,name:'one'}),put(s,'1',{baseRev:5,tags:['two']})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);}finally{await s.stop();fs.rmSync(s.dir,{recursive:true,force:true});}
});
test('R12-C empty external ID removes inherited price and availability',async()=>{
 const s=await startServer();try{const r=await put(s,'1',{partnerLinks:[{partner:'KLOOK',url:klook().url,externalId:''}]});assert.equal(r.status,200);assert.equal(link0(s).price,undefined);assert.equal(link0(s).availability,undefined);}finally{await s.stop();fs.rmSync(s.dir,{recursive:true,force:true});}
});
test('R12-C overflowing numeric string must reject without saving',async()=>{
 const s=await startServer();try{const before=fs.readFileSync(s.file,'utf8');const r=await put(s,'1',{partnerLinks:[klook({price:'9'.repeat(400),priceCheckedAt:T1})]});console.log('R12-C overflow',r.status,await r.text());assert.equal(r.status,400);assert.equal(fs.readFileSync(s.file,'utf8'),before);}finally{await s.stop();fs.rmSync(s.dir,{recursive:true,force:true});}
});
test('R12-C directory rename retains writer identity',async()=>{
 const {writerLockKey,writerLockPort,acquireWriterLock}=await import('../src/writerLock.js');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r12-rename-'));const old=path.join(root,'old'),renamed=path.join(root,'new');fs.mkdirSync(old);
 const key=await writerLockKey(old);const lock=await acquireWriterLock(old);
 try{fs.renameSync(old,renamed);assert.equal(await writerLockKey(renamed),key);assert.equal(writerLockPort(await writerLockKey(renamed)),lock.port);await assert.rejects(acquireWriterLock(renamed,{waitMs:0}));}
 finally{lock.release();fs.rmSync(root,{recursive:true,force:true});}
});
