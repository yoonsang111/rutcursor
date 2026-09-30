// 설명이 너무 짧은 상품들의 설명 "초안"을 만들어 파일로 떨군다. 운영 데이터는 건드리지 않는다.
// 검색엔진이 얇은 문서로 보는 상품 페이지를 줄이는 게 목적이라, 상품마다 실제로 다른 정보
// (지역·분류·태그·파트너 수·가격대·평점)를 문장으로 풀어 쓴다. 문장 틀은 상품 id로 고정 선택해
// 매번 같은 결과가 나오면서도 페이지끼리 같은 문장이 반복되지 않게 한다.
//
// 사용법:
//   node packages/server/scripts/draft-product-descriptions.mjs
//   MIN_LENGTH=80 OUT_FILE=... node packages/server/scripts/draft-product-descriptions.mjs
//
// 결과물은 사람이 읽고 고친 뒤 어드민에 넣는 걸 전제로 한다 (자동 반영 안 함).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE_URL = (process.env.API_BASE_URL || 'https://api.tourstream.kr/api').replace(/\/$/, '');
const MIN_LENGTH = Number(process.env.MIN_LENGTH || 50);
const OUT_FILE = process.env.OUT_FILE || path.resolve(__dirname, '../../../docs/product-description-drafts.json');

const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`;

// 상품 id를 숫자로 접어 문장 틀을 고른다 (같은 상품은 항상 같은 틀)
const pickBy = (id, list) => {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 100000;
  return list[h % list.length];
};

const lowestPrice = (product) => {
  const prices = (Array.isArray(product.partnerLinks) ? product.partnerLinks : [])
    .map((l) => Number(l.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
};

// 상품명에 이미 들어있는 말은 빼고, 설명에 보탤 만한 태그만 남긴다
const usefulTags = (product) => {
  const name = String(product.name || '').replace(/\s+/g, '');
  return (Array.isArray(product.tags) ? product.tags : [])
    .map((t) => String(t || '').trim())
    .filter((t) => t.length >= 2 && !name.includes(t.replace(/\s+/g, '')) && !/^daily-pick/.test(t))
    .slice(0, 3);
};

const buildDraft = (product) => {
  const name = String(product.name || '').trim();
  const locations = (Array.isArray(product.locations) ? product.locations : []).filter(Boolean);
  const categories = (Array.isArray(product.categories) ? product.categories : []).filter(Boolean);
  const region = locations[0] || '';
  const country = locations[locations.length - 1] || '';
  const category = categories[0] || '';
  const place = [country, region].filter((v, i, a) => v && a.indexOf(v) === i).join(' ');
  const partners = (Array.isArray(product.partnerLinks) ? product.partnerLinks : []).filter((l) => l?.url);
  const partnerNames = partners.map((l) => l.partner).filter(Boolean);
  const price = lowestPrice(product);
  const tags = usefulTags(product);
  const existing = String(product.description || '').trim();
  const rating = Number(product.rating);
  const reviewCount = Number(product.reviewCount);

  const sentences = [];

  // 1. 무엇을 어디서 - 상품마다 반드시 달라지는 부분
  const opener = pickBy(product.id, [
    place && category ? `${name}은 ${place}에서 이용할 수 있는 ${category} 상품입니다.` : `${name} 상품입니다.`,
    place ? `${place} 여행을 준비한다면 ${name}을 확인해보세요.` : `${name}을 확인해보세요.`,
    place && category ? `${place} ${category} 중에서도 자주 찾는 ${name}입니다.` : `${name}입니다.`,
  ]);
  sentences.push(opener);

  // 2. 기존에 적어둔 짧은 설명이 있으면 살린다 (사람이 쓴 정보라 우선)
  if (existing && !existing.includes('가격비교') && existing.length > 5) {
    sentences.push(existing.endsWith('.') ? existing : `${existing}.`);
  }

  // 3. 태그로 남아 있는 특징
  if (tags.length > 0) {
    sentences.push(
      pickBy(product.id + 'tag', [
        `${tags.join(', ')} 키워드로도 찾는 상품입니다.`,
        `${tags.join(', ')} 등과 함께 검색되는 상품입니다.`,
      ]),
    );
  }

  // 4. 이 사이트에서 무엇을 할 수 있는지 (가격·파트너)
  if (partners.length > 0 && price) {
    sentences.push(
      `현재 ${partnerNames.slice(0, 4).join(', ')}${partners.length > 4 ? ' 등' : ''} ${partners.length}곳의 예약 가격을 비교할 수 있으며, 확인된 최저가는 ${won(price)}부터입니다.`,
    );
  } else if (partners.length > 0) {
    sentences.push(`${partnerNames.slice(0, 4).join(', ')} 등 ${partners.length}곳의 예약 링크를 한 곳에서 확인할 수 있습니다.`);
  }

  // 5. 평점이 있으면 신뢰 정보
  if (Number.isFinite(rating) && rating > 0 && Number.isFinite(reviewCount) && reviewCount > 0) {
    sentences.push(`파트너사 기준 평점은 ${rating}점, 이용 후기는 ${reviewCount.toLocaleString('ko-KR')}건입니다.`);
  }

  // 6. 표시 가격의 의미 (모든 상품 공통이라 마지막에, 짧게)
  sentences.push('표시 가격은 각 예약 사이트의 최저 옵션가 기준이며 날짜와 인원에 따라 달라집니다.');

  return sentences.join(' ');
};

const main = async () => {
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) throw new Error(`상품 조회 실패 (${res.status})`);
  const products = await res.json();

  const targets = products.filter(
    (p) => p.isAvailable !== false && String(p.description || '').trim().length <= MIN_LENGTH,
  );

  const drafts = targets.map((p) => ({
    id: p.id,
    name: p.name,
    currentDescription: String(p.description || '').trim(),
    currentLength: String(p.description || '').trim().length,
    draft: buildDraft(p),
  }));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), minLength: MIN_LENGTH, drafts }, null, 2), 'utf8');

  const lens = drafts.map((d) => d.draft.length);
  const unique = new Set(drafts.map((d) => d.draft)).size;
  console.log(`[draft-descriptions] 대상 ${drafts.length}개 (설명 ${MIN_LENGTH}자 이하)`);
  console.log(`[draft-descriptions] 초안 길이 평균 ${Math.round(lens.reduce((a, b) => a + b, 0) / (lens.length || 1))}자, 최소 ${Math.min(...lens)}, 최대 ${Math.max(...lens)}`);
  console.log(`[draft-descriptions] 서로 다른 초안 ${unique}개 / ${drafts.length}개 (중복 ${drafts.length - unique})`);
  console.log(`[draft-descriptions] 저장: ${OUT_FILE}`);
  drafts.slice(0, 3).forEach((d) => console.log(`\n  [${d.id}] ${d.name}\n   전: ${d.currentDescription || '(없음)'}\n   후: ${d.draft}`));
};

main().catch((error) => {
  console.error('[draft-descriptions] 오류:', error.message);
  process.exit(1);
});
