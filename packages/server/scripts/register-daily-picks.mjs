// 매일 아침 루틴이 커밋하는 docs/daily-tour-picks-log.json 의 티켓들을
// 운영 API에 "임시저장(isAvailable: false)" 상품으로 등록하는 스크립트.
// 카테고리/국가/지역이 없으면 먼저 등록한다. 같은 이름의 상품이 이미 있으면 건너뛰므로 여러 번 실행해도 안전.
//
// 사용법:
//   ADMIN_API_KEY=... node scripts/register-daily-picks.mjs
//   DRY_RUN=1 ADMIN_API_KEY=... node scripts/register-daily-picks.mjs   (등록 없이 계획만 출력)
//
// 환경변수:
//   ADMIN_API_KEY  (필수) 쓰기 API 인증 키
//   API_BASE_URL   기본 https://api.tourstream.kr/api
//   PICKS_FILE     기본 <repo>/docs/daily-tour-picks-log.json
//   DRY_RUN        1이면 실제 등록 안 함

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE_URL = (process.env.API_BASE_URL || 'https://api.tourstream.kr/api').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const PICKS_FILE = process.env.PICKS_FILE || path.resolve(__dirname, '../../../docs/daily-tour-picks-log.json');
const DRY_RUN = process.env.DRY_RUN === '1';

const DEFAULT_CATEGORY = '티켓/입장권';
const SOURCE_TAG = 'daily-pick';

// 루틴 JSON의 links 키 → 사이트에서 쓰는 파트너 표시명
const PARTNER_NAME_BY_KEY = {
  myrealtrip: '마이리얼트립',
  klook: 'KLOOK',
  kkday: 'KKday',
  tripcom: '트립닷컴',
  waug: '와그',
  getyourguide: 'GetYourGuide',
};

