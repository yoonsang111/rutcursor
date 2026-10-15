import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPartnerIntegration } from './integrations/index.js';
import { readJsonArray, writeJsonAtomic, writeFileAtomic } from './productStore.js';
import { acquireWriterLock } from './writerLock.js';
import { migrate as migratePublishStatus, normalizeEvidence, changeTable } from './publishMigration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// CORS 설정 (환경 변수에서 가져오거나 기본값 사용)
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

console.log(`[서버] CORS 허용 오리진:`, corsOrigins);
console.log(`[서버] 환경: ${process.env.NODE_ENV || 'development'}`);
console.log(`[서버] 포트: ${PORT}`);

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// 기본 보안 헤더. API는 CloudFront를 거치지 않아 여기서 직접 붙인다.
// CSP는 넣지 않는다 - JSON API라 실익이 없고, 잘못 넣으면 어드민 화면이 깨진다.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  // 응답에 Express 버전을 광고할 이유가 없다
  res.removeHeader('X-Powered-By');
  next();
});

// 어드민 base64 이미지 등으로 본문이 클 수 있음 (기본 100kb 제한 초과 시 PUT 실패)
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '25mb' }));

// 상품 등록/수정처럼 데이터를 바꾸는 엔드포인트는 고정 API 키가 있어야만 호출할 수 있게 한다.
// 조회(GET)와 공개 사이트가 쓰는 조회수 증가/항공권 링크 생성은 인증 없이 그대로 열어둔다.
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const ADMIN_KEY_HEADER = 'x-admin-key';

if (!ADMIN_API_KEY) {
  console.warn('[서버] ⚠️  ADMIN_API_KEY가 설정되지 않았습니다. 상품 등록/수정 등 쓰기 API가 전부 차단됩니다.');
} else {
  console.log('[서버] 쓰기 API 인증 활성화됨 (X-Admin-Key)');
}

// 길이가 달라도 timingSafeEqual이 던지지 않도록 해시로 고정 길이 비교
const sameSecret = (provided, expected) => {
  if (!expected || typeof provided !== 'string' || provided.length === 0) return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};
const isValidAdminKey = (provided) => sameSecret(provided, ADMIN_API_KEY);
// TOURSTREAM OFFICE(AI 사무실) 전용 키: 같은 x-admin-key 머리글로 보내지만 서버가 '사무실'로 구분한다.
// 사무실 키는 상품 조회(초안 포함)와 초안 등록만 할 수 있다 — 공개·숨김·수정·삭제 불가 (요청 머리글을 빼도 마찬가지)
const OFFICE_API_KEY = process.env.OFFICE_API_KEY || '';
const isValidOfficeKey = (provided) => Boolean(OFFICE_API_KEY) && OFFICE_API_KEY !== ADMIN_API_KEY && sameSecret(provided, OFFICE_API_KEY);

// 쓰기 요청 속도 제한. 관리자 키가 43자라 현실적으로 추측은 어렵지만,
// 시도 자체를 막아야 로그가 더러워지지 않고 같은 통로로 서버를 때리는 것도 막힌다.
// 외부 라이브러리 없이 메모리 카운터로 처리한다(서버가 1대라 충분).
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_WRITES = 600; // 인증된 쓰기 (일괄 등록 스크립트가 한 번에 100건 가까이 쓴다)
const RATE_MAX_FAILED_AUTH = 10; // 분당 인증 실패
const rateBuckets = new Map();

const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

const hitLimit = (key, max, now = Date.now()) => {
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
};

// 오래된 기록은 주기적으로 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  rateBuckets.forEach((bucket, key) => {
    if (now - bucket.start >= RATE_WINDOW_MS * 2) rateBuckets.delete(key);
  });
}, RATE_WINDOW_MS).unref?.();

// ── 어드민 세션 ───────────────────────────────────────────────────────────────
// 브라우저가 관리자 키를 들고 있으면 XSS 한 번에 통째로 털린다.
// 로그인 때만 키를 받고, 이후에는 JS가 읽을 수 없는 HttpOnly 쿠키로 인증한다.
// 토큰은 만료시각에 키로 서명한 값이라 서버에 세션 저장소가 필요 없고 재시작해도 유지된다.
// 키를 바꾸면 기존 토큰이 전부 무효가 된다.
const SESSION_COOKIE = 'ts_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const signSession = (expiresAt) =>
  crypto.createHmac('sha256', ADMIN_API_KEY).update(String(expiresAt)).digest('hex');

