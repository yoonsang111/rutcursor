// A 데이터 파일 규칙 시험 (13차 설계 재검토 — 구현 전에 작성)
// 필수: products.json(다른 데이터가 있을 때), counter.json(등록에 필요). 선택: view-events.json·categories.json·locations.json·coupons.json·images/
// 선택 파일이 없는 것은 정상. 손상된 필수 데이터는 기본값으로 덮어쓰지 않고, 그 파일에 기대는 쓰기를 거절. 새 번호 = max(카운터, 기존 최대 번호)+1
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const KEY = 'test-admin-key-0123456789abcdef';
const admin = { 'x-admin-key': KEY, 'Content-Type': 'application/json' };
const products = () => [1, 5].map(n => ({ id: String(100000 + n), name: `상품 ${n}`, isAvailable: true, images: [], partnerLinks: [{ partner: 'P', url: `https://p.example.com/${n}`, source: 'manual' }], views: 0 }));
let port = 50000 + Math.floor(Math.random() * 1500);
async function start(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-files-'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  const p = port++;
  const proc = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], { env: { ...process.env, PORT: String(p), DATA_DIR: dir, ADMIN_API_KEY: KEY }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${p}/api`;
  for (let i = 0; i < 100; i++) { try { await fetch(`${base}/products`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
  return { base, dir, read, stop: () => new Promise(r => { proc.on('exit', r); proc.kill(); }) };
}
const post = (s, body = { name: '새 상품', isAvailable: false }) => fetch(`${s.base}/products`, { method: 'POST', headers: admin, body: JSON.stringify(body) });


test('R14 A unsafe integer counter must reject and preserve required files', async()=>{
 const s=await start({'products.json':JSON.stringify(products()),'counter.json':'9007199254740992'});
 try { const before=s.read('products.json');const statuses=[];for(let i=0;i<2;i++){const r=await post(s);statuses.push(r.status);console.log('unsafe counter',r.status,await r.text());}console.log('stored IDs',JSON.parse(s.read('products.json')).map(p=>p.id));assert.ok(statuses.every(x=>x>=500));assert.equal(s.read('products.json'),before); }finally{await s.stop();}
});
for(const name of ['categories.json','locations.json','coupons.json','view-events.json'])test('R14 A missing products with '+name,async()=>{
 const s=await start({[name]:'{}'});try{const r=await post(s);console.log('missing products',name,r.status);assert.ok(r.status>=500,name);assert.ok(!fs.existsSync(path.join(s.dir,'products.json')));}finally{await s.stop();}
});
test('R14 A optional absence or corruption and readonly combinations',async()=>{
 for(const ro of [false,true])for(const broken of [false,true]){
 const files={'products.json':JSON.stringify(products()),'counter.json':'100005'};
 if(ro)files.RECOVERY_READ_ONLY='test';
 if(broken)for(const n of ['categories.json','locations.json','coupons.json','view-events.json'])files[n]='{broken';
 const s=await start(files);try{
 const before=Object.fromEntries(fs.readdirSync(s.dir).map(n=>[n,s.read(n)]));
 for(const route of ['products','categories','locations','coupons','metrics/views'])assert.equal((await fetch(s.base+'/'+route)).status,200,route);
 assert.equal((await post(s)).status,ro?503:201);
 if(ro)assert.deepEqual(Object.fromEntries(fs.readdirSync(s.dir).map(n=>[n,s.read(n)])),before);
 else if(broken)for(const n of ['categories.json','locations.json','coupons.json','view-events.json'])assert.equal(s.read(n),'{broken');
 }finally{await s.stop();}
 }
});
