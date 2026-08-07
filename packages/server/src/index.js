import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPartnerIntegration } from './integrations/index.js';

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

// 어드민 base64 이미지 등으로 본문이 클 수 있음 (기본 100kb 제한 초과 시 PUT 실패)
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '25mb' }));

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
const COUNTER_FILE = path.join(DATA_DIR, 'counter.json');
const VIEW_EVENTS_FILE = path.join(DATA_DIR, 'view-events.json');

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 레거시 경로에만 데이터가 있는 경우 자동 이관
if (LEGACY_DATA_DIR && LEGACY_DATA_DIR !== DATA_DIR) {
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

// 파일에서 데이터 읽기
const readProducts = () => {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      const hasLegacyData = Array.isArray(parsed) && parsed.some((p) => !Array.isArray(p.partnerLinks));
      if (hasLegacyData) {
        console.log('[API] products.json 레거시 externalUrl 필드 감지, partnerLinks로 자동 마이그레이션...');
        const migrated = parsed.map(migrateLegacyPartnerLinks);
        writeProducts(migrated);
        console.log(`[API] partnerLinks 마이그레이션 완료: ${migrated.length}개 상품`);
        return migrated;
      }
      return parsed;
    }
  } catch (error) {
    console.error('상품 데이터 읽기 오류:', error);
  }
  return [];
};

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

// 파일에 데이터 쓰기
const writeProducts = (products) => {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
  } catch (error) {
    console.error('상품 데이터 쓰기 오류:', error);
  }
};

const writeCounter = (counter) => {
  try {
    fs.writeFileSync(COUNTER_FILE, counter.toString(), 'utf8');
  } catch (error) {
    console.error('카운터 쓰기 오류:', error);
  }
};

const writeViewEvents = (viewEvents) => {
  try {
    fs.writeFileSync(VIEW_EVENTS_FILE, JSON.stringify(viewEvents, null, 2), 'utf8');
  } catch (error) {
    console.error('조회수 이벤트 쓰기 오류:', error);
  }
};