const issueSessionToken = () => {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${signSession(expiresAt)}`;
};

const isValidSessionToken = (token) => {
  if (!ADMIN_API_KEY || typeof token !== 'string') return false;
  const [expiresRaw, signature] = token.split('.');
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = signSession(expiresAt);
  if (typeof signature !== 'string' || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

// cookie-parser 의존성을 늘리지 않고 필요한 쿠키 하나만 읽는다
const readCookie = (req, name) =>
  String(req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => decodeURIComponent(part.slice(name.length + 1)))[0] || '';

const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax', // admin/api 모두 tourstream.kr 하위라 same-site로 취급된다
  path: '/',
};

// 조회 요청이 관리자(어드민 로그인 쿠키 또는 관리자 키)인지. 비활성 상품은 관리자에게만 보여 준다.
const isAdminRequest = (req) =>
  isValidSessionToken(readCookie(req, SESSION_COOKIE)) || isValidAdminKey(req.get(ADMIN_KEY_HEADER)) || isValidOfficeKey(req.get(ADMIN_KEY_HEADER));
// 공개 상태가 '공개'인 상품만 손님(비로그인)에게 보인다. 초안·숨김·분류 필요는 관리자만 (publishStatusOf는 아래 상품 정책 참고)
const visibleTo = (req, products) => (isAdminRequest(req) ? products : products.filter(isPublicProduct));

const requireAdminKey = (req, res, next) => {
  if (!ADMIN_API_KEY) {
    console.error(`[인증] ADMIN_API_KEY 미설정으로 거부: ${req.method} ${req.path}`);
    return res.status(503).json({ error: '서버에 관리자 키가 설정되지 않아 쓰기 요청을 처리할 수 없습니다' });
  }

  const ip = clientIp(req);

  // 브라우저는 HttpOnly 쿠키로, 배치 스크립트는 헤더로 인증한다.
  if (isValidSessionToken(readCookie(req, SESSION_COOKIE))) { req.tsActor = 'admin'; return next(); }

  // 사무실 키: 초안 등록(POST /api/products)만 허용
  if (isValidOfficeKey(req.get(ADMIN_KEY_HEADER))) {
    req.tsActor = 'office';
    if (!(req.method === 'POST' && req.baseUrl + req.path === '/api/products')) {
      return res.status(403).json({ error: 'AI 사무실 키로는 초안 등록만 할 수 있어요' });
    }
    return next();
  }

  // 인증 실패부터 센다. 무차별 대입을 막는 게 목적이라 임계값을 낮게 둔다.
  if (!isValidAdminKey(req.get(ADMIN_KEY_HEADER))) {
    const tooMany = hitLimit(`auth:${ip}`, RATE_MAX_FAILED_AUTH);
    console.warn(`[인증] 거부: ${req.method} ${req.path} (${ip})`);
    if (tooMany) {
      return res.status(429).json({ error: '인증 시도가 너무 많습니다. 잠시 후 다시 시도해주세요' });
    }
    return res.status(401).json({ error: '관리자 인증이 필요합니다' });
  }

  req.tsActor = 'admin';
  // 인증은 통과했지만 폭주하는 경우에 대한 안전장치.
  // 일괄 등록 스크립트가 정상적으로 수백 건을 쓰므로 한도를 넉넉히 잡는다.
  if (hitLimit(`write:${ip}`, RATE_MAX_WRITES)) {
    console.warn(`[속도제한] 쓰기 과다: ${ip} ${req.method} ${req.path}`);
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' });
  }

  return next();
};

const sameProductId = (a, b) => String(a) === String(b);
const findProductIndex = (products, id) => products.findIndex((p) => sameProductId(p.id, id));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: 'TourStream API Server',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      categories: '/api/categories',
      locations: '/api/locations',
      counter: '/api/counter'
    },
    documentation: 'See packages/server/API.md for detailed API documentation'
  });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('[서버 에러]', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다', message: err.message });
});

// 데이터 파일 경로 (상대 경로는 항상 현재 워크스페이스 기준)
const resolveDataDir = () => {
  const envDir = process.env.DATA_DIR;
  if (!envDir) return path.resolve(process.cwd(), 'packages/server/data');
  if (path.isAbsolute(envDir)) return envDir;
  return path.resolve(process.cwd(), envDir);
};

const DATA_DIR = resolveDataDir();
const LEGACY_DATA_DIR = process.env.DATA_DIR && !path.isAbsolute(process.env.DATA_DIR)
  ? path.join(__dirname, '..', process.env.DATA_DIR)
  : null;

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
// 상품 이미지는 products.json 안에 base64로 들어오면 파일로 떼어내 여기에 저장한다.
// (data 디렉터리는 배포 rsync에서 제외되므로 배포해도 지워지지 않는다)
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || 'https://api.tourstream.kr').replace(/\/$/, '');
const COUNTER_FILE = path.join(DATA_DIR, 'counter.json');
const VIEW_EVENTS_FILE = path.join(DATA_DIR, 'view-events.json');

// 공개 여부가 바뀌면(공개→숨김·초안·삭제, 또는 그 반대) 메인 사이트 정적 페이지·사이트맵을 다시 만들어 달라고 GitHub에 알림.
// 다시 만드는 코드는 '마지막으로 승인된 배포 커밋'(deploy.yml의 예약 실행과 같은 규칙) — 승인 안 된 코드는 나가지 않음.
// GITHUB_DISPATCH_TOKEN(이 저장소의 'Actions: 읽기·쓰기'만 있는 세분화 토큰 — 코드 쓰기 권한 없음)이 없으면 알리지 않고 다음 예약 빌드(매일 00:30)에 반영.
// ponytail: 2분 안의 여러 변경은 한 번으로 묶음 (빌드는 3~5분 걸림)
const DISPATCH_TOKEN = process.env.GITHUB_DISPATCH_TOKEN || '';
const DISPATCH_REPO = process.env.GITHUB_DISPATCH_REPO || 'yoonsang111/rutcursor';
const DISPATCH_API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, ''); // 시험에서만 바꿈
const REBUILD_DEBOUNCE_MS = Number(process.env.REBUILD_DEBOUNCE_MS) || 2 * 60 * 1000;
let rebuildTimer = null;
const rebuildReasons = [];
const requestPublicRebuild = (reason) => {
  if (!DISPATCH_TOKEN) {
    console.log(`[공개 변경] ${reason} — GitHub 알림 토큰이 없어 다음 예약 빌드에 반영돼요`);
    return;
  }
  rebuildReasons.push(reason);
  if (rebuildTimer) return;
  rebuildTimer = setTimeout(async () => {
    const reasons = rebuildReasons.splice(0).slice(0, 20);
    rebuildTimer = null;
    try {
      // workflow_dispatch(mode=rebuild-main): Actions 실행 권한만 필요. 다시 빌드할 커밋은 워크플로가 '마지막 승인 배포'에서 고름
      const r = await fetch(`${DISPATCH_API}/repos/${DISPATCH_REPO}/actions/workflows/deploy.yml/dispatches`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${DISPATCH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'main', inputs: { mode: 'rebuild-main' } }),
        signal: AbortSignal.timeout(15000),
      });
      console.log(`[공개 변경] 메인 사이트 다시 빌드 요청 ${r.status === 204 ? '성공' : `실패(${r.status})`}: ${reasons.join(', ')}`);
    } catch (error) {
      console.warn('[공개 변경] 메인 사이트 다시 빌드 요청 실패 — 다음 예약 빌드에 반영:', error.message);
    }
  }, REBUILD_DEBOUNCE_MS);
  rebuildTimer.unref?.();
};

// 상품 파일을 쓰는 요청은 한 줄로 세운다 (이 서버 안의 대기열). 다른 프로세스는 상품 파일을 쓰지 않고 이 서버 API를 거친다 —
// 서버는 켜져 있는 동안 작성자 잠금을 쥐고 있어서 두 번째 서버나 파일을 직접 쓰는 스크립트와 겹치지 않는다.
// 응답이 끝나야 다음 요청이 상품 파일을 읽는다 → 읽기→고치기→저장이 서로 섞이지 않음
let productsQueue = Promise.resolve();
const lockProducts = (req, res, next) => {
  let releaseQueue;
  const turn = new Promise((resolve) => { releaseQueue = resolve; });
  const previous = productsQueue;
  productsQueue = previous.then(() => turn);
  previous.then(() => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      releaseQueue();
    };
    res.once('finish', done);
    res.once('close', done);
    if (res.writableEnded || res.destroyed) { done(); return; } // 기다리는 사이 손님이 연결을 끊음
    next();
  });
};

// 데이터 폴더가 없으면 만들기 (잠금 열쇠가 폴더 정체성이라 이것만 잠금 전에 함). 그 밖의 쓰기는 모두 잠금 뒤
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 서버 시작: 작성자 잠금을 얻고 끝날 때까지 쥔다 (상품 데이터는 이 서버 한 프로세스만 씀 — 설계서 v2 C-1).
// 이전 서버가 끝나는 중이면 잠깐(최대 15초) 기다리고, 그래도 다른 서버·프로그램이 포트를 쓰고 있으면 시작하지 않는다.
let writerLock;
try {
  // 폴더 잠금으로 지킬 수 없는 구성은 시작 거절: 상품 파일이 심볼릭 링크이거나 다른 이름으로도 연결된 하드 링크
  if (fs.existsSync(PRODUCTS_FILE)) {
    const st = fs.lstatSync(PRODUCTS_FILE);
    if (st.isSymbolicLink()) throw new Error('상품 파일이 심볼릭 링크예요 (다른 폴더의 파일을 가리키면 폴더 잠금으로 지킬 수 없어요)');
    if (st.nlink > 1) throw new Error('상품 파일이 하드 링크로 다른 곳과 연결돼 있어요 (폴더 잠금으로 지킬 수 없어요)');
  }
  writerLock = await acquireWriterLock(DATA_DIR);
} catch (error) {
  console.error(`[서버] 시작하지 않아요: ${error.message}`);
  process.exit(1);
}
const releaseWriterLock = () => { try { writerLock.release(); } catch { /* 이미 없음 */ } };
process.once('exit', releaseWriterLock);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { releaseWriterLock(); process.exit(0); });

// 조회 전용(복구) 모드: 데이터 폴더에 RECOVERY_READ_ONLY가 있으면 아무것도 쓰지 않는다 (요청마다 확인, 복구 실행자가 만들고 지움 — 복구절차.md)
const RECOVERY_MARK = path.join(DATA_DIR, 'RECOVERY_READ_ONLY');
const readOnlyReason = () => (fs.existsSync(RECOVERY_MARK) ? '복구 표시 파일이 있어요' : null);
const assertWritable = () => {
  const reason = readOnlyReason();
  if (reason) throw Object.assign(new Error(`복구 중 읽기 전용이라 저장할 수 없어요: ${reason}`), { status: 503 });
};
const RO_ALLOWED = new Set(['/api/admin/login', '/api/admin/logout', '/api/admin/session']);
app.use((req, res, next) => {
  const reason = readOnlyReason();
  if (!reason || ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || RO_ALLOWED.has(req.path)) return next();
  return res.status(503).json({ error: `복구 중 읽기 전용이라 저장할 수 없어요: ${reason}` });
});

// 이 데이터는 새 버전(공개 상태·가격 묶음) 형식이라는 표시 — 예전 버전 서버(A)는 이 파일을 보면 조회 전용으로 동작
if (!readOnlyReason()) writeJsonAtomic(path.join(DATA_DIR, 'schema.json'), { schemaVersion: 2, writer: 'tourstream-api', at: new Date().toISOString() });
if (!fs.existsSync(IMAGES_DIR) && !readOnlyReason()) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// 떼어낸 이미지 파일 서빙. 파일명이 내용 해시라 내용이 바뀌면 이름도 바뀌므로 영구 캐시해도 안전하다.
app.use('/images', express.static(IMAGES_DIR, { maxAge: '365d', immutable: true }));

const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

// base64 data URI를 파일로 저장하고 URL을 돌려준다. 이미 URL이면 그대로 둔다.
const externalizeImage = (value) => {
  const src = String(value || '').trim();
  if (!src.startsWith('data:')) return src;
  const m = src.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!m) return '';
  const ext = EXT_BY_MIME[m[1].toLowerCase()];
  if (!ext) return '';
  try {
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length === 0) return '';
    const name = `${crypto.createHash('sha1').update(buf).digest('hex')}.${ext}`;
    const file = path.join(IMAGES_DIR, name);
    if (!fs.existsSync(file)) { assertWritable(); fs.writeFileSync(file, buf); }
    return `${PUBLIC_API_URL}/images/${name}`;
  } catch (error) {
    console.error('[이미지] 파일 저장 실패:', error.message);
    return '';
  }
};

// 레거시 경로에만 데이터가 있는 경우 자동 이관 (잠금 뒤, 조회 전용이면 안 함)
if (LEGACY_DATA_DIR && LEGACY_DATA_DIR !== DATA_DIR && !readOnlyReason()) {
  ['products.json', 'counter.json', 'categories.json', 'locations.json', 'view-events.json'].forEach((fileName) => {
    const legacyFile = path.join(LEGACY_DATA_DIR, fileName);
    const currentFile = path.join(DATA_DIR, fileName);
    if (fs.existsSync(legacyFile) && !fs.existsSync(currentFile)) {
      fs.copyFileSync(legacyFile, currentFile);
    }
  });
}

// 레거시 externalUrl1~5 고정 필드 -> partnerLinks 배열 자동 변환 (예전 위치별 파트너 매핑 유지)
const LEGACY_PARTNER_NAMES = ['마이리얼트립', 'KLOOK', 'KKday', 'GetYourGuide', '트립닷컴'];

const migrateLegacyPartnerLinks = (product) => {
  if (Array.isArray(product.partnerLinks)) return product;
  const { externalUrl1, externalUrl2, externalUrl3, externalUrl4, externalUrl5, ...rest } = product;
  const legacyUrls = [externalUrl1, externalUrl2, externalUrl3, externalUrl4, externalUrl5];
  const partnerLinks = legacyUrls
    .map((url, idx) => ({
      partner: LEGACY_PARTNER_NAMES[idx],
      url: typeof url === 'string' ? url.trim() : '',
      source: 'manual',
    }))
    .filter((link) => link.url);
  return { ...rest, partnerLinks };
};

// 파일에서 데이터 읽기 — 깨졌으면 오류 (빈 목록으로 읽은 뒤 저장해서 상품을 전부 지우는 사고 방지)
const readProducts = () => readJsonArray(PRODUCTS_FILE);

// 서버 시작 때 한 번: 예전 externalUrl 필드를 partnerLinks로 바꿔 저장 (조회 전용이면 안 함)
try {
  const parsed = readJsonArray(PRODUCTS_FILE);
  if (parsed.some((p) => !Array.isArray(p.partnerLinks)) && !readOnlyReason()) {
    console.log('[API] products.json 레거시 externalUrl 필드 감지, partnerLinks로 자동 마이그레이션...');
    writeJsonAtomic(PRODUCTS_FILE, parsed.map(migrateLegacyPartnerLinks));
  }
} catch (error) {
  console.error('[API] 상품 파일 확인 실패 (서버는 켜지만 상품 요청은 오류로 응답):', error.message);
}

const readCounter = () => {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = fs.readFileSync(COUNTER_FILE, 'utf8');
      return parseInt(data, 10) || 100000;
    }
  } catch (error) {
    console.error('카운터 읽기 오류:', error);
  }
  return 100000;
};

const readViewEvents = () => {
  try {
    if (fs.existsSync(VIEW_EVENTS_FILE)) {
      const data = fs.readFileSync(VIEW_EVENTS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch (error) {
    console.error('조회수 이벤트 읽기 오류:', error);
  }
  return {};
};

// 파일에 데이터 쓰기 — 임시 파일에 다 쓴 뒤 교체. 실패하면 오류를 던져서 요청에 실패로 응답 (성공처럼 보이지 않게)
// 조회 전용(복구)이면 상품·번호 저장은 503 오류 (요청은 앞에서 막히지만, 막힌 뒤에 표시가 생긴 경우도 성공처럼 보이지 않게)
const writeProducts = (products) => { assertWritable(); writeJsonAtomic(PRODUCTS_FILE, products); };

const writeCounter = (counter) => { assertWritable(); writeFileAtomic(COUNTER_FILE, counter.toString()); };

// 조회 기록 정리는 화면을 볼 때 따라오는 쓰기라 조회 전용이면 조용히 건너뜀 (사용자 입력이 아님)
const writeViewEvents = (viewEvents) => {
  if (readOnlyReason()) return;
  try {
    fs.writeFileSync(VIEW_EVENTS_FILE, JSON.stringify(viewEvents, null, 2), 'utf8');
  } catch (error) {
    console.error('조회수 이벤트 쓰기 오류:', error);
  }
};

// 조회수에서 제외할 자동 접근.
// 'bot'이 안 들어가는 크롤러가 많아서(네이버 yeti, 다음 daumoa 등) 이름을 직접 나열한다.
// 특히 yeti가 빠져 있어 네이버가 사이트를 돌 때마다 조회수가 올라가고 있었다.
// 'naver'를 통째로 넣으면 네이버 앱 인앱브라우저로 보는 실제 사용자까지 빠지므로 크롤러 이름만 쓴다.
const BOT_UA_PATTERN = new RegExp(
  [
    'bot', 'crawler', 'spider', 'crawl', // 일반
    'bingpreview', 'slurp', 'mediapartners-google', 'adsbot', // 검색엔진
    'yeti', 'daumoa', 'yandex', 'baidu', 'duckduck', 'applebot', 'petalbot', 'seznam',
    'facebookexternalhit', 'discordbot', 'telegrambot', 'twitterbot', 'kakaotalk-scrap', 'slackbot', // SNS 미리보기
    'curl', 'wget', 'python-requests', 'node-fetch', 'axios', 'go-http-client', 'headlesschrome', 'lighthouse', // 도구
  ].join('|'),
);

const isBotUserAgent = (userAgent = '') => {
  const normalized = String(userAgent || '').toLowerCase();
  // UA가 비어 있는 요청은 사람 브라우저가 아니다
  if (!normalized) return true;
  return BOT_UA_PATTERN.test(normalized);
};

const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;
const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

const getRecentViewMeta = (viewEvents = {}, productId, nowMs = Date.now()) => {
  const events = Array.isArray(viewEvents[productId]) ? viewEvents[productId] : [];
  const recent7d = events.reduce((count, ts) => (typeof ts === 'number' && nowMs - ts <= DAYS_7_MS ? count + 1 : count), 0);
  const recent30d = events.reduce((count, ts) => (typeof ts === 'number' && nowMs - ts <= DAYS_30_MS ? count + 1 : count), 0);
  return { recentViews7d: recent7d, recentViews30d: recent30d };
};

const trimExpiredViewEvents = (viewEvents = {}, nowMs = Date.now()) => {
  const result = {};
  Object.entries(viewEvents).forEach(([productId, events]) => {
    if (!Array.isArray(events)) return;
    const validEvents = events.filter((ts) => typeof ts === 'number' && nowMs - ts <= DAYS_30_MS);
    if (validEvents.length > 0) {
      result[productId] = validEvents;
    }
  });
  return result;
};

const warnIfViewSpike = (productId, viewEvents, nowMs = Date.now()) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const events = Array.isArray(viewEvents[productId]) ? viewEvents[productId] : [];
  const todayCount = events.reduce((count, ts) => (typeof ts === 'number' && nowMs - ts <= dayMs ? count + 1 : count), 0);
  const recent7d = events.reduce((count, ts) => (typeof ts === 'number' && nowMs - ts <= DAYS_7_MS ? count + 1 : count), 0);
  const avgDaily7d = recent7d / 7;
  if (todayCount >= 50 && avgDaily7d > 0 && todayCount > avgDaily7d * 5) {
    console.warn(`[뷰 모니터링] 비정상 조회수 급증 감지: product=${productId}, today=${todayCount}, avg7d=${avgDaily7d.toFixed(1)}`);
  }
};

const buildViewMetrics = (products, viewEvents, nowMs = Date.now()) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const metrics = products.map((product) => {
    const { recentViews7d, recentViews30d } = getRecentViewMeta(viewEvents, product.id, nowMs);
    const events = Array.isArray(viewEvents[product.id]) ? viewEvents[product.id] : [];
    const todayViews = events.reduce((count, ts) => (typeof ts === 'number' && nowMs - ts <= dayMs ? count + 1 : count), 0);
    const avgDaily7d = recentViews7d / 7;
    const spikeScore = avgDaily7d > 0 ? Number((todayViews / avgDaily7d).toFixed(2)) : 0;
    return {
      id: product.id,
      name: product.name,
      totalViews: Number(product.views) || 0,
      recentViews7d,
      recentViews30d,
      todayViews,
      spikeScore,
    };
  });

  return {
    generatedAt: new Date(nowMs).toISOString(),
    topBy7d: [...metrics].sort((a, b) => b.recentViews7d - a.recentViews7d).slice(0, 10),
    topBy30d: [...metrics].sort((a, b) => b.recentViews30d - a.recentViews30d).slice(0, 10),
    suspicious: metrics
      .filter((item) => item.todayViews >= 50 && item.spikeScore >= 5)
      .sort((a, b) => b.spikeScore - a.spikeScore),
  };
};

const readJsonIfExists = (filePath, fallbackValue) => {
  try {
    if (!fs.existsSync(filePath)) return fallbackValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[파일 파싱 오류] ${filePath}:`, error.message);
    return fallbackValue;
  }
};

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const toNumberOrUndefined = (value, { min, max } = {}) => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  if (min !== undefined && numeric < min) return undefined;
  if (max !== undefined && numeric > max) return undefined;
  return numeric;
};

const toTrimmedStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const COUNTRY_NAME_SET = new Set([
  '한국',
  '일본',
  '중국',
  '홍콩',
  '마카오',
  '대만',
  '싱가포르',
  '태국',
  '베트남',
  '말레이시아',
  '미국',
  '프랑스',
  '이탈리아',
  '스페인',
  '독일',
]);

// 검색 API 없이 URL 파라미터 조합만으로 트래킹 링크가 되는 파트너.
// 이름이 일치하면 저장 시 자동으로 변환하고, 어드민에서 별도 버튼을 누를 필요가 없음.
const AUTO_TRACKED_PARTNER_KEYS = { klook: 'klook', kkday: 'kkday' };

const normalizeProductPayload = async (input = {}) => {
  // 서버만 정하는 칸(숨김 반영 상태·이전 기록)은 요청으로 바꿀 수 없음
  const { visibilitySync: _vs, publishMigration: _pm, ...payload } = input || {};
  const categories = toTrimmedStringArray(payload.categories);
  const locations = toTrimmedStringArray(payload.locations);

  const normalized = {
    ...payload,
    name: String(payload.name || '').trim(),
    description: String(payload.description || '').trim(),
    categories: categories.length > 0 ? categories : ['미분류'],
    locations: locations.length > 0 ? locations : ['기타'],
    tags: toTrimmedStringArray(payload.tags),
    // base64로 들어온 이미지는 파일로 떼어낸다. 안 그러면 /api/products 응답에 전부 실려
    // 방문자가 어느 페이지를 열든 수 MB를 내려받게 된다.
    images: toTrimmedStringArray(payload.images).filter((img) => !isPlaceholderImage(img)), // 파일 저장은 검사 뒤 externalizeImages에서
    isRecommended: Boolean(payload.isRecommended),
  };

  const price = toNumberOrUndefined(payload.price, { min: 0 });
  const minPrice = toNumberOrUndefined(payload.minPrice, { min: 0 });
  const salePrice = toNumberOrUndefined(payload.salePrice, { min: 0 });
  const rating = toNumberOrUndefined(payload.rating, { min: 0, max: 5 });
  const reviewCount = toNumberOrUndefined(payload.reviewCount, { min: 0 });

  // 숫자로 바꿀 수 없는 값('not-a-price', 빈 칸 등)은 원래 글자 그대로 남기지 않고 지운다 (가격이 있는 것처럼 보이지 않게)
  for (const [key, value] of Object.entries({ price, minPrice, salePrice, rating, reviewCount })) {
    if (value !== undefined) normalized[key] = value;
    else delete normalized[key];
  }

  delete normalized.partnerLinks; // 판매처 목록은 저장된 목록과 합쳐야 해서 처리 함수(mergePartnerLinks)에서
  delete normalized.rev; // 저장 번호는 서버만 정함
  delete normalized.baseRev;

  return normalized;
};


// ── 상품 공개 상태와 판매처 예약 가능 여부 (2026-10-14 대표 확정 정책) ─────────────────────────
// 공개 상태(publishStatus) — 손님에게 보여 줄지:
//   draft 초안(작성·수집·검수 중, 관리자만) / published 공개 / hidden 숨김(정보 오류 등으로 의도적으로 공개 중단)
//   needs_classification 분류 필요(예전 '비활성'을 옮길 때 근거가 부족한 상품. 비공개, 관리자가 정함)
// 판매처 예약 가능 여부(partnerLinks[].availability)는 공개 상태와 따로 관리하고, 서로를 자동으로 바꾸지 않는다.
// (이 구역의 함수는 상품 등록·수정 처리에서 쓰므로 normalizeProductPayload 바로 뒤에 둔다)
const PUBLISH_STATUSES = ['draft', 'published', 'hidden', 'needs_classification'];
const SETTABLE_PUBLISH_STATUSES = ['draft', 'published', 'hidden'];
const publishStatusOf = (product) => {
  if (PUBLISH_STATUSES.includes(product?.publishStatus)) {
    // 이 서버는 공개 상태와 isAvailable을 늘 같이 맞춰 저장한다. 둘이 다르면 예전 버전(복구 기간)이 isAvailable만 바꾼 것 →
    // 공개였는데 비활성으로 바뀜 = 숨김 (다시 공개되지 않게), 비공개였는데 활성으로 바뀜 = 분류 필요 (관리자가 확인 후 공개)
    if (product.publishStatus === 'published' && product.isAvailable === false) return 'hidden';
    if (product.publishStatus !== 'published' && product.isAvailable === true) return 'needs_classification';
    return product.publishStatus;
  }
  // 이전 전 데이터: 활성은 지금 노출 유지(공개), 비활성은 근거 없이 정하지 않음(분류 필요)
  return product?.isAvailable === false ? 'needs_classification' : 'published';
};
const isPublicProduct = (product) => publishStatusOf(product) === 'published';

const productInputError = (message, status = 400) => Object.assign(new Error(message), { status });
const sendProductError = (res, error) => {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) console.error('[상품 처리 오류]', error);
  return res.status(status).json({
    error: status >= 500 && !error?.status ? '상품을 저장하지 못했어요. 변경은 반영되지 않았어요. 잠시 뒤 다시 시도해 주세요' : error.message,
  });
};
const maxProductNumber = (products) => products.reduce((max, p) => (/^\d+$/.test(String(p?.id)) ? Math.max(max, Number(p.id)) : max), 0);

// placeholder(자리표시) 사진은 실제 상품 사진으로 인정하지 않는다
const PLACEHOLDER_IMAGE_PATTERN = /placeholder|placehold\.(co|it)|dummyimage\.com|fakeimg\.pl|placekitten\.com|no[-_]?image/i;
const isPlaceholderImage = (src) => PLACEHOLDER_IMAGE_PATTERN.test(String(src || ''));
const isWebUrl = (value, protocols, allowLocal = false) => {
  try {
    const url = new URL(String(value || ''));
    return protocols.includes(url.protocol) && (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname) || (allowLocal && url.hostname === 'localhost'));
  } catch {
    return false;
  }
};
// 로컬 서버가 만든 사진 주소(localhost)도 사진으로 인정
// 아직 파일로 떼어내기 전의 사진(data URI)도 저장 직전에 주소가 되므로 사진으로 인정
const isRealProductImage = (src) => (isWebUrl(src, ['https:', 'http:'], true) && !isPlaceholderImage(src)) || /^data:image\/(png|jpe?g|webp|gif|avif);base64,./i.test(String(src || ''));

// 판매처 예약 가능 여부: available 예약 가능 / unavailable 예약 불가 / unknown 확인 못 함
const AVAILABILITY_STATUSES = ['available', 'unavailable', 'unknown'];
// 확인 못 한 이유 — 접근 실패·CAPTCHA·가격 누락·미확인은 '판매 중지'가 아니다
const UNKNOWN_REASONS = ['access_failed', 'captcha', 'price_missing', 'not_checked', 'other'];
// 예약 불가 이유 — 일시 품절 / 판매 중지(끝났는지는 모름) / 판매 종료(근거가 있을 때만)
const UNAVAILABLE_REASONS = ['temporary_soldout', 'sales_stopped', 'sales_ended'];
const STALE_AVAILABILITY_MS = 7 * 24 * 60 * 60 * 1000; // 7일 넘은 확인은 '예전 확인'으로 표시
const cleanTextList = (value, max = 30) =>
  (Array.isArray(value) ? value : []).map((v) => String(v ?? '').trim().slice(0, 100)).filter(Boolean).slice(0, max);

// 판매처 상태 기록 정리. 출처·확인 시각·범위(상품 전체 또는 날짜·인원·옵션)를 함께 남긴다
const normalizeAvailability = (raw, nowMs = Date.now()) => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw productInputError('판매처 예약 상태 형식이 올바르지 않아요');
  const status = String(raw.status || '');
  if (!AVAILABILITY_STATUSES.includes(status)) throw productInputError('판매처 예약 상태는 예약 가능·예약 불가·확인 못 함 중 하나여야 해요');
  const source = String(raw.source || '').trim().slice(0, 300);
  const checkedAtMs = Date.parse(raw.checkedAt);
  const reason = String(raw.reason || '').trim();
  const scopeIn = raw.scope && typeof raw.scope === 'object' ? raw.scope : {};
  const scope = { whole: scopeIn.whole === true, dates: cleanTextList(scopeIn.dates), pax: cleanTextList(scopeIn.pax), options: cleanTextList(scopeIn.options) };
  const hasScope = scope.whole || scope.dates.length || scope.pax.length || scope.options.length;
  const evidence = String(raw.evidence || '').trim().slice(0, 500);
  const out = { status };
  const updatedMs = Date.parse(raw.updatedAt); // 정보 수정 시각 (판매처를 다시 확인한 시각 checkedAt과 따로)
  if (Number.isFinite(updatedMs)) out.updatedAt = new Date(updatedMs).toISOString();
  if (status === 'unknown') {
    // 확인 못 함도 어디서·언제·어떤 날짜·인원·옵션을 확인하려다 못 했는지 남김 (미입력과 확인 실패를 구분)
    if (reason && !UNKNOWN_REASONS.includes(reason)) throw productInputError('확인 못 한 이유가 올바르지 않아요');
    if (reason) out.reason = reason;
    if (source) out.source = source;
    if (Number.isFinite(checkedAtMs)) out.checkedAt = new Date(checkedAtMs).toISOString();
    if (hasScope) out.scope = scope;
    if (evidence) out.evidence = evidence;
    return out;
  }
  if (UNKNOWN_REASONS.includes(reason)) throw productInputError('접근 실패·CAPTCHA·가격 누락은 판매 중지가 아니에요. "확인 못 함"으로 기록해 주세요');
  if (!source) throw productInputError('판매처 상태를 어디서 확인했는지(출처) 적어 주세요');
  if (!Number.isFinite(checkedAtMs) || checkedAtMs > nowMs + 60 * 60 * 1000) throw productInputError('판매처 상태를 확인한 시각이 올바르지 않아요');
  out.source = source;
  out.checkedAt = new Date(checkedAtMs).toISOString();
  if (status === 'unavailable') {
    const why = reason || 'sales_stopped';
    if (!UNAVAILABLE_REASONS.includes(why)) throw productInputError('예약 불가 이유가 올바르지 않아요');
    if (why === 'sales_ended' && !evidence) {
      throw productInputError('판매 종료는 근거(공지·안내 문구 등)가 있을 때만 기록할 수 있어요. 근거가 없으면 "판매 중지"로 기록해 주세요');
    }
    // 특정 날짜·옵션 품절을 상품 전체 판매 중지로 넓히지 않도록, 범위를 꼭 적게 한다
    if (!hasScope) throw productInputError('예약 불가 범위를 적어 주세요 (상품 전체, 또는 날짜·인원·옵션)');
    out.reason = why;
  }
  // 예약 가능도 어떤 범위를 확인했는지 꼭 (상품 전체, 또는 확인한 날짜·인원·옵션) — 특정 날짜 확인을 상품 전체 정보처럼 쓰지 않게
  if (status === 'available' && !hasScope) throw productInputError('예약 가능을 확인한 범위를 적어 주세요 (상품 전체, 또는 확인한 날짜·인원·옵션)');
  out.scope = scope; // 예약 가능이면 '확인한 범위', 예약 불가면 '불가한 범위'
  if (evidence) out.evidence = evidence;
  return out;
};