if (!ADMIN_API_KEY) {
  console.error('[register-picks] ADMIN_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}
if (!fs.existsSync(PICKS_FILE)) {
  console.error(`[register-picks] 픽 로그 파일이 없습니다: ${PICKS_FILE}`);
  process.exit(1);
}

const authHeaders = { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_API_KEY };

const apiGet = async (p) => {
  const res = await fetch(`${API_BASE_URL}${p}`);
  if (!res.ok) throw new Error(`GET ${p} 실패 (${res.status})`);
  return res.json();
};

const apiPost = async (p, body) => {
  if (DRY_RUN) return { dryRun: true };
  const res = await fetch(`${API_BASE_URL}${p}`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${p} 실패 (${res.status}) ${text.slice(0, 200)}`);
  }
  return res.json();
};

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '');
const isHttpUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s.trim());

// "프라하, 체코" → { region: '프라하', country: '체코' }. 콤마 없으면 전체를 지역으로.
const parseDestination = (destination = '') => {
  const parts = String(destination).split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { region: parts[0], country: parts[parts.length - 1] };
  return { region: parts[0] || '', country: '' };
};

// 루틴이 아직 안 넣어준 필드는 최소한의 값으로 채운다 (나중에 루틴이 채우면 그걸 우선 사용)
const buildProductFromPick = (item, date) => {
  const parsed = parseDestination(item.destination);
  const country = String(item.country || parsed.country || '').trim();
  const region = String(item.region || parsed.region || '').trim();
  const category = String(item.category || DEFAULT_CATEGORY).trim();

  const description =
    String(item.description || '').trim() ||
    `${[country, region].filter(Boolean).join(' ')} ${item.name} — 여러 예약 사이트 가격을 비교해보세요.`.trim();

  const tags = Array.from(
    new Set(
      [
        ...(Array.isArray(item.tags) ? item.tags : []),
        region,
        country,
        SOURCE_TAG,
        `${SOURCE_TAG}:${date}`,
      ]
        .map((t) => String(t || '').trim())
        .filter(Boolean),
    ),
  );

  const partnerLinks = Object.entries(item.links || {})
    .filter(([, url]) => isHttpUrl(url))
    .map(([key, url]) => ({
      partner: PARTNER_NAME_BY_KEY[key] || key,
      url: String(url).trim(),
      source: 'manual',
    }));

  return {
    name: String(item.name || '').trim(),
    description,
    categories: [category],
    locations: [country, region].filter(Boolean),
    tags,
    images: [],
    partnerLinks,
    isRecommended: false,
    isAvailable: false, // 임시저장 - 어드민이 검토 후 활성화
    country,
    region,
    category,
  };
};

const main = async () => {
  const log = JSON.parse(fs.readFileSync(PICKS_FILE, 'utf8'));
  const days = Array.isArray(log) ? log : Array.isArray(log.entries) ? log.entries : [];
  const picks = days.flatMap((day) => (Array.isArray(day.items) ? day.items.map((item) => ({ item, date: day.date })) : []));
  console.log(`[register-picks] 픽 로그: ${days.length}일치, 항목 ${picks.length}개${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const [products, categoriesRes, locationsRes] = await Promise.all([
    apiGet('/products'),
    apiGet('/categories'),
    apiGet('/locations'),
  ]);

  const existingNames = new Set((Array.isArray(products) ? products : []).map((p) => norm(p.name)));
  const mainCategories = Array.isArray(categoriesRes?.mainCategories) ? [...categoriesRes.mainCategories] : [];
  const subCategories = Array.isArray(categoriesRes?.subCategories) ? [...categoriesRes.subCategories] : [];
  const countries = Array.isArray(locationsRes?.countries) ? [...locationsRes.countries] : [];
  const regions = Array.isArray(locationsRes?.regions) ? [...locationsRes.regions] : [];

  let categoriesChanged = false;
  let locationsChanged = false;
  const now = Date.now();
  let seq = 0;

  const ensureCategory = (name) => {
    if (mainCategories.some((c) => norm(c.name) === norm(name))) return;
    mainCategories.push({ id: `main_cat_${now}_${seq++}`, name });
    categoriesChanged = true;
    console.log(`  + 카테고리 등록 예정: ${name}`);
  };

  const ensureLocation = (country, region) => {
    if (!country) return;
    let c = countries.find((x) => norm(x.name) === norm(country));
    if (!c) {
      c = { id: `country_${now}_${seq++}`, name: country };
      countries.push(c);
      locationsChanged = true;
      console.log(`  + 국가 등록 예정: ${country}`);
    }
    if (!region) return;
    const hasRegion = regions.some((r) => r.countryId === c.id && norm(r.name) === norm(region));
    if (!hasRegion) {
      regions.push({ id: `region_${now}_${seq++}`, name: region, countryId: c.id });
      locationsChanged = true;
      console.log(`  + 지역 등록 예정: ${country} > ${region}`);
    }
  };

  const toCreate = [];
  const skipped = [];
  for (const { item, date } of picks) {
    const product = buildProductFromPick(item, date);
    if (!product.name) {
      skipped.push({ name: '(이름 없음)', reason: '상품명 없음' });
      continue;
    }
    if (existingNames.has(norm(product.name))) {
      skipped.push({ name: product.name, reason: '이미 등록됨' });
      continue;
    }
    if (product.partnerLinks.length === 0) {
      skipped.push({ name: product.name, reason: '유효한 파트너 링크 없음' });
      continue;
    }
    existingNames.add(norm(product.name)); // 같은 실행 내 중복 방지
    ensureCategory(product.category);
    ensureLocation(product.country, product.region);
    toCreate.push(product);
  }

  if (categoriesChanged) {
    await apiPost('/categories', { mainCategories, subCategories });
    console.log('[register-picks] 카테고리 저장 완료');
  }
  if (locationsChanged) {
    await apiPost('/locations', { countries, regions });
    console.log('[register-picks] 국가/지역 저장 완료');
  }

  let created = 0;
  let failed = 0;
  for (const product of toCreate) {
    const { country, region, category, ...payload } = product;
    try {
      const saved = await apiPost('/products', payload);
      created += 1;
      console.log(`  ✓ ${DRY_RUN ? '(계획) ' : ''}${payload.name} [${category} / ${country} ${region}] 파트너 ${payload.partnerLinks.length}곳${saved?.id ? ` → id ${saved.id}` : ''}`);
    } catch (error) {
      failed += 1;
      console.error(`  ✗ ${payload.name}: ${error.message}`);
    }
  }

  skipped.forEach((s) => console.log(`  - 건너뜀: ${s.name} (${s.reason})`));
  console.log(`[register-picks] 완료 - 등록 ${created}, 건너뜀 ${skipped.length}, 실패 ${failed}`);
  if (failed > 0) process.exit(1);
};

main().catch((error) => {
  console.error('[register-picks] 오류:', error.message);
  process.exit(1);
});