const isBotUserAgent = (userAgent = '') => {
  const normalized = String(userAgent || '').toLowerCase();
  if (!normalized) return false;
  return /(bot|crawler|spider|bingpreview|slurp|mediapartners-google|adsbot|facebookexternalhit|discordbot|telegrambot)/.test(normalized);
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

const normalizePartnerLinks = async (rawLinks) => {
  if (!Array.isArray(rawLinks)) return [];
  const links = rawLinks
    .map((link) => {
      const url = typeof link?.url === 'string' ? link.url.trim() : '';
      if (!url) return null;
      const normalizedLink = {
        partner: typeof link?.partner === 'string' ? link.partner.trim() : '',
        url,
        source: link?.source === 'api' ? 'api' : 'manual',
      };
      const price = toNumberOrUndefined(link?.price, { min: 0 });
      if (price !== undefined) normalizedLink.price = price;
      if (typeof link?.priceDisplay === 'string' && link.priceDisplay.trim()) normalizedLink.priceDisplay = link.priceDisplay.trim();
      if (typeof link?.externalId === 'string' && link.externalId.trim()) normalizedLink.externalId = link.externalId.trim();
      if (typeof link?.updatedAt === 'string' && link.updatedAt.trim()) normalizedLink.updatedAt = link.updatedAt.trim();
      return normalizedLink;
    })
    .filter(Boolean);

  await Promise.all(
    links.map(async (link) => {
      const partnerKey = AUTO_TRACKED_PARTNER_KEYS[link.partner.toLowerCase()];
      if (!partnerKey) return;
      try {
        const integration = getPartnerIntegration(partnerKey);
        link.url = await integration.createTrackedLink(link.url);
      } catch (error) {
        console.warn(`[normalizePartnerLinks] ${link.partner} 트래킹 링크 변환 실패, 원본 URL 유지:`, error.message);
      }
    }),
  );

  return links;
};

const normalizeProductPayload = async (payload = {}) => {
  const categories = toTrimmedStringArray(payload.categories);
  const locations = toTrimmedStringArray(payload.locations);

  const normalized = {
    ...payload,
    name: String(payload.name || '').trim(),
    description: String(payload.description || '').trim(),
    categories: categories.length > 0 ? categories : ['미분류'],
    locations: locations.length > 0 ? locations : ['기타'],
    tags: toTrimmedStringArray(payload.tags),
    images: toTrimmedStringArray(payload.images).filter((img) => !img.includes('via.placeholder.com') && !img.includes('placeholder.com')),
    isRecommended: Boolean(payload.isRecommended),
    isAvailable: payload.isAvailable !== false,
  };

  const price = toNumberOrUndefined(payload.price, { min: 0 });
  const minPrice = toNumberOrUndefined(payload.minPrice, { min: 0 });
  const salePrice = toNumberOrUndefined(payload.salePrice, { min: 0 });
  const rating = toNumberOrUndefined(payload.rating, { min: 0, max: 5 });
  const reviewCount = toNumberOrUndefined(payload.reviewCount, { min: 0 });

  if (price !== undefined) normalized.price = price;
  if (minPrice !== undefined) normalized.minPrice = minPrice;
  if (salePrice !== undefined) normalized.salePrice = salePrice;
  if (rating !== undefined) normalized.rating = rating;
  if (reviewCount !== undefined) normalized.reviewCount = reviewCount;

  normalized.partnerLinks = await normalizePartnerLinks(payload.partnerLinks);

  return normalized;
};

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

// 상품 목록 조회
app.get('/api/products', (req, res) => {
  const products = readProducts();
  const viewEvents = trimExpiredViewEvents(readViewEvents());
  writeViewEvents(viewEvents);
  console.log(`[API] GET /api/products 요청 - ${products.length}개 상품 반환`);
  // placeholder 이미지 URL 제거
  const cleanedProducts = products.map(product => ({
    ...product,
    ...getRecentViewMeta(viewEvents, product.id),
    images: (product.images || []).filter((img) => 
      img && 
      img.trim() !== '' && 
      !img.includes('via.placeholder.com') && 
      !img.includes('placeholder.com')
    )
  }));
  res.json(cleanedProducts);
});

// 상품 상세 조회
app.get('/api/products/:id', (req, res) => {
  const products = readProducts();
  const nowMs = Date.now();
  const viewEvents = trimExpiredViewEvents(readViewEvents(), nowMs);
  writeViewEvents(viewEvents);
  const index = findProductIndex(products, req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }

  const userAgent = req.get('user-agent') || '';
  if (!isBotUserAgent(userAgent)) {
    // 상세 조회 시 조회수 증가
    const currentViews = Number(products[index].views) || 0;
    products[index] = {
      ...products[index],
      views: currentViews + 1
    };
    writeProducts(products);
    const productId = products[index].id;
    const currentEvents = Array.isArray(viewEvents[productId]) ? viewEvents[productId] : [];
    viewEvents[productId] = [...currentEvents, nowMs];
    writeViewEvents(viewEvents);
    warnIfViewSpike(productId, viewEvents, nowMs);
  }
  const product = products[index];

  // placeholder 이미지 URL 제거
  const cleanedProduct = {
    ...product,
    ...getRecentViewMeta(viewEvents, product.id),
    images: (product.images || []).filter((img) => 
      img && 
      img.trim() !== '' && 
      !img.includes('via.placeholder.com') && 
      !img.includes('placeholder.com')
    )
  };
  res.json(cleanedProduct);
});

// 상품 조회수 증가
app.post('/api/products/:id/view', (req, res) => {
  const userAgent = req.get('user-agent') || '';
  if (isBotUserAgent(userAgent)) {
    const products = readProducts();
    const product = products.find((p) => sameProductId(p.id, req.params.id));
    if (!product) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
    }
    return res.json({
      id: product.id,
      views: Number(product.views) || 0,
      counted: false,
      reason: 'bot',
    });
  }

  const products = readProducts();
  const nowMs = Date.now();
  const viewEvents = trimExpiredViewEvents(readViewEvents(), nowMs);
  const index = findProductIndex(products, req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }

  const currentViews = Number(products[index].views) || 0;
  products[index] = {
    ...products[index],
    views: currentViews + 1
  };
  writeProducts(products);
  const productId = products[index].id;
  const currentEvents = Array.isArray(viewEvents[productId]) ? viewEvents[productId] : [];
  viewEvents[productId] = [...currentEvents, nowMs];
  writeViewEvents(viewEvents);
  warnIfViewSpike(productId, viewEvents, nowMs);

  res.json({
    id: products[index].id,
    views: products[index].views,
    counted: true,
    ...getRecentViewMeta(viewEvents, productId, nowMs),
  });
});

app.get('/api/metrics/views', (req, res) => {
  const nowMs = Date.now();
  const products = readProducts();
  const viewEvents = trimExpiredViewEvents(readViewEvents(), nowMs);
  writeViewEvents(viewEvents);
  return res.json(buildViewMetrics(products, viewEvents, nowMs));
});