// 판매처 하나의 상태: available / partial(일부 날짜·인원·옵션만 불가) / stopped(상품 전체 불가 확인) / unknown
const partnerStateOf = (link) => {
  const a = link?.availability;
  if (!a || a.status === 'unknown') return 'unknown';
  if (a.status === 'available') return 'available';
  return a.scope?.whole ? 'stopped' : 'partial';
};
// 상품의 예약 가능 여부: 한 곳이라도 가능(일부 가능 포함) → available / 모든 판매처가 전체 불가로 확인 → none / 그 밖 → unknown
// (한 곳이라도 미확인이면 '모두 판매 중지'라고 단정하지 않음)
const bookableOf = (product) => {
  const links = (product?.partnerLinks || []).filter((l) => l && l.url);
  if (!links.length) return 'unknown';
  const states = links.map(partnerStateOf);
  if (states.some((state) => state === 'available' || state === 'partial')) return 'available';
  if (states.every((state) => state === 'stopped')) return 'none';
  return 'unknown';
};

// 공개 전 필수 확인 (등록·일부 수정·공개만 요청 등 모든 경로에서 같은 규칙): 상품 이름 · 실제 사진 · https 판매처 링크
const publishProblems = (product) => {
  const missing = [];
  if (!String(product?.name || '').trim()) missing.push('상품 이름');
  if (!(product?.images || []).some(isRealProductImage)) missing.push('실제 상품 사진(placeholder 제외)');
  if (!(product?.partnerLinks || []).some((l) => isWebUrl(l?.url, ['https:']))) missing.push('판매 링크(https)');
  return missing;
};

// 요청이 원하는 공개 상태. publishStatus가 우선이고, 예전 어드민·스크립트의 isAvailable(true/false)도 받는다
const requestedPublishStatus = (body, current) => {
  if (body && body.publishStatus !== undefined) {
    if (!SETTABLE_PUBLISH_STATUSES.includes(body.publishStatus)) throw productInputError('공개 상태는 초안·공개·숨김 중 하나여야 해요');
    return body.publishStatus;
  }
  if (body && typeof body.isAvailable === 'boolean') {
    if (body.isAvailable) return 'published';
    if (!current) return 'draft'; // 새 상품을 비활성으로 등록 = 초안
    return current === 'published' ? 'hidden' : current; // 공개 상품을 비활성으로 = 숨김
  }
  return current || 'draft';
};
// 이 요청을 보낸 쪽 (서버가 확인한 자격 기준). 관리자 키·로그인으로 확인된 요청만 'admin'.
// 사무실 키이거나 자격이 확인되지 않은 HTTP 요청은 가장 낮은 권한('office')으로 본다 — 머리글을 빼거나 바꿔도 공개 권한이 생기지 않음.
// 관리자도 x-tourstream-actor: office를 보내면 스스로 사무실 권한으로 낮춤. HTTP 요청이 아닌 서버 내부 호출(시험·스크립트)은 'internal'
const actorOf = (req) => {
  if (typeof req?.get !== 'function') return 'internal';
  if (req.tsActor === 'admin' && String(req.get('x-tourstream-actor') || '').trim().toLowerCase() !== 'office') return 'admin';
  return 'office';
};
// TOURSTREAM OFFICE(AI 사무실)는 초안만: 공개·재공개·숨김 해제는 대표가 어드민에서
const assertActorMayChangeStatus = (actor, from, to) => {
  if (actor !== 'office' || from === to) return;
  if (to !== 'draft' || from === 'hidden' || from === 'published') {
    throw productInputError('AI 사무실은 상품 공개 상태를 바꿀 수 없어요 (초안 등록만 가능). 공개·숨김은 대표가 어드민에서 정해요', 403);
  }
};

