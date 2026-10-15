// A5 조회 전용 복구 모드 시험 (구현 전에 작성한 실패 조건)
// 데이터 폴더에 RECOVERY_READ_ONLY 파일이 있으면: 쓰기 요청 503, GET 중 쓰기(조회수·조회 기록·분류 정리)도 안 함, 파일 직접 쓰기 스크립트는 멈춤.
// 표시 파일이 없으면 기존 동작 그대로. 실행: node --test packages/server/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const KEY = 'test-admin-key-0123456789abcdef';
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };
const IMG = 'https://img.example.com/a.jpg';

// 새 버전(C)이 쓴 모양의 데이터: 공개 상태·판매처 예약 상태·가격 정보·숨김 반영 기록
function newVersionData() {
  return [
    { id: '1', name: '공개', isAvailable: true, publishStatus: 'published', images: [IMG], views: 3, categories: ['테마파크'], locations: ['일본'],
      partnerLinks: [{ partner: 'KLOOK', url: 'https://k.example.com/1', source: 'manual', price: 30000, priceCurrency: 'KRW', priceConditions: '성인 1인', priceCheckedAt: '2026-10-14T00:00:00.000Z', availability: { status: 'available', scope: { whole: true }, source: '판매처', checkedAt: '2026-10-14T00:00:00.000Z' } }],
      visibilitySync: { state: 'done', since: '2026-10-13T00:00:00.000Z', from: 'hidden', to: 'published' } },
    { id: '2', name: '초안', isAvailable: false, publishStatus: 'draft', images: [], partnerLinks: [], views: 0 },
    { id: '3', name: '숨김(모순: 활성)', isAvailable: true, publishStatus: 'hidden', images: [IMG], partnerLinks: [], views: 0 },
  ];
}

async function start(dir, port) {
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dir, ADMIN_API_KEY: KEY }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/counter`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  return { base, stop: () => new Promise(r => { proc.on('exit', r); proc.kill(); }) };
}
// 데이터 폴더 전체(하위 폴더 포함)의 파일 지문
function fingerprint(dir) {
  const out = {};
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else out[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } };
  walk(dir);
  return out;
}
function setup(readOnly) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-ro-'));
  fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify(newVersionData(), null, 2));
  fs.writeFileSync(path.join(dir, 'counter.json'), '100');
  fs.writeFileSync(path.join(dir, 'view-events.json'), JSON.stringify({ 1: [Date.now() - 100 * 86400e3, Date.now() - 1000] })); // 오래된 기록(정리 대상) 포함
  if (readOnly) fs.writeFileSync(path.join(dir, 'RECOVERY_READ_ONLY'), '2026-10-15 복구 시험');
  return dir;
}



test('R13 A corrupt ancillary files must not silently overwrite in old mode',async()=>{
 const dir=setup(false);fs.writeFileSync(path.join(dir,'products.json'),JSON.stringify([{id:'100001',name:'existing',isAvailable:false,partnerLinks:[]}]));
 for(const f of ['counter.json','categories.json','locations.json'])fs.writeFileSync(path.join(dir,f),'{broken');
 const s=await start(dir,48213);try{
 for(const route of ['counter','categories','locations']){const r=await fetch(`${s.base}/${route}`);console.log('R13 A read',route,r.status,await r.text());}
 const r=await fetch(`${s.base}/products`,{method:'POST',headers:admin,body:JSON.stringify({name:'new',isAvailable:false,images:[],partnerLinks:[]})});console.log('R13 A post',r.status,await r.text(),'stored IDs',JSON.parse(fs.readFileSync(path.join(dir,'products.json'),'utf8')).map(p=>p.id),'counter',fs.readFileSync(path.join(dir,'counter.json'),'utf8'));assert.ok(r.status>=500,'counter failure must reject create');
 }finally{await s.stop();fs.rmSync(dir,{recursive:true,force:true})}
});
test('R13 A readonly corrupt ancillary files remain unchanged',async()=>{
 const dir=setup(true);for(const f of ['counter.json','categories.json','locations.json'])fs.writeFileSync(path.join(dir,f),'{broken');const before=fingerprint(dir);const s=await start(dir,48214);
 try{for(const route of ['counter','categories','locations']){const r=await fetch(`${s.base}/${route}`);console.log('R13 A readonly read',route,r.status,await r.text());const w=await fetch(`${s.base}/${route}`,{method:'POST',headers:admin,body:'{}'});assert.equal(w.status,503)}assert.deepEqual(fingerprint(dir),before)}finally{await s.stop();fs.rmSync(dir,{recursive:true,force:true})}
});