// 상품 등록
app.post('/api/products', async (req, res) => {
  const products = readProducts();
  let counter = readCounter();

  // 다음 상품 번호 생성
  counter++;
  const productId = counter.toString();

  const normalizedPayload = await normalizeProductPayload(req.body);
  
  const newProduct = {
    ...normalizedPayload,
    id: productId,
    views: 0,
  };
  
  products.push(newProduct);
  writeProducts(products);
  writeCounter(counter);
  
  console.log(`[API] POST /api/products - 상품 등록 성공: ${newProduct.id} ${newProduct.name}`);
  res.status(201).json(newProduct);
});

// 상품 수정
app.put('/api/products/:id', async (req, res) => {
  const products = readProducts();
  const index = findProductIndex(products, req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }

  const normalizedPayload = await normalizeProductPayload({
    ...products[index],
    ...req.body
  });
  
  products[index] = {
    ...products[index],
    ...normalizedPayload,
    id: req.params.id, // ID는 변경 불가
  };
  
  writeProducts(products);
  res.json(products[index]);
});

// 상품 삭제
app.delete('/api/products/:id', (req, res) => {
  const products = readProducts();
  const index = findProductIndex(products, req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }
  
  const deletedProduct = products[index];
  products.splice(index, 1);
  writeProducts(products);
  
  res.json({ message: '상품이 삭제되었습니다', product: deletedProduct });
});