// ── 판매처 목록 병합 규칙 (설계서 v2 C-3~C-6) ─────────────────────────────────────────
// 판매처 정체성: (판매처 이름, 외부 번호)가 있으면 그것, 없으면 정확한 주소. 같은 판매처면 요청에 없는 칸은 그대로 두고,
// 다른 판매처(주소가 바뀌었고 외부 번호 없음, 외부 번호가 다름)면 예전 가격·확인 정보·예약 상태를 넘기지 않는다.
// 가격 = {값, 통화, 조건, 확인 시각} 묶음. 묶음이 바뀌면 새 확인이라 네 가지가 다 있어야 하고, 옛 확인 시각으로는 덮어쓰지 못한다.
// 잘못된 값은 400·409로 알리고 조용히 지우지 않는다.
const PRICE_KEYS = ['price', 'priceCurrency', 'priceConditions', 'priceCheckedAt'];
const hasKey = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
const partnerKeyOf = (value) => String(value ?? '').trim().toLowerCase();
const externalIdOf = (link) => (link?.externalId === undefined || link?.externalId === null ? '' : String(link.externalId).trim());
// 같은 상품 페이지인지 (트래킹 꼬리표 같은 쿼리는 빼고 주소·경로만)
const pageOf = (url) => { try { const u = new URL(url); return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '')}`; } catch { return String(url || ''); } };
const linkLabel = (link) => `${String(link?.partner || '').trim() || '판매처'} ${String(link?.url || '').slice(0, 80)}`.trim();
const ISO_CURRENCIES = new Set(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : ['KRW', 'USD', 'JPY', 'EUR', 'CNY', 'TWD', 'THB', 'VND', 'HKD', 'SGD']);
const FUTURE_SLACK_MS = 5 * 60 * 1000;
const MAX_PRICE = 1e10; // 가격 상한 (어느 통화든 상품 가격으로 이보다 크면 입력 오류)

// 요청의 판매처 하나 검사 (빈 줄만 무시, 그 밖의 잘못된 값은 400)
const parseSentLink = (raw, nowMs) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw productInputError('판매처 형식이 올바르지 않아요');
  const label = linkLabel(raw);
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';
  const partner = typeof raw.partner === 'string' ? raw.partner.trim() : '';
  if (!url) {
    const blank = !partner && !PRICE_KEYS.some((key) => hasKey(raw, key) && raw[key] !== null && raw[key] !== '') && !raw.availability;
    if (blank) return null; // 어드민 화면의 빈 줄
    throw productInputError(`판매처 주소가 비어 있어요: ${label}`);
  }
  const out = { partner, url, source: raw.source === 'api' ? 'api' : 'manual' };
  if (hasKey(raw, 'externalId')) out.externalId = externalIdOf(raw); // 빈 글자 = 외부 번호 없음을 명시
  if (hasKey(raw, 'price')) {
    const v = raw.price;
    // 숫자로 바꾼 뒤 유한하고 상식적인 범위인지 확인 (아주 긴 숫자 글자가 무한대가 되어 저장되지 않게)
    const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN;
    if (v === null || v === 0) out.price = null; // 가격 삭제
    else if (Number.isFinite(n) && n > 0 && n <= MAX_PRICE) out.price = n;
    else throw productInputError(`가격이 올바른 숫자가 아니에요 (0보다 크고 ${MAX_PRICE.toLocaleString()} 이하, 삭제는 null 또는 0): ${label}`);
  }
  if (hasKey(raw, 'priceCurrency')) {
    const c = String(raw.priceCurrency ?? '').trim().toUpperCase();
    if (!ISO_CURRENCIES.has(c)) throw productInputError(`통화가 올바르지 않아요 (예: KRW): ${label}`);
    out.priceCurrency = c;
  }
  if (hasKey(raw, 'priceConditions')) {
    if (typeof raw.priceConditions !== 'string' || raw.priceConditions.length > 200) throw productInputError(`가격 조건은 200자 이하 글자예요 (조건 없음은 빈 글자): ${label}`);
    out.priceConditions = raw.priceConditions.trim();
  }
  if (hasKey(raw, 'priceCheckedAt')) {
    const ms = Date.parse(raw.priceCheckedAt);
    if (!Number.isFinite(ms) || ms > nowMs + FUTURE_SLACK_MS) throw productInputError(`가격 확인 시각이 올바르지 않아요: ${label}`);
    out.priceCheckedAt = new Date(ms).toISOString();
  }
  if (hasKey(raw, 'priceDisplay')) {
    if (raw.priceDisplay === null || raw.priceDisplay === '') out.priceDisplay = null;
    else if (typeof raw.priceDisplay !== 'string' || raw.priceDisplay.length > 100) throw productInputError(`가격 표시 문구가 올바르지 않아요: ${label}`);
    else out.priceDisplay = raw.priceDisplay.trim();
  }
  if (hasKey(raw, 'availability')) out.availability = raw.availability === null ? null : normalizeAvailability(raw.availability, nowMs);
  if (hasKey(raw, 'updatedAt') && raw.updatedAt) {
    const ms = Date.parse(raw.updatedAt);
    if (!Number.isFinite(ms)) throw productInputError(`수정 시각이 올바르지 않아요: ${label}`);
    out.updatedAt = new Date(ms).toISOString();
  }
  return out;
};

// 같은 판매처인지: 외부 번호를 보냈으면 (이름, 외부 번호)로, 빈 외부 번호면 '외부 번호 없는 같은 주소'로, 안 보냈으면 정확한 주소로
const sameIdentity = (sent, cur) => {
  if (!cur) return false;
  if (hasKey(sent, 'externalId')) {
    if (!sent.externalId) return !externalIdOf(cur) && cur.url === sent.url;
    return externalIdOf(cur) === sent.externalId && partnerKeyOf(cur.partner) === partnerKeyOf(sent.partner);
  }
  return cur.url === sent.url;
};

const mergeLink = (sent, cur) => {
  const label = linkLabel(sent);
  const out = cur ? { ...cur } : {};
  out.partner = sent.partner;
  out.url = sent.url;
  out.source = sent.source;
  if (hasKey(sent, 'externalId')) { if (sent.externalId) out.externalId = sent.externalId; else delete out.externalId; }
  if (hasKey(sent, 'availability')) { if (sent.availability) out.availability = sent.availability; else delete out.availability; }
  if (hasKey(sent, 'updatedAt')) out.updatedAt = sent.updatedAt;
  const older = (a, b) => a && b && Date.parse(a) < Date.parse(b);
  const sentPrice = PRICE_KEYS.filter((key) => hasKey(sent, key));
  if (hasKey(sent, 'price') && sent.price === null) {
    for (const key of [...PRICE_KEYS, 'priceDisplay']) delete out[key];
  } else if (sentPrice.length) {
    const curHas = Boolean(cur && cur.price > 0);
    const nextPrice = hasKey(sent, 'price') ? sent.price : cur?.price;
    const nextCurrency = hasKey(sent, 'priceCurrency') ? sent.priceCurrency : cur?.priceCurrency;
    const nextConditions = hasKey(sent, 'priceConditions') ? sent.priceConditions : cur?.priceConditions;
    const changed = !curHas || nextPrice !== cur.price || nextCurrency !== cur.priceCurrency || nextConditions !== cur.priceConditions;
    if (changed) {
      const missing = [!(sent.price > 0) && '가격', !hasKey(sent, 'priceCurrency') && '통화', !hasKey(sent, 'priceConditions') && '조건(없으면 빈 글자)', !hasKey(sent, 'priceCheckedAt') && '확인 시각'].filter(Boolean);
      if (missing.length) throw productInputError(`새 가격(값·통화·조건 중 바뀜)에는 ${missing.join('·')}이 필요해요: ${label}`);
      if (curHas && older(sent.priceCheckedAt, cur.priceCheckedAt)) throw productInputError(`저장된 가격보다 옛날에 확인한 가격이에요 (그사이 다른 곳에서 바뀜 — 새로 불러와 주세요): ${label}`, 409);
      Object.assign(out, { price: sent.price, priceCurrency: sent.priceCurrency, priceConditions: sent.priceConditions, priceCheckedAt: sent.priceCheckedAt });
      if (sent.priceDisplay) out.priceDisplay = sent.priceDisplay; else delete out.priceDisplay; // 새 확인이면 옛 표시 문구는 버림
    } else {
      if (hasKey(sent, 'priceCheckedAt')) {
        if (older(sent.priceCheckedAt, cur.priceCheckedAt)) throw productInputError(`저장된 가격보다 옛날에 확인한 가격이에요 (새로 불러와 주세요): ${label}`, 409);
        out.priceCheckedAt = sent.priceCheckedAt;
      }
      if (hasKey(sent, 'priceDisplay')) { if (sent.priceDisplay) out.priceDisplay = sent.priceDisplay; else delete out.priceDisplay; }
    }
  } else if (hasKey(sent, 'priceDisplay')) {
    if (sent.priceDisplay && !(out.price > 0)) throw productInputError(`가격 없이 가격 표시 문구만 있어요: ${label}`);
    if (sent.priceDisplay) out.priceDisplay = sent.priceDisplay; else delete out.priceDisplay;
  }
  return out;
};

// 요청의 판매처 목록(= 원하는 전체 목록)을 저장된 목록과 합침. 목록에 없는 판매처는 지워짐(명시적 교체), partnerLinks를 안 보내면 그대로
const mergePartnerLinks = async (sentRaw, currentLinks = [], nowMs = Date.now()) => {
  if (!Array.isArray(sentRaw)) throw productInputError('판매처 목록(partnerLinks)은 배열이어야 해요');
  const current = Array.isArray(currentLinks) ? currentLinks : [];
  const sent = sentRaw.map((raw) => parseSentLink(raw, nowMs)).filter(Boolean);
  // 트래킹 링크로 바꾸는 판매처(KLOOK·KKday)는 양쪽 다 바꾼 주소로 비교 (변환은 여러 번 해도 같음 — 저장된 예전 주소가 변환 전이어도 맞춰짐)
  const tracked = async (partner, url) => {
    const partnerKey = AUTO_TRACKED_PARTNER_KEYS[partnerKeyOf(partner)];
    if (!partnerKey) return url;
    try {
      return await getPartnerIntegration(partnerKey).createTrackedLink(url);
    } catch (error) {
      console.warn(`[판매처] ${partner} 트래킹 링크 변환 실패, 원본 URL 유지:`, error.message);
      return url;
    }
  };
  for (const link of sent) link.url = await tracked(link.partner, link.url);
  const currentUrls = new Map();
  for (const cur of current) currentUrls.set(cur, await tracked(cur.partner, cur.url));
  const used = new Set();
  const seen = new Set();
  const merged = sent.map((link) => {
    const label = linkLabel(link);
    const key = hasKey(link, 'externalId') && link.externalId ? `x:${partnerKeyOf(link.partner)}:${link.externalId}` : `u:${link.url}`;
    if (seen.has(key)) throw productInputError(`같은 판매처가 두 번 있어요: ${label}`);
    seen.add(key);
    const matches = current.filter((cur) => sameIdentity(link, { ...cur, url: currentUrls.get(cur) }));
    if (matches.length > 1) throw productInputError(`어느 판매처인지 정할 수 없어요 (같은 판매처가 둘): ${label}`);
    const cur = matches[0] || null;
    // 외부 번호로 찾은 판매처와 주소가 같은 다른 판매처가 따로 있으면 모호함
    if (cur && current.some((other) => other !== cur && pageOf(currentUrls.get(other)) === pageOf(link.url))) throw productInputError(`외부 번호와 주소가 서로 다른 판매처를 가리켜요: ${label}`);
    if (cur && used.has(cur)) throw productInputError(`같은 판매처가 두 번 있어요: ${label}`);
    if (cur) used.add(cur);
    return mergeLink(link, cur);
  });
  return merged;
};

// 요청의 상품 칸 검사 (보낸 칸만): 숫자 칸·사진. 잘못되면 400 (조용히 지우지 않음). null은 '지우기'
const PRODUCT_NUMBER_RULES = { price: { min: 0, zeroRemoves: true }, minPrice: { min: 0, zeroRemoves: true }, salePrice: { min: 0, zeroRemoves: true }, rating: { min: 0, max: 5 }, reviewCount: { min: 0, integer: true } };
const VALID_DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/i;
const validateProductBody = (body) => {
  for (const [key, rule] of Object.entries(PRODUCT_NUMBER_RULES)) {
    if (!hasKey(body, key) || body[key] === null) continue;
    const v = body[key];
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    const max = rule.max !== undefined ? rule.max : MAX_PRICE;
    if (!Number.isFinite(n) || n < rule.min || n > max || (rule.integer && !Number.isInteger(n))) {
      throw productInputError(`${key} 값이 올바르지 않아요 (지우려면 null)`);
    }
  }
  if (hasKey(body, 'images')) {
    if (!Array.isArray(body.images)) throw productInputError('사진(images)은 배열이어야 해요');
    for (const img of body.images) {
      const src = String(img ?? '').trim();
      if (!src) continue; // 어드민 화면의 빈 사진 칸
      if (isPlaceholderImage(src)) throw productInputError(`placeholder 사진은 저장할 수 없어요: ${src.slice(0, 80)}`);
      if (src.startsWith('data:') ? !VALID_DATA_IMAGE.test(src) : !isWebUrl(src, ['https:', 'http:'], true)) throw productInputError(`사진 주소·형식이 올바르지 않아요: ${src.slice(0, 80)}`);
    }
  }
};
// 사진 파일 저장은 모든 검사가 끝난 뒤에만 (검사 실패면 아무것도 쓰지 않게)
const externalizeImages = (product) => ({ ...product, images: (product.images || []).map(externalizeImage).filter(Boolean) });

const NUMERIC_PRODUCT_FIELDS = { price: { min: 0, positive: true }, minPrice: { min: 0, positive: true }, salePrice: { min: 0, positive: true }, rating: { min: 0, max: 5 }, reviewCount: { min: 0 } };
// 최종 저장될 상품 전체에 같은 정리·검사를 한다 (일부 칸만 고쳐도, 공개 상태만 바꿔도 같은 규칙)
const finalizeProduct = (product, { status, checkPublish }) => {
  const next = { ...product };
  const warnings = [];
  const images = toTrimmedStringArray(next.images);
  next.images = images.filter((img) => !isPlaceholderImage(img));
  if (next.images.length !== images.length) warnings.push(`저장돼 있던 placeholder 사진 ${images.length - next.images.length}장을 정리했어요`);
  for (const [key, range] of Object.entries(NUMERIC_PRODUCT_FIELDS)) {
    if (next[key] === undefined) continue;
    const value = toNumberOrUndefined(next[key], range);
    if (value === undefined || (range.positive && !(value > 0))) {
      if (value === undefined) warnings.push(`저장돼 있던 ${key} 값이 숫자가 아니어서 정리했어요`);
      delete next[key]; // 0원은 가격이 아님 (판매처에서 확인)
    } else next[key] = value;
  }
  next.publishStatus = status;
  next.isAvailable = status === 'published'; // 예전 화면·스크립트 호환: 공개일 때만 true
  return { product: next, problems: checkPublish ? publishProblems(next) : [], warnings };
};

// 손님(공개 API)에게 보내는 상품: 필요한 칸만. 내부 메모·요청 번호·승인 이력·출처 같은 칸은 빼고,
// 판매 중지가 확인된 판매처는 예약 주소를 보내지 않는다. 예전 확인은 확인 날짜와 '예전 확인' 표시를 붙인다
const PUBLIC_PRODUCT_FIELDS = ['id', 'name', 'description', 'categories', 'locations', 'tags', 'price', 'minPrice', 'salePrice', 'rating', 'reviewCount', 'isRecommended', 'views', 'seo'];
const toPublicProduct = (product, viewMeta = {}, nowMs = Date.now()) => {
  const out = {};
  for (const key of PUBLIC_PRODUCT_FIELDS) if (product[key] !== undefined) out[key] = product[key];
  if (product.seo && typeof product.seo === 'object') { // 검색용 칸도 정해진 것만
    out.seo = {};
    for (const key of ['title', 'description', 'keywords']) if (typeof product.seo[key] === 'string') out.seo[key] = product.seo[key];
  }
  out.images = (product.images || []).filter((img) => typeof img === 'string' && img.trim() && !isPlaceholderImage(img));
  out.partnerLinks = (product.partnerLinks || [])
    .filter((link) => link && link.url)
    .map((link) => {
      const state = partnerStateOf(link);
      const a = link.availability || {};
      const checkedMs = Date.parse(a.checkedAt);
      const availability = { state };
      if (Number.isFinite(checkedMs)) Object.assign(availability, { checkedAt: new Date(checkedMs).toISOString(), stale: nowMs - checkedMs > STALE_AVAILABILITY_MS });
      if (state === 'partial') Object.assign(availability, { dates: a.scope?.dates || [], pax: a.scope?.pax || [], options: a.scope?.options || [] });
      const publicLink = { partner: link.partner, availability };
      if (link.price > 0) {
        publicLink.price = link.price;
        if (link.priceCurrency) publicLink.priceCurrency = link.priceCurrency;
        if (link.priceConditions) publicLink.priceConditions = link.priceConditions;
        if (link.priceCheckedAt) publicLink.priceCheckedAt = link.priceCheckedAt;
        if (link.priceDisplay) publicLink.priceDisplay = link.priceDisplay;
      }
      if (link.updatedAt) publicLink.updatedAt = link.updatedAt;
      if (state !== 'stopped') publicLink.url = link.url;
      return publicLink;
    });
  out.bookable = bookableOf(product);
  out.isAvailable = true; // 공개 상품만 내보냄 (예전 메인 화면의 isAvailable 필터 호환)
  return { ...out, ...viewMeta };
};
// 관리자에게는 전체 + 계산한 공개 상태·예약 가능 여부
const toAdminProduct = (product, viewMeta = {}) => ({ ...product, ...viewMeta, publishStatus: publishStatusOf(product), bookable: bookableOf(product) });

// 카테고리/지역 데이터를 항상 object 형태로 정규화
const normalizeCategoryItem = (item, index, prefix = 'cat') => {
  if (typeof item === 'string') {
    const name = item.trim();
    if (!name) return null;
    return {
      id: `${prefix}_legacy_${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_가-힣]/g, '')}_${index}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  if (item && typeof item === 'object') {
    const name = String(item.name || '').trim();
    if (!name) return null;
    return {
      ...item,
      id: String(item.id || `${prefix}_legacy_${name.toLowerCase().replace(/\s+/g, '_')}_${index}`),
      name,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    };
  }
  return null;
};

