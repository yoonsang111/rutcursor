import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const preferredDir = path.resolve(cwd, 'packages/server/data/local-beta');
const legacyDir = path.resolve(cwd, 'packages/server/packages/server/data/local-beta');

const dataDir = preferredDir;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(legacyDir)) {
  for (const fileName of ['products.json', 'counter.json', 'categories.json', 'locations.json']) {
    const legacyFile = path.join(legacyDir, fileName);
    const currentFile = path.join(dataDir, fileName);
    if (fs.existsSync(legacyFile) && !fs.existsSync(currentFile)) {
      fs.copyFileSync(legacyFile, currentFile);
    }
  }
}

const productsFile = path.join(dataDir, 'products.json');
const categoriesFile = path.join(dataDir, 'categories.json');
const locationsFile = path.join(dataDir, 'locations.json');
const backupFile = path.join(dataDir, `products.backup.${Date.now()}.json`);

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const arr = (value) => (Array.isArray(value) ? value.map((x) => String(x || '').trim()).filter(Boolean) : []);
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

if (!fs.existsSync(productsFile)) {
  fs.writeFileSync(productsFile, '[]', 'utf8');
}

const rawProducts = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
if (!Array.isArray(rawProducts)) {
  throw new Error('products.json 형식이 배열이 아닙니다.');
}

fs.writeFileSync(backupFile, JSON.stringify(rawProducts, null, 2), 'utf8');

const bySignature = new Map();
for (const product of rawProducts) {
  const categories = arr(product.categories).sort();
  const locations = arr(product.locations).sort();
  const signature = [
    normalize(product.name),
    JSON.stringify(categories),
    JSON.stringify(locations),
    normalize(product.externalUrl1),
  ].join('::');

  const normalizedProduct = {
    ...product,
    name: String(product.name || '').trim(),
    description: String(product.description || '').trim(),
    categories: categories.length > 0 ? categories : ['미분류'],
    locations: locations.length > 0 ? locations : ['기타'],
    tags: arr(product.tags),
    images: arr(product.images),
    isRecommended: Boolean(product.isRecommended),
    isAvailable: product.isAvailable !== false,
  };
  const primary = [product.externalUrl1, product.externalUrl2, product.externalUrl3, product.externalUrl4, product.externalUrl5]
    .map((x) => String(x || '').trim())
    .find(Boolean);
  if (primary) normalizedProduct.externalUrl1 = primary;

  const existing = bySignature.get(signature);
  if (!existing) {
    bySignature.set(signature, normalizedProduct);
    continue;
  }

  const existingViews = Number(existing.views || 0);
  const currentViews = Number(normalizedProduct.views || 0);
  const existingScore = existingViews + (existing.externalUrl1 ? 10 : 0) + (existing.categories.length > 0 ? 5 : 0) + (existing.locations.length > 0 ? 5 : 0);
  const currentScore = currentViews + (normalizedProduct.externalUrl1 ? 10 : 0) + (normalizedProduct.categories.length > 0 ? 5 : 0) + (normalizedProduct.locations.length > 0 ? 5 : 0);
  if (currentScore > existingScore) {
    bySignature.set(signature, normalizedProduct);
  }
}

const dedupedProducts = Array.from(bySignature.values());
dedupedProducts.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

const categoryMap = new Map();
for (const product of dedupedProducts) {
  for (const categoryName of arr(product.categories)) {
    const key = normalize(categoryName);
    if (!key) continue;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        id: `main_cat_${Date.now()}_${categoryMap.size}`,
        name: categoryName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

const countryMap = new Map();
const regionMap = new Map();
for (const product of dedupedProducts) {
  const locations = arr(product.locations);
  if (locations.length === 0) continue;
  const detectedCountry = locations.find((name) => COUNTRY_NAME_SET.has(name));
  const countryName = detectedCountry || locations[0];
  const countryKey = normalize(countryName);
  if (!countryKey) continue;

  if (!countryMap.has(countryKey)) {
    countryMap.set(countryKey, {
      id: `country_${Date.now()}_${countryMap.size}`,
      name: countryName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const country = countryMap.get(countryKey);
  for (const regionName of locations.filter((name) => name !== countryName && !COUNTRY_NAME_SET.has(name))) {
    const regionKey = `${country.id}::${normalize(regionName)}`;
    if (!normalize(regionName) || regionMap.has(regionKey)) continue;
    regionMap.set(regionKey, {
      id: `region_${Date.now()}_${regionMap.size}`,
      name: regionName,
      countryId: country.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

fs.writeFileSync(productsFile, JSON.stringify(dedupedProducts, null, 2), 'utf8');
fs.writeFileSync(categoriesFile, JSON.stringify({ mainCategories: Array.from(categoryMap.values()), subCategories: [] }, null, 2), 'utf8');
fs.writeFileSync(locationsFile, JSON.stringify({ countries: Array.from(countryMap.values()), regions: Array.from(regionMap.values()) }, null, 2), 'utf8');

console.log('[normalize-local-beta-data] dataDir:', dataDir);
console.log('[normalize-local-beta-data] backup:', backupFile);
console.log('[normalize-local-beta-data] products:', rawProducts.length, '->', dedupedProducts.length);
console.log('[normalize-local-beta-data] mainCategories:', categoryMap.size);
console.log('[normalize-local-beta-data] countries:', countryMap.size, 'regions:', regionMap.size);