// 어드민 - 파트너 API 상품 검색 (등록 폼에서 API 연동 링크를 고를 때 사용)
app.get('/api/admin/partner-search', async (req, res) => {
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

// 어드민 - 선택한 파트너 상품 URL을 어필리에이트 추적 링크로 변환
app.post('/api/admin/partner-link', async (req, res) => {
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

// 동적 Sitemap 생성
app.get('/sitemap.xml', (req, res) => {
  try {
    const products = readProducts();
    const categoriesFile = path.join(DATA_DIR, 'categories.json');
    const locationsFile = path.join(DATA_DIR, 'locations.json');
    
    const baseUrl = 'https://tourstream.kr';
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    const seenLocs = new Set();
    const appendUrl = (loc, changefreq, priority) => {
      if (!loc || seenLocs.has(loc)) return;
      seenLocs.add(loc);
      xml += '  <url>\n';
      xml += `    <loc>${loc}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${changefreq}</changefreq>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += '  </url>\n';
    };
    
    // 한국어 이름 → 로마자 슬러그 변환 (앱의 toEnglishSlug 와 동일 로직)
    const L_TABLE = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
    const V_TABLE = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
    const T_TABLE = ["","k","k","ks","n","nj","nh","t","l","lk","lm","lb","ls","lt","lp","lh","m","p","ps","t","t","ng","t","t","k","t","p","h"];
    const romanizeKorean = (text) => {
      let result = '';
      for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (code >= 0xAC00 && code <= 0xD7A3) {
          const s = code - 0xAC00;
          result += `${L_TABLE[Math.floor(s/588)]}${V_TABLE[Math.floor((s%588)/28)]}${T_TABLE[s%28]}`;
        } else {
          result += ch;
        }
      }
      return result;
    };
    const toSlug = (value) => {
      if (!value) return '';
      const romanized = romanizeKorean(String(value).trim());
      const cleaned = romanized.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, '-and-')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
      return cleaned || `item-${Math.abs(Array.from(value).reduce((h,c)=>(h<<5)-h+c.charCodeAt(0),0)).toString(36).slice(0,6)}`;
    };
    const COUNTRY_ENGLISH = { '일본':'japan','프랑스':'france','태국':'thailand','베트남':'vietnam','한국':'korea','대만':'taiwan','홍콩':'hong-kong','싱가포르':'singapore','미국':'united-states','이탈리아':'italy','중국':'china','마카오':'macau','말레이시아':'malaysia' };

    // 홈페이지
    appendUrl(`${baseUrl}/`, 'daily', '1.0');
    
    // 상품 목록 페이지
    appendUrl(`${baseUrl}/products`, 'daily', '0.9');

    // 인기 페이지
    appendUrl(`${baseUrl}/popular`, 'daily', '0.85');

    // 항공권 검색 페이지
    appendUrl(`${baseUrl}/flights`, 'weekly', '0.8');

    // 모든 상품 페이지
    products.forEach(product => {
      if (!product?.id) return;
      appendUrl(`${baseUrl}/product/${escapeXml(product.id)}`, 'weekly', '0.8');
    });
    
    // 카테고리 페이지 (/category/:id 라우트 - slug 형식)
    const categoriesData = readJsonIfExists(categoriesFile, { mainCategories: [], subCategories: [] });
    const mainCats = Array.isArray(categoriesData.mainCategories) ? categoriesData.mainCategories : [];
    mainCats.forEach(category => {
      if (!category) return;
      const name = typeof category === 'string' ? category : String(category.name || '').trim();
      if (!name) return;
      const slug = toSlug(name);
      if (slug) appendUrl(`${baseUrl}/category/${escapeXml(slug)}`, 'weekly', '0.7');
    });
    
    // 국가 페이지 (/country/:id 라우트 - 앱과 동일한 영문 슬러그)
    const locationsData = readJsonIfExists(locationsFile, { countries: [], regions: [] });
    const countries = Array.isArray(locationsData.countries) ? locationsData.countries : [];
    countries.forEach(country => {
      if (!country) return;
      const name = typeof country === 'string' ? country : String(country.name || '').trim();
      if (!name) return;
      // 앱의 COUNTRY_ENGLISH_MAP 과 동일 매핑 우선 사용, 없으면 로마자 변환
      const slug = COUNTRY_ENGLISH[name] || toSlug(name);
      if (slug) appendUrl(`${baseUrl}/country/${escapeXml(slug)}`, 'weekly', '0.7');
    });

    // 지역 페이지 (/region/:name 라우트 - 국가 하위 경로가 아닌 독립 경로)
    const regions = Array.isArray(locationsData.regions) ? locationsData.regions : [];
    regions.forEach(region => {
      if (!region) return;
      const name = typeof region === 'string' ? region : String(region.name || '').trim();
      if (!name) return;
      const slug = toSlug(name);
      if (slug) appendUrl(`${baseUrl}/region/${escapeXml(slug)}`, 'weekly', '0.65');
    });

    // 목적지 조합 페이지 (/destination/:region/:category) - 실제 겹치는 상품이 3개 이상인(인덱싱 대상) 조합만 포함
    // shell 생성 스크립트의 noindex 기준(MIN_PRODUCTS_TO_INDEX=3)과 동일하게 맞춤
    const MIN_PRODUCTS_TO_INDEX = 3;
    regions.forEach(region => {
      const regionName = typeof region === 'string' ? region : String(region?.name || '').trim();
      if (!regionName) return;
      const regionSlug = toSlug(regionName);
      if (!regionSlug) return;

      mainCats.forEach(category => {
        const categoryName = typeof category === 'string' ? category : String(category?.name || '').trim();
        if (!categoryName) return;
        const categorySlug = toSlug(categoryName);
        if (!categorySlug) return;

        const comboCount = products.filter(p =>
          Array.isArray(p.locations) && p.locations.includes(regionName) &&
          Array.isArray(p.categories) && p.categories.includes(categoryName)
        ).length;
        if (comboCount < MIN_PRODUCTS_TO_INDEX) return;

        appendUrl(`${baseUrl}/destination/${escapeXml(regionSlug)}/${escapeXml(categorySlug)}`, 'weekly', '0.7');
      });
    });

    xml += '</urlset>';
    
    res.set('Content-Type', 'application/xml');
    res.send(xml);
    
    console.log(`[Sitemap] 생성 완료: ${products.length}개 상품, ${now}`);
  } catch (error) {
    console.error('[Sitemap] 생성 오류:', error);
    res.status(500).send('Sitemap 생성 중 오류가 발생했습니다');
  }
});

// 카테고리 목록 조회
app.get('/api/categories', (req, res) => {
  const categoriesFile = path.join(DATA_DIR, 'categories.json');
  try {
    if (fs.existsSync(categoriesFile)) {
      const data = fs.readFileSync(categoriesFile, 'utf8');
      const parsed = JSON.parse(data);
      const hasStringData = Array.isArray(parsed.mainCategories) && parsed.mainCategories.some((c) => typeof c === 'string');

      if (hasStringData) {
        console.log('[API] categories.json 레거시 데이터 감지, 자동 정규화 실행...');
        const normalized = normalizeCategoriesPayload(parsed);
        fs.writeFileSync(categoriesFile, JSON.stringify(normalized, null, 2), 'utf8');
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

  const derived = deriveCategoriesFromProducts(readProducts());
  res.json(derived);
});

// 카테고리 저장
app.post('/api/categories', (req, res) => {
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

// 지역 목록 조회
app.get('/api/locations', (req, res) => {
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
        fs.writeFileSync(locationsFile, JSON.stringify(fixed, null, 2), 'utf8');
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

  const derived = deriveLocationsFromProducts(readProducts());
  res.json(derived);
});

// 지역 저장
app.post('/api/locations', (req, res) => {
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
      'POST /api/admin/partner-link',
      'GET /sitemap.xml'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT}에서 실행 중입니다`);
  console.log(`📚 API 문서: packages/server/API.md`);
  console.log(`🔗 테스트: curl http://localhost:${PORT}/api/products`);
  console.log(`🌐 루트: http://localhost:${PORT}/`);
});