const normalizeLocationItem = (item, index, prefix = 'loc') => {
  if (typeof item === 'string') {
    const name = item.trim();
    if (!name) return null;
    return {
      id: `${prefix}_legacy_${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_가-힣]/g, '')}_${index}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  if (item && typeof item === 'object') {
    const name = String(item.name || '').trim();
    if (!name) return null;
    return {
      ...item,
      id: String(item.id || `${prefix}_legacy_${name.toLowerCase().replace(/\s+/g, '_')}_${index}`),
      name,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    };
  }
  return null;
};

const normalizeCategoriesPayload = (payload = {}) => {
  const mainCategories = Array.isArray(payload.mainCategories)
    ? payload.mainCategories.map((item, i) => normalizeCategoryItem(item, i, 'main_cat')).filter(Boolean)
    : [];
  const mainIds = new Set(mainCategories.map((c) => c.id));
  const subCategories = Array.isArray(payload.subCategories)
    ? payload.subCategories
        .map((item, i) => {
          const norm = normalizeCategoryItem(item, i, 'sub_cat');
          if (!norm) return null;
          const mainCategoryId = String(item?.mainCategoryId || '');
          if (!mainCategoryId || !mainIds.has(mainCategoryId)) return null;
          return { ...norm, mainCategoryId };
        })
        .filter(Boolean)
    : [];
  return { mainCategories, subCategories };
};

const normalizeLocationsPayload = (payload = {}) => {
  const rawCountries = Array.isArray(payload.countries) ? payload.countries : [];
  // 오사카 같은 지역명이 국가로 잘못 분류되지 않도록 COUNTRY_NAME_SET 우선 필터
  const countries = rawCountries
    .map((item, i) => normalizeLocationItem(item, i, 'country'))
    .filter(Boolean);

  const countryIds = new Set(countries.map((c) => c.id));
  const regions = Array.isArray(payload.regions)
    ? payload.regions
        .map((item, i) => {
          const norm = normalizeLocationItem(item, i, 'region');
          if (!norm) return null;
          const countryId = String(item?.countryId || '');
          if (!countryId || !countryIds.has(countryId)) return null;
          return { ...norm, countryId };
        })
        .filter(Boolean)
    : [];
  return { countries, regions };
};

const deriveCategoriesFromProducts = (products = []) => {
  const mainMap = new Map();
  products.forEach((product) => {
    const categories = toTrimmedStringArray(product.categories);
    categories.forEach((name) => {
      const key = name.toLowerCase();
      if (!mainMap.has(key)) {
        mainMap.set(key, {
          id: `main_cat_${Date.now()}_${mainMap.size}`,
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  });
  return { mainCategories: Array.from(mainMap.values()), subCategories: [] };
};

const deriveLocationsFromProducts = (products = []) => {
  const countries = [];
  const regions = [];
  const countryByName = new Map();
  const regionKeySet = new Set();

  products.forEach((product) => {
    const locations = toTrimmedStringArray(product.locations);
    if (locations.length === 0) return;
    const detectedCountry = locations.find((item) => COUNTRY_NAME_SET.has(item));
    const countryName = detectedCountry || locations[0];

    if (!countryByName.has(countryName.toLowerCase())) {
      const country = {
        id: `country_${Date.now()}_${countryByName.size}`,
        name: countryName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      countryByName.set(countryName.toLowerCase(), country);
      countries.push(country);
    }

    const country = countryByName.get(countryName.toLowerCase());
    locations
      .filter((name) => name !== countryName && !COUNTRY_NAME_SET.has(name))
      .forEach((regionName) => {
      const key = `${country.id}::${regionName.toLowerCase()}`;
      if (regionKeySet.has(key)) return;
      regionKeySet.add(key);
      regions.push({
        id: `region_${Date.now()}_${regions.length}`,
        name: regionName,
        countryId: country.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      });
  });

  return { countries, regions };
};

// 상품 파일을 쓸 수 있는 요청(등록·수정·삭제·판매처 상태·상세 조회수)은 모두 상품 파일 잠금을 거친다. 목록 조회만 잠금 없이 읽음
app.use('/api/products', (req, res, next) => {
  // 저장 처리가 '공개 여부 바뀜'을 표시하면(res.visibilityChanged) 응답이 끝난 뒤 메인 사이트 다시 빌드를 요청
  res.once('finish', () => { if (res.visibilityChanged && res.statusCode < 400) requestPublicRebuild(res.visibilityChanged); });
  return req.method === 'GET' && (req.path === '/' || req.path === '') ? next() : lockProducts(req, res, next);
});

// 상품 목록 조회 — 손님: 공개 상품만, 필요한 칸만 / 관리자(로그인 쿠키·관리자 키): 초안·숨김·분류 필요까지 전체
// 판매처가 모두 중지된 공개 상품(bookable: 'none')도 상세 안내 페이지를 위해 목록에는 남기고, 메인 화면이 일반 목록에서 뺀다
app.get('/api/products', (req, res) => {
  // 상품 API 기능 버전: 3 = 공개 상태(초안·공개·숨김) + 판매처 예약 가능 여부 + 등록 요청 번호(clientRequestId) 중복 방지
  res.set('X-Tourstream-Products-Api', '3');
  res.vary('Cookie');
  res.vary(ADMIN_KEY_HEADER);
  let all;
  try {
    all = readProducts();
  } catch (error) {
    return sendProductError(res, error);
  }
  const admin = isAdminRequest(req);
  // 관리자 응답(초안 포함)은 어디에도 저장(캐시)되지 않게, 공개 응답은 매번 새로 확인하게 → 숨김이 바로 반영
  res.set('Cache-Control', admin ? 'private, no-store' : 'no-cache');
  const nowMs = Date.now();
  const viewEvents = trimExpiredViewEvents(readViewEvents(), nowMs);
  writeViewEvents(viewEvents);
  const out = admin
    ? all.map((product) => toAdminProduct(product, getRecentViewMeta(viewEvents, product.id, nowMs)))
    : all.filter(isPublicProduct).map((product) => toPublicProduct(product, getRecentViewMeta(viewEvents, product.id, nowMs), nowMs));
  console.log(`[API] GET /api/products 요청 - ${out.length}개 상품 반환${admin ? ' (관리자)' : ''}`);
  res.json(out);
});

// 상품 상세 조회 — 손님에게는 공개 상품만 (초안·숨김은 예전에 공개됐어도 404). 조회수 증가는 상품 파일 잠금 안에서
app.get('/api/products/:id', (req, res) => {
  try {
    res.vary('Cookie');
    res.vary(ADMIN_KEY_HEADER);
    const admin = isAdminRequest(req);
    res.set('Cache-Control', admin ? 'private, no-store' : 'no-cache');
    const products = readProducts();
    const nowMs = Date.now();
    const viewEvents = trimExpiredViewEvents(readViewEvents(), nowMs);
    writeViewEvents(viewEvents);
    const index = findProductIndex(products, req.params.id);
    if (index === -1 || (!admin && !isPublicProduct(products[index]))) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
    }
    if (!admin && !isBotUserAgent(req.get('user-agent') || '') && req.query.check !== '1' && !readOnlyReason()) {
      // 상세 조회 시 조회수 증가 (어드민이 보는 건, 화면의 '아직 공개인지' 확인(check=1)은 세지 않음)
      products[index] = { ...products[index], views: (Number(products[index].views) || 0) + 1 };
      writeProducts(products);
      const productId = products[index].id;
      viewEvents[productId] = [...(Array.isArray(viewEvents[productId]) ? viewEvents[productId] : []), nowMs];
      writeViewEvents(viewEvents);
      warnIfViewSpike(productId, viewEvents, nowMs);
    }
    const product = products[index];
    const meta = getRecentViewMeta(viewEvents, product.id, nowMs);
    res.json(admin ? toAdminProduct(product, meta) : toPublicProduct(product, meta, nowMs));
  } catch (error) {
    sendProductError(res, error);
  }
});

// 상품 조회수 증가 — 공개 상품만
app.post('/api/products/:id/view', (req, res) => {
  try {
    const products = readProducts();
    const index = findProductIndex(products, req.params.id);
    if (index === -1 || !isPublicProduct(products[index])) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
    }
    if (isBotUserAgent(req.get('user-agent') || '')) {
      return res.json({ id: products[index].id, views: Number(products[index].views) || 0, counted: false, reason: 'bot' });
    }
    const nowMs = Date.now();
    const viewEvents = trimExpiredViewEvents(readViewEvents(), nowMs);
    products[index] = { ...products[index], views: (Number(products[index].views) || 0) + 1 };
    writeProducts(products);
    const productId = products[index].id;
    viewEvents[productId] = [...(Array.isArray(viewEvents[productId]) ? viewEvents[productId] : []), nowMs];
    writeViewEvents(viewEvents);
    warnIfViewSpike(productId, viewEvents, nowMs);
    res.json({ id: productId, views: products[index].views, counted: true, ...getRecentViewMeta(viewEvents, productId, nowMs) });
  } catch (error) {
    sendProductError(res, error);
  }
});

// 관리자에 따라 내용이 달라지는 응답은 공용 캐시에 저장되지 않게
const varyByAuth = (req, res) => {
  res.vary('Cookie');
  res.vary(ADMIN_KEY_HEADER);
  res.set('Cache-Control', isAdminRequest(req) ? 'private, no-store' : 'no-cache');
};

app.get('/api/metrics/views', (req, res) => {
  try {
    varyByAuth(req, res);
    const nowMs = Date.now();
    const products = visibleTo(req, readProducts());
    const viewEvents = trimExpiredViewEvents(readViewEvents(), nowMs);
    writeViewEvents(viewEvents);
    return res.json(buildViewMetrics(products, viewEvents, nowMs));
  } catch (error) {
    return sendProductError(res, error);
  }
});

// 상품 등록
app.post('/api/products', requireAdminKey, async (req, res) => {
  try {
    const body = req.body || {};
    const clientRequestId = typeof body.clientRequestId === 'string' ? body.clientRequestId.trim().slice(0, 80) : '';
    const status = requestedPublishStatus(body, null); // 기본은 초안
    assertActorMayChangeStatus(actorOf(req), 'draft', status);
    validateProductBody(body);
    const normalizedPayload = await normalizeProductPayload(body);
    const partnerLinks = await mergePartnerLinks(Array.isArray(body.partnerLinks) ? body.partnerLinks : [], []);

    // 기다리는 작업(정리)이 끝난 뒤에 읽고, 기다림 없이 바로 저장한다 (상품 파일 잠금 안 → 동시 등록이 서로 덮어쓰지 않음)
    const products = readProducts();
    // 같은 요청 번호로 다시 오면 새로 만들지 않고 처음 만든 상품을 돌려줌 (응답이 끊겨 다시 보내도 두 번 생기지 않게)
    if (clientRequestId) {
      const existing = products.find((p) => p.clientRequestId === clientRequestId);
      if (existing) return res.status(200).json(existing);
    }
    // 다음 상품 번호 (번호 파일이 뒤처져 있어도 이미 있는 번호를 다시 쓰지 않게)
    const counter = Math.max(readCounter(), maxProductNumber(products)) + 1;
    const { clientRequestId: _rid, publishStatus: _ps, isAvailable: _ia, ...payloadRest } = normalizedPayload;
    const { product, problems } = finalizeProduct(
      { ...payloadRest, partnerLinks, id: counter.toString(), views: 0, rev: 1, ...(clientRequestId ? { clientRequestId } : {}) },
      { status, checkPublish: status === 'published' },
    );
    if (problems.length) return res.status(400).json({ error: `공개 전에 채워 주세요: ${problems.join(', ')}`, missing: problems });

    writeCounter(counter); // 번호를 먼저 저장 (상품 저장 전에 꺼져도 같은 번호를 다시 쓰지 않게)
    const saved = externalizeImages(product); // 사진 파일은 검사가 다 끝난 뒤에만 저장
    products.push(saved);
    writeProducts(products);
    console.log(`[API] POST /api/products - 상품 등록 성공: ${saved.id} ${saved.name} (${status})`);
    res.status(201).json(saved);
  } catch (error) {
    sendProductError(res, error);
  }
});

// 상품 수정 — 이 요청이 보낸 칸만 최신 상품에 반영하고, 최종 저장될 상품 전체에 같은 정리·공개 검사를 한다
app.put('/api/products/:id', requireAdminKey, async (req, res) => {
  try {
    const body = req.body || {};
    validateProductBody(body); // 보낸 칸만 검사 (저장된 예전 값 때문에 관계없는 수정이 막히지 않게)
    const products = readProducts();
    const index = findProductIndex(products, req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
    }

    const normalizedPayload = await normalizeProductPayload({
      ...products[index],
      ...body,
    });

    // 기다린 뒤 최신 목록을 다시 읽고, 이 요청이 보낸 칸만 최신 상품에 반영한다
    // (다른 칸·늘어난 조회수는 저장된 최신 값. 같은 칸을 동시에 고치면 나중 요청이 남음)
    const latest = readProducts();
    const latestIndex = findProductIndex(latest, req.params.id);
    if (latestIndex === -1) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
    }
    const current = latest[latestIndex];
    // 어드민은 불러온 저장 번호(baseRev)를 보냄 — 그사이 다른 저장이 있었으면 옛 화면으로 덮어쓰지 않게 409
    if (hasKey(body, 'baseRev') && Number(body.baseRev) !== (Number(current.rev) || 0)) {
      return res.status(409).json({ error: '그사이 다른 곳에서 이 상품이 바뀌었어요. 새로 불러온 뒤 다시 저장해 주세요', rev: Number(current.rev) || 0 });
    }
    const from = publishStatusOf(current);
    const to = requestedPublishStatus(body, from);
    assertActorMayChangeStatus(actorOf(req), from, to);
    const next = { ...current };
    for (const key of Object.keys(body)) {
      // 서버만 정하는 칸은 요청으로 바꾸거나 지우지 못함. 판매처 목록은 아래에서 저장된 목록과 합침
      if (['id', 'views', 'clientRequestId', 'publishStatus', 'isAvailable', 'visibilitySync', 'publishMigration', 'rev', 'baseRev', 'warnings', 'partnerLinks'].includes(key)) continue;
      if (key in normalizedPayload && normalizedPayload[key] !== null) next[key] = normalizedPayload[key];
      else delete next[key]; // null = 지우기 (잘못된 값은 위 검사에서 400)
    }
    if (hasKey(body, 'partnerLinks')) next.partnerLinks = await mergePartnerLinks(body.partnerLinks, current.partnerLinks);
    next.rev = (Number(current.rev) || 0) + 1;

    // 공개로 바꾸는 경우, 공개를 다시 요청한 경우(이미 공개여도), 공개 상품의 이름·사진·판매처를 고치는 경우 공개 필수 항목 검사
    const touched = ['name', 'images', 'partnerLinks'].some((key) => key in body);
    const askedPublish = body.publishStatus === 'published' || body.isAvailable === true;
    const { product, problems, warnings } = finalizeProduct(next, { status: to, checkPublish: to === 'published' && (from !== 'published' || touched || askedPublish) });
    if (problems.length) {
      return res.status(400).json({ error: `공개 전에 채워 주세요: ${problems.join(', ')}`, missing: problems });
    }

    latest[latestIndex] = { ...externalizeImages(product), id: req.params.id }; // ID는 변경 불가, 사진 파일은 검사 뒤에만 저장
    const visibilityChanged = (from === 'published') !== (to === 'published');
    // 공개 여부가 바뀜: API는 바로 반영, 정적 페이지·사이트맵·CDN은 메인 사이트 다시 빌드가 끝나야 반영 → 그때까지 '반영 중' (상품과 한 번에 저장)
    if (visibilityChanged) latest[latestIndex].visibilitySync = { state: 'pending', since: new Date().toISOString(), from, to };
    writeProducts(latest);
    if (visibilityChanged) res.visibilityChanged = `상품 ${req.params.id} ${from}→${to}`; // 응답 뒤 메인 사이트 다시 빌드 요청
    res.json(warnings.length ? { ...latest[latestIndex], warnings } : latest[latestIndex]); // 저장된 예전 데이터를 정리했으면 알림
  } catch (error) {
    sendProductError(res, error);
  }
});

// 상품 삭제 (기존 삭제 정책 그대로: 관리자만, 영구 삭제)
app.delete('/api/products/:id', requireAdminKey, (req, res) => {
  try {
    const products = readProducts();
    const index = findProductIndex(products, req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
    }
    const deletedProduct = products[index];
    products.splice(index, 1);
    writeProducts(products);
    if (isPublicProduct(deletedProduct)) res.visibilityChanged = `상품 ${req.params.id} 삭제`;
    res.json({ message: '상품이 삭제되었습니다', product: deletedProduct });
  } catch (error) {
    sendProductError(res, error);
  }
});

// 판매처 예약 상태만 갱신 — 공개 상태는 절대 바꾸지 않는다
// (대표가 숨긴 상품은 판매처가 다시 팔아도 자동 공개되지 않고, 판매 중지가 확인돼도 공개 상태는 그대로)
// body: { updates: [{ url | externalId | index, availability: { status, reason, scope, source, checkedAt, evidence } | null }] }
app.put('/api/products/:id/partner-availability', requireAdminKey, (req, res) => {
  try {
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
    if (!updates.length) throw productInputError('바꿀 판매처 상태(updates)가 없어요');
    const products = readProducts();
    const index = findProductIndex(products, req.params.id);
    if (index === -1) return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
    const links = (products[index].partnerLinks || []).map((link) => ({ ...link }));
    for (const update of updates) {
      const at = links.findIndex((link, i) => (update.url && link.url === update.url) || (update.externalId && link.externalId === update.externalId) || (Number.isInteger(update.index) && i === update.index));
      if (at === -1) throw productInputError(`판매처를 찾지 못했어요: ${update.url || update.externalId || update.index}`);
      const availability = normalizeAvailability(update.availability);
      if (availability) links[at].availability = availability;
      else delete links[at].availability;
    }
    products[index] = { ...products[index], partnerLinks: links, rev: (Number(products[index].rev) || 0) + 1 };
    writeProducts(products);
    res.json(toAdminProduct(products[index]));
  } catch (error) {
    sendProductError(res, error);
  }
});

// 판매처 가격만 갱신 (가격 갱신 스크립트용 — 파일을 직접 쓰지 않고 이 서버를 거침). 공개 상태·판매처 예약 상태는 바꾸지 않음
// body: { updates: [{ url | externalId | index, price, priceCurrency, priceConditions, priceCheckedAt, priceDisplay? }] }
// 일반 수정과 같은 가격 묶음 규칙(mergePartnerLinks): 새 가격이면 값·통화·조건·확인 시각 모두, 옛 확인 시각이면 409, price가 null·0이면 가격 삭제
app.put('/api/products/:id/partner-prices', requireAdminKey, async (req, res) => {
  try {
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
    if (!updates.length) throw productInputError('바꿀 판매처 가격(updates)이 없어요');
    const products = readProducts();
    const index = findProductIndex(products, req.params.id);
    if (index === -1) return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
    const links = products[index].partnerLinks || [];
    // 다른 판매처는 '그대로'(정체성만), 바꿀 판매처에는 가격 칸만 실어서 일반 수정과 같은 규칙으로 합침
    const sent = links.map((link) => ({ partner: link.partner, url: link.url, source: link.source, ...(externalIdOf(link) ? { externalId: externalIdOf(link) } : {}) }));
    for (const update of updates) {
      const at = links.findIndex((link, i) => (update.url && link.url === update.url) || (update.externalId !== undefined && externalIdOf(link) && externalIdOf(link) === String(update.externalId).trim()) || (Number.isInteger(update.index) && i === update.index));
      if (at === -1) throw productInputError(`판매처를 찾지 못했어요: ${update.url || update.externalId || update.index}`);
      for (const key of [...PRICE_KEYS, 'priceDisplay']) if (hasKey(update, key)) sent[at][key] = update[key];
      if (hasKey(update, 'price') && (update.price === 0 || update.price === null)) sent[at].price = null;
    }
    const merged = await mergePartnerLinks(sent, links);
    products[index] = { ...products[index], partnerLinks: merged, rev: (Number(products[index].rev) || 0) + 1 };
    writeProducts(products);
    res.json(toAdminProduct(products[index]));
  } catch (error) {
    sendProductError(res, error);
  }
});

// 메인 사이트 다시 빌드·CDN 무효화가 끝났다는 알림 (배포 프로그램이 보냄, 전용 키 VISIBILITY_SYNC_KEY).
// fetchedAt = 그 빌드가 상품 목록을 읽은 시각. 그 전에 바뀐 공개 여부는 이제 정적 페이지·사이트맵·CDN에도 반영됨 → '반영 완료'
const VISIBILITY_SYNC_KEY = process.env.VISIBILITY_SYNC_KEY || '';
app.post('/api/admin/visibility-synced', lockProducts, (req, res) => {
  try {
    if (!VISIBILITY_SYNC_KEY || !sameSecret(req.get('x-visibility-sync-key'), VISIBILITY_SYNC_KEY)) return res.status(401).json({ error: '인증이 필요합니다' });
    const fetchedMs = Date.parse(req.body?.fetchedAt);
    const runId = String(req.body?.runId || '').trim();
    if (!Number.isFinite(fetchedMs)) throw productInputError('fetchedAt이 필요해요');
    if (fetchedMs > Date.now() + 120000) throw productInputError('fetchedAt이 미래예요 (빌드가 상품을 읽은 시각만 받아요)');
    if (!/^\d{1,20}$/.test(runId)) throw productInputError('runId(배포 실행 번호)가 필요해요');
    const products = readProducts();
    const doneAt = new Date().toISOString();
    let count = 0;
    for (const product of products) {
      const sync = product.visibilitySync;
      if (sync?.state === 'pending' && Date.parse(sync.since) <= fetchedMs) {
        product.visibilitySync = { ...sync, state: 'done', doneAt, build: runId };
        count += 1;
      }
    }
    if (count) writeProducts(products);
    res.json({ updated: count });
  } catch (error) {
    sendProductError(res, error);
  }
});

// 공개 상태 이전 (미리보기 / 적용). 파일을 직접 쓰는 스크립트 대신 이 서버가 한 줄로 처리 (서버만 상품 파일을 씀)
// 적용 전 백업 파일을 만들고, 이미 이전된 상품은 건드리지 않음 (반복 실행 안전)
app.post('/api/admin/publish-status-migration', requireAdminKey, lockProducts, (req, res) => {
  try {
    const products = readProducts();
    const { products: next, changes } = migratePublishStatus(products, normalizeEvidence(req.body?.evidence));
    const result = { changes, table: changeTable(changes), applied: false };
    if (req.body?.apply === true && changes.length) {
      const backup = path.join(DATA_DIR, `products.before-publish-status-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.copyFileSync(PRODUCTS_FILE, backup);
      const changedIds = new Set(changes.map((c) => String(c.id)));
      writeProducts(next.map((p) => (changedIds.has(String(p.id)) ? { ...p, rev: (Number(p.rev) || 0) + 1 } : p))); // 바뀐 상품은 저장 번호 올림 (열어 둔 어드민이 덮어쓰지 않게)
      Object.assign(result, { applied: true, backup: path.basename(backup) });
    }
    res.json(result);
  } catch (error) {
    sendProductError(res, error);
  }
});

// 백업으로 되돌리기 (데이터 폴더 안의 products.before-*.json만). 되돌리기 직전 파일도 따로 보관
app.post('/api/admin/products-restore', requireAdminKey, lockProducts, (req, res) => {
  try {
    const name = String(req.body?.backup || '');
    if (!/^products\.before-[\w.-]+\.json$/.test(name)) throw productInputError('되돌릴 백업 파일 이름이 올바르지 않아요');
    const backupPath = path.join(DATA_DIR, name);
    if (!fs.existsSync(backupPath)) throw productInputError('백업 파일이 없어요');
    const backup = readJsonArray(backupPath); // 깨진 백업이면 여기서 오류
    const safety = path.join(DATA_DIR, `products.before-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.copyFileSync(PRODUCTS_FILE, safety);
    writeProducts(backup);
    requestPublicRebuild('백업으로 되돌림'); // 공개·숨김이 바뀌었을 수 있음 → 정적 페이지·사이트맵도 다시 빌드
    res.json({ restored: backup.length, safety: path.basename(safety) });
  } catch (error) {
    sendProductError(res, error);
  }
});

// 어드민 - 파트너 API 상품 검색 (등록 폼에서 API 연동 링크를 고를 때 사용)
// 어드민 로그인 - 키가 맞으면 HttpOnly 쿠키로 세션을 내려준다.
// 이후 어드민 화면은 키를 보관하지 않고 쿠키로만 인증하므로 JS가 키를 읽을 수 없다.
app.post('/api/admin/login', requireAdminKey, (req, res) => {
  res.cookie(SESSION_COOKIE, issueSessionToken(), { ...sessionCookieOptions, maxAge: SESSION_TTL_MS });
  res.json({ ok: true, expiresIn: SESSION_TTL_MS });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  res.json({ ok: true });
});

// 현재 세션이 살아있는지 확인 (새로고침 시 로그인 상태 복원용)
app.get('/api/admin/session', (req, res) => {
  res.json({ authenticated: isValidSessionToken(readCookie(req, SESSION_COOKIE)), readOnly: readOnlyReason() }); // readOnly: 복구 중이면 이유
});

// 예전 어드민 빌드가 호출하던 경로. 키 확인만 하고 쿠키는 주지 않는다.
app.post('/api/admin/verify-key', requireAdminKey, (req, res) => {
  res.json({ ok: true });
});

app.get('/api/admin/partner-search', requireAdminKey, async (req, res) => {
  const { partner, keyword } = req.query;
  if (!partner || typeof partner !== 'string') {
    return res.status(400).json({ error: 'partner 쿼리 파라미터가 필요합니다' });
  }
  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
    return res.status(400).json({ error: 'keyword 쿼리 파라미터가 필요합니다' });
  }
  try {
    const integration = getPartnerIntegration(partner);
    const results = await integration.search(keyword.trim());
    res.json({ results });
  } catch (error) {
    console.error('[API] partner-search 오류:', error.message);
    res.status(502).json({ error: error.message });
  }
});

// 어드민 - 파트너 상품 상세 원본 응답 조회.
// 가격/평점 필드명이 파트너 문서에 없어서, 갱신 배치가 어떤 값을 보고 있는지 확인할 때 쓴다.
app.get('/api/admin/partner-detail', requireAdminKey, async (req, res) => {
  const { partner, externalId } = req.query;
  if (!partner || typeof partner !== 'string') {
    return res.status(400).json({ error: 'partner 쿼리 파라미터가 필요합니다' });
  }
  if (!externalId || typeof externalId !== 'string') {
    return res.status(400).json({ error: 'externalId 쿼리 파라미터가 필요합니다' });
  }
  try {
    const integration = getPartnerIntegration(partner);
    if (!integration.fetchRawDetail) {
      return res.status(400).json({ error: `${partner}는 상세 조회를 지원하지 않습니다` });
    }
    res.json({ detail: await integration.fetchRawDetail(externalId) });
  } catch (error) {
    console.error('[API] partner-detail 오류:', error.message);
    res.status(502).json({ error: error.message });
  }
});

// 어드민 - 파트너 상품의 예약 옵션 원본 조회.
// 대표가 선정이 어떤 옵션을 보고 있는지(=왜 그 가격이 나왔는지) 확인할 때 쓴다.
app.get('/api/admin/partner-options', requireAdminKey, async (req, res) => {
  const { partner, externalId } = req.query;
  if (!partner || typeof partner !== 'string') {
    return res.status(400).json({ error: 'partner 쿼리 파라미터가 필요합니다' });
  }
  if (!externalId || typeof externalId !== 'string') {
    return res.status(400).json({ error: 'externalId 쿼리 파라미터가 필요합니다' });
  }
  try {
    const integration = getPartnerIntegration(partner);
    if (!integration.fetchPriceOptions) {
      return res.status(400).json({ error: `${partner}는 옵션 조회를 지원하지 않습니다` });
    }
    res.json({ options: await integration.fetchPriceOptions(externalId) });
  } catch (error) {
    console.error('[API] partner-options 오류:', error.message);
    res.status(502).json({ error: error.message });
  }
});

// 어드민 - 선택한 파트너 상품 URL을 어필리에이트 추적 링크로 변환
app.post('/api/admin/partner-link', requireAdminKey, async (req, res) => {
  const { partner, url } = req.body || {};
  if (!partner || typeof partner !== 'string') {
    return res.status(400).json({ error: 'partner가 필요합니다' });
  }
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url이 필요합니다' });
  }
  try {
    const integration = getPartnerIntegration(partner);
    if (typeof integration.createTrackedLink !== 'function') {
      return res.json({ url });
    }
    const trackedUrl = await integration.createTrackedLink(url);
    res.json({ url: trackedUrl });
  } catch (error) {
    console.error('[API] partner-link 오류:', error.message);
    res.status(502).json({ error: error.message });
  }
});

// 항공권 검색 - 공항 자동완성 (메인 사이트 항공권 탭에서 공개 호출)
app.get('/api/flights/airports', async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
    return res.status(400).json({ error: 'keyword 쿼리 파라미터가 필요합니다' });
  }
  try {
    const integration = getPartnerIntegration('myrealtrip');
    const airports = await integration.searchFlightAirports(keyword.trim());
    res.json({ airports });
  } catch (error) {
    console.error('[API] flights/airports 오류:', error.message);
    res.status(502).json({ error: error.message });
  }
});

// 항공권 검색 - 조건에 맞는 마이리얼트립 항공권 검색결과 링크 생성
app.post('/api/flights/search-link', async (req, res) => {
  const { depAirportCd, arrAirportCd, tripTypeCd, depDate, arrDate, adult, child, infant, cabinClass } = req.body || {};
  if (!depAirportCd || !arrAirportCd) {
    return res.status(400).json({ error: 'depAirportCd, arrAirportCd가 필요합니다' });
  }
  if (!['OW', 'RT', 'MT'].includes(tripTypeCd)) {
    return res.status(400).json({ error: 'tripTypeCd는 OW, RT, MT 중 하나여야 합니다' });
  }
  try {
    const integration = getPartnerIntegration('myrealtrip');
    const url = await integration.createFlightSearchLink({
      depAirportCd,
      arrAirportCd,
      tripTypeCd,
      depDate,
      arrDate,
      adult,
      child,
      infant,
      cabinClass,
    });
    res.json({ url });
  } catch (error) {
    console.error('[API] flights/search-link 오류:', error.message);
    res.status(502).json({ error: error.message });
  }
});

// 카운터 조회
app.get('/api/counter', (req, res) => {
  const counter = readCounter();
  res.json({ counter });
});

// Sitemap은 메인 사이트 빌드(generate-seo-route-shells.mjs)가 생성한다.
// 이 서버가 만들던 버전은 슬러그 규칙과 noindex 규칙을 모르기 때문에,
// 옛 주소와 색인 제외 대상까지 담아 검색엔진에 잘못된 목록을 주고 있었다.
// 과거에 제출/링크된 주소가 남아 있으므로 404 대신 정규 사이트맵으로 영구 이동시킨다.
app.get('/sitemap.xml', (req, res) => {
  res.redirect(301, 'https://tourstream.kr/sitemap.xml');
});

// 카테고리 목록 조회
app.get('/api/categories', (req, res) => {
  varyByAuth(req, res);
  const categoriesFile = path.join(DATA_DIR, 'categories.json');
  try {
    if (fs.existsSync(categoriesFile)) {
      const data = fs.readFileSync(categoriesFile, 'utf8');
      const parsed = JSON.parse(data);
      const hasStringData = Array.isArray(parsed.mainCategories) && parsed.mainCategories.some((c) => typeof c === 'string');

      if (hasStringData) {
        console.log('[API] categories.json 레거시 데이터 감지, 자동 정규화 실행...');
        const normalized = normalizeCategoriesPayload(parsed);
        if (!readOnlyReason()) fs.writeFileSync(categoriesFile, JSON.stringify(normalized, null, 2), 'utf8');
        console.log(`[API] categories.json 정규화 완료: 메인 ${normalized.mainCategories.length}개, 서브 ${normalized.subCategories.length}개`);
        return res.json(normalized);
      }

      const normalized = normalizeCategoriesPayload(parsed);
      if (normalized.mainCategories.length > 0 || normalized.subCategories.length > 0) {
        return res.json(normalized);
      }
    }
  } catch (error) {
    console.warn('[API] categories.json 로드 실패, 상품 데이터로 복구:', error.message);
  }

  const derived = deriveCategoriesFromProducts(visibleTo(req, readProducts()));
  res.json(derived);
});

// 카테고리 저장
app.post('/api/categories', requireAdminKey, (req, res) => {
  const categoriesFile = path.join(DATA_DIR, 'categories.json');
  const normalized = normalizeCategoriesPayload(req.body);
  fs.writeFileSync(categoriesFile, JSON.stringify(normalized, null, 2), 'utf8');
  res.json({ message: '카테고리가 저장되었습니다' });
});

// 레거시 string 배열을 COUNTRY_NAME_SET 기준으로 국가/지역 분류 수정
const fixLegacyLocationsData = (parsed = {}, products = []) => {
  const rawCountries = Array.isArray(parsed.countries) ? parsed.countries : [];
  const rawRegions = Array.isArray(parsed.regions) ? parsed.regions : [];
  const allStrings = [...rawCountries, ...rawRegions];

  const trueCountries = [];
  const trueRegionNames = [];
  const seenCountryNames = new Set();

  // COUNTRY_NAME_SET에 있는 것만 국가로, 나머지는 지역 후보
  allStrings.forEach((item) => {
    const name = typeof item === 'string' ? item.trim() : String(item?.name || '').trim();
    if (!name) return;
    if (COUNTRY_NAME_SET.has(name)) {
      if (!seenCountryNames.has(name)) {
        seenCountryNames.add(name);
        trueCountries.push(name);
      }
    } else {
      trueRegionNames.push(name);
    }
  });

  // 상품 데이터로 지역→국가 매핑
  const countryMap = new Map();
  trueCountries.forEach((name) => {
    countryMap.set(name, {
      id: `country_${Date.now()}_${countryMap.size}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  const regionCountryMap = new Map();
  products.forEach((product) => {
    const locs = Array.isArray(product.locations)
      ? product.locations.map((l) => String(l || '').trim()).filter(Boolean)
      : [];
    if (locs.length < 2) return;
    const knownCountry = locs.find((n) => COUNTRY_NAME_SET.has(n));
    if (!knownCountry) return;
    const countryObj = countryMap.get(knownCountry);
    if (!countryObj) return;
    locs.forEach((regionName) => {
      if (regionName === knownCountry) return;
      if (!regionCountryMap.has(regionName.toLowerCase())) {
        regionCountryMap.set(regionName.toLowerCase(), countryObj.id);
      }
    });
  });

  const regions = [];
  const regionKeySet = new Set();
  trueRegionNames.forEach((name) => {
    const countryId = regionCountryMap.get(name.toLowerCase());
    if (!countryId) return;
    const key = `${countryId}::${name.toLowerCase()}`;
    if (regionKeySet.has(key)) return;
    regionKeySet.add(key);
    regions.push({
      id: `region_${Date.now()}_${regions.length}`,
      name,
      countryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return { countries: Array.from(countryMap.values()), regions };
};

// ── 쿠폰 ─────────────────────────────────────────────────────────────────────
// 판매처가 발행한 할인코드. 적용 대상은 상품 id를 박아두지 않고 "조건"으로 저장해서,
// 나중에 상품이 늘어나도 자동으로 붙게 한다(예: 일본 지역 전체 대상 쿠폰).
// 등록 마감일이 지난 쿠폰은 조회 단계에서 아예 빼므로 손대지 않아도 사라진다.
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');

const readCoupons = () => {
  try {
    if (fs.existsSync(COUPONS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(COUPONS_FILE, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('[쿠폰] 읽기 오류:', error.message);
  }
  return [];
};

const isCouponLive = (coupon, now = new Date()) => {
  const until = Date.parse(coupon?.registerBy || coupon?.validUntil || '');
  if (Number.isFinite(until) && until < now.getTime()) return false;
  const from = Date.parse(coupon?.startsAt || '');
  if (Number.isFinite(from) && from > now.getTime()) return false;
  return true;
};

// 쿠폰 조회 (만료분 자동 제외)
app.get('/api/coupons', (req, res) => {
  const now = new Date();
  const live = readCoupons()
    .filter((c) => isCouponLive(c, now))
    .sort((a, b) => Date.parse(a.registerBy || 0) - Date.parse(b.registerBy || 0));
  res.json(live);
});

// 쿠폰 전체 교체 (어드민/가져오기 스크립트)
app.post('/api/coupons', requireAdminKey, (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.coupons;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: '쿠폰 배열이 필요합니다' });
  }
  try {
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[쿠폰] ${items.length}건 저장`);
    res.json({ saved: items.length });
  } catch (error) {
    console.error('[쿠폰] 저장 오류:', error.message);
    res.status(500).json({ error: '쿠폰 저장에 실패했습니다' });
  }
});

// 지역 목록 조회
app.get('/api/locations', (req, res) => {
  varyByAuth(req, res);
  const locationsFile = path.join(DATA_DIR, 'locations.json');
  try {
    if (fs.existsSync(locationsFile)) {
      const data = fs.readFileSync(locationsFile, 'utf8');
      const parsed = JSON.parse(data);
      const hasStringData = Array.isArray(parsed.countries) && parsed.countries.some((c) => typeof c === 'string');

      if (hasStringData) {
        // 레거시 string 배열 → 자동 수정 후 저장
        console.log('[API] locations.json 레거시 데이터 감지, 자동 정규화 실행...');
        const fixed = fixLegacyLocationsData(parsed, readProducts());
        if (!readOnlyReason()) fs.writeFileSync(locationsFile, JSON.stringify(fixed, null, 2), 'utf8');
        console.log(`[API] locations.json 정규화 완료: 국가 ${fixed.countries.length}개, 지역 ${fixed.regions.length}개`);
        return res.json(fixed);
      }

      const normalized = normalizeLocationsPayload(parsed);
      if (normalized.countries.length > 0 || normalized.regions.length > 0) {
        return res.json(normalized);
      }
    }
  } catch (error) {
    console.warn('[API] locations.json 로드 실패, 상품 데이터로 복구:', error.message);
  }

  const derived = deriveLocationsFromProducts(visibleTo(req, readProducts()));
  res.json(derived);
});

// 지역 저장
app.post('/api/locations', requireAdminKey, (req, res) => {
  const locationsFile = path.join(DATA_DIR, 'locations.json');
  const normalized = normalizeLocationsPayload(req.body);
  fs.writeFileSync(locationsFile, JSON.stringify(normalized, null, 2), 'utf8');
  res.json({ message: '지역이 저장되었습니다' });
});

// 404 핸들러 (알 수 없는 경로)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /api/products',
      'GET /api/products/:id',
      'PUT /api/products/:id/partner-availability',
      'PUT /api/products/:id/partner-prices',
      'POST /api/products/:id/view',
      'POST /api/products',
      'PUT /api/products/:id',
      'DELETE /api/products/:id',
      'GET /api/categories',
      'POST /api/categories',
      'GET /api/locations',
      'POST /api/locations',
      'GET /api/counter',
      'GET /api/admin/partner-search',
      'POST /api/admin/login',
      'POST /api/admin/logout',
      'GET /api/admin/session',
      'GET /api/coupons',
      'POST /api/coupons',
      'GET /api/admin/partner-detail',
      'GET /api/admin/partner-options',
      'POST /api/admin/partner-link',
      'GET /sitemap.xml (301 -> https://tourstream.kr/sitemap.xml)'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT}에서 실행 중입니다`);
  console.log(`📚 API 문서: packages/server/API.md`);
  console.log(`🔗 테스트: curl http://localhost:${PORT}/api/products`);
  console.log(`🌐 루트: http://localhost:${PORT}/`);
});
