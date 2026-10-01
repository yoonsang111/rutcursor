import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.resolve(__dirname, "..", "build");
const indexPath = path.join(buildDir, "index.html");

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://api.tourstream.kr/api";
const SITE_URL = "https://tourstream.kr";

// 카테고리 안내는 React 화면(V2CategoryPage)과 같은 파일을 읽는다.
// 화면과 크롤러가 보는 내용이 달라지면 클로킹이 되므로 출처를 하나로 유지한다.
const categoryGuides = JSON.parse(
  await fs.readFile(path.join(__dirname, "..", "src", "v2", "data", "categoryGuides.json"), "utf8"),
);

// 슬러그 표는 React(urlSlugs.ts)와 같은 파일을 읽는다. 두 곳이 갈리면 같은 페이지가 URL 두 개로 생긴다.
const SLUG_MAP = JSON.parse(
  await fs.readFile(path.join(__dirname, "..", "src", "v2", "data", "slugMap.json"), "utf8"),
);
const categorySlug = (name) => SLUG_MAP.categories[name] || toSlug(name);
const countrySlug = (name) => SLUG_MAP.countries[name] || toSlug(name);
const regionSlug = (name) => SLUG_MAP.regions[name] || toSlug(name);

const L_TABLE = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const V_TABLE = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];
const T_TABLE = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "h"];

function romanizeKorean(text = "") {
  let result = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const sIndex = code - 0xac00;
      const l = Math.floor(sIndex / 588);
      const v = Math.floor((sIndex % 588) / 28);
      const t = sIndex % 28;
      result += `${L_TABLE[l]}${V_TABLE[v]}${T_TABLE[t]}`;
    } else {
      result += ch;
    }
  }
  return result;
}

function toSlug(value = "") {
  const source = String(value || "").trim();
  if (!source) return "item";

  const romanized = romanizeKorean(source);
  const cleaned = romanized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "item";
}

function upsertTag(html, regex, tag) {
  if (regex.test(html)) return html.replace(regex, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function resolvePrice(product) {
  // 상품 대부분이 최상위 price/minPrice/salePrice가 비어있고 실제 가격은 partnerLinks[].price에만 있음
  // (실제 상품 상세 페이지/최저가 정렬도 partnerLinks 최저가 기준이므로 동일하게 맞춤).
  const partnerPrices = (Array.isArray(product.partnerLinks) ? product.partnerLinks : [])
    .map((link) => Number(link.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  if (partnerPrices.length > 0) return Math.min(...partnerPrices);

  const price = product.price ?? product.minPrice ?? product.salePrice ?? null;
  return price != null && Number(price) > 0 ? Number(price) : Infinity;
}

function buildProductJsonLd(product) {
  const resolvedPrice = resolvePrice(product);
  const safePrice = Number.isFinite(resolvedPrice) ? resolvedPrice : 0;
  const productImage = (Array.isArray(product.images) && product.images[0]) || product.image || null;
  const description = product.description
    ? product.description.slice(0, 200)
    : `${product.name} 여행 상품을 여러 예약 사이트에서 최저가로 비교하세요.`;

  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const offerBase = {
    "@type": "Offer",
    price: safePrice,
    priceCurrency: "KRW",
    priceValidUntil,
    availability: product.isAvailable !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: product.partnerLinks?.[0]?.url || `${SITE_URL}/product/${product.id}`,
    seller: { "@type": "Organization", name: "TourStream", url: SITE_URL },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "KR",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "KRW" },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "KR" },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
        transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
      },
    },
  };

  const hasRating = product.rating != null && Number(product.rating) > 0
    && product.reviewCount != null && Number(product.reviewCount) > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    image: productImage,
    url: `${SITE_URL}/product/${product.id}`,
    category: Array.isArray(product.categories) ? product.categories[0] || "여행" : "여행",
    brand: { "@type": "Brand", name: "TourStream" },
    keywords: Array.isArray(product.tags) ? product.tags.join(", ") : "",
    offers: offerBase,
  };

  if (hasRating) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}

function buildItemListJsonLd(routePath, products, listName, options = {}) {
  const { includeOffers = false } = options;

  const items = products.slice(0, 20).map((product, index) => {
    const item = {
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/product/${product.id}`,
      name: product.name,
    };

    if (includeOffers) {
      const price = resolvePrice(product);
      if (Number.isFinite(price)) {
        item.item = {
          "@type": "Product",
          name: product.name,
          url: `${SITE_URL}/product/${product.id}`,
          offers: {
            "@type": "Offer",
            price,
            priceCurrency: "KRW",
            url: `${SITE_URL}/product/${product.id}`,
          },
        };
      }
    }

    return item;
  });

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: listName,
    url: `${SITE_URL}${routePath}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items,
    },
  };
}

// 조합 페이지들끼리 설명 문구가 판박이가 되지 않도록, 해당 조합 상품들의 tags 중
// 전체 상품 기준으로 너무 흔한(변별력 없는) 태그는 제외하고 이 조합에서 두드러지는 태그 1~2개를 고른다.
function pickDistinctiveTags(comboProducts, allProducts) {
  const totalCount = allProducts.length || 1;
  const globalCounts = new Map();
  allProducts.forEach((product) => {
    const seen = new Set(Array.isArray(product.tags) ? product.tags : []);
    seen.forEach((tag) => {
      const trimmed = String(tag || "").trim();
      if (!trimmed) return;
      globalCounts.set(trimmed, (globalCounts.get(trimmed) || 0) + 1);
    });
  });
  const genericTags = new Set(
    Array.from(globalCounts.entries())
      .filter(([, count]) => count / totalCount > 0.3)
      .map(([tag]) => tag),
  );

  const localCounts = new Map();
  comboProducts.forEach((product) => {
    (Array.isArray(product.tags) ? product.tags : []).forEach((tag) => {
      const trimmed = String(tag || "").trim();
      if (!trimmed || genericTags.has(trimmed)) return;
      localCounts.set(trimmed, (localCounts.get(trimmed) || 0) + 1);
    });
  });

  return Array.from(localCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([tag]) => tag);
}

const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 상품/링크의 마지막 갱신 시각. 사이트맵 lastmod에 쓴다 (없으면 null → 빌드일로 대체하지 않고 생략).
function productLastmod(product) {
  const stamps = (Array.isArray(product.partnerLinks) ? product.partnerLinks : [])
    .map((l) => l?.updatedAt)
    .filter((v) => typeof v === "string" && v);
  if (stamps.length === 0) return null;
  return stamps.sort().pop().slice(0, 10);
}

// JS를 실행하지 않는 크롤러(네이버 Yeti 등)가 볼 수 있도록 #root 안에 정적 본문을 넣는다.
// React가 마운트되면서 통째로 갈아끼우므로 사용자에게는 첫 페인트 잠깐만 보인다.
function buildStaticBody(meta) {
  const lines = [`<h1>${escapeHtml(meta.title.replace(/\s*\|\s*TourStream$/, ""))}</h1>`];
  // meta description은 상품 설명의 앞부분을 잘라 만든 것이라, 상품 설명을 아래에 그대로 싣는
  // 상품 페이지에서는 같은 문장이 두 번 나온다. 그 경우엔 생략한다.
  const descIsExcerpt = Boolean(meta.product && String(meta.product.description || '').trim());
  if (!descIsExcerpt) lines.push(`<p>${escapeHtml(meta.description)}</p>`);
  if (meta.product) {
    const p = meta.product;
    const price = resolvePrice(p);
    const locations = (Array.isArray(p.locations) ? p.locations : []).filter(Boolean);
    const categories = (Array.isArray(p.categories) ? p.categories : []).filter(Boolean);

    // 어디의 무슨 상품인지 - 상품마다 실제로 달라지는 정보라 중복 판정을 피하는 데 가장 중요
    const facts = [];
    if (locations.length > 0) facts.push(`${locations.slice().reverse().join(" ")} 여행 상품`);
    if (categories.length > 0) facts.push(`분류: ${categories.join(", ")}`);
    if (facts.length > 0) lines.push(`<p>${escapeHtml(facts.join(" · "))}</p>`);

    const descLines = String(p.description || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
      .filter(Boolean);
    if (descLines.length > 1) {
      lines.push(`<ul>${descLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`);
    } else if (descLines.length === 1) {
      lines.push(`<p>${escapeHtml(descLines[0].slice(0, 600))}</p>`);
    }
    const partners = (Array.isArray(p.partnerLinks) ? p.partnerLinks : []).filter((l) => l?.url);
    const priced = partners.filter((l) => Number(l.price) > 0);
    if (Number.isFinite(price)) {
      const range =
        priced.length >= 2
          ? `${Math.min(...priced.map((l) => Number(l.price))).toLocaleString("ko-KR")}원~${Math.max(...priced.map((l) => Number(l.price))).toLocaleString("ko-KR")}원`
          : `${price.toLocaleString("ko-KR")}원~`;
      lines.push(`<p>확인된 가격대는 ${escapeHtml(range)}이며, 표시 가격은 각 사이트의 최저 옵션가 기준입니다.</p>`);
    }

    const rating = Number(p.rating);
    const reviewCount = Number(p.reviewCount);
    if (Number.isFinite(rating) && rating > 0 && Number.isFinite(reviewCount) && reviewCount > 0) {
      lines.push(`<p>파트너사 이용자 평점 ${rating}점 / 후기 ${reviewCount.toLocaleString("ko-KR")}건.</p>`);
    }

    if (partners.length > 0) {
      lines.push(
        `<ul>${partners
          .map((l) => `<li>${escapeHtml(l.partner || "예약 사이트")}${Number(l.price) > 0 ? ` ${Number(l.price).toLocaleString("ko-KR")}원~` : " 판매처에서 가격 확인"}</li>`)
          .join("")}</ul>`,
      );
    }

    // 같은 지역/분류의 다른 상품으로 가는 내부 링크. 크롤러가 홈 밖으로 퍼져나갈 통로가 된다.
    const related = Array.isArray(meta.relatedProducts) ? meta.relatedProducts : [];
    if (related.length > 0) {
      lines.push(`<p>함께 비교되는 상품</p>`);
      lines.push(
        `<ul>${related
          .map((r) => {
            const rp = resolvePrice(r);
            return `<li><a href="/product/${escapeHtml(r.id)}">${escapeHtml(r.name)}</a>${
              Number.isFinite(rp) ? ` ${rp.toLocaleString("ko-KR")}원~` : ""
            }</li>`;
          })
          .join("")}</ul>`,
      );
    }
  }
  if (Array.isArray(meta.itemListProducts) && meta.itemListProducts.length > 0) {
    lines.push(
      `<ul>${meta.itemListProducts
        .slice(0, 100)
        .map((p) => {
          const price = resolvePrice(p);
          return `<li><a href="/product/${escapeHtml(p.id)}">${escapeHtml(p.name)}</a>${
            Number.isFinite(price) ? ` ${price.toLocaleString("ko-KR")}원~` : ""
          }</li>`;
        })
        .join("")}</ul>`,
    );
  }
  if (meta.guide) {
    const g = meta.guide;
    lines.push(`<h2>${escapeHtml(meta.guideTitle || "고르는 법")}</h2>`);
    lines.push(`<p>${escapeHtml(g.intro)}</p>`);
    (g.sections || []).forEach((section) => {
      lines.push(`<h3>${escapeHtml(section.heading)}</h3>`);
      lines.push(`<ul>${(section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    });
  }
  return `<main style="max-width:960px;margin:0 auto;padding:24px;font-family:sans-serif">${lines.join("")}</main>`;
}

// 상품 설명에 줄바꿈이나 &, " 가 그대로 들어있으면 meta 태그가 깨지거나 엔티티로 잘못 읽힌다.
// 설명이 "- 항목" 여러 줄이면 meta 태그에는 기호를 떼고 한 줄로 이어 붙인다.
const flattenBullets = (v) =>
  String(v ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean)
    .join(". ");

const metaText = (v) => escapeHtml(String(v ?? "").replace(/\s+/g, " ").trim());

function buildRouteHtml(baseHtml, meta) {
  let html = baseHtml;
  const title = metaText(meta.title);
  const description = metaText(meta.description);
  html = html.replace('<div id="root"></div>', `<div id="root">${buildStaticBody(meta)}</div>`);
  const canonicalUrl = `${SITE_URL}${meta.path}`;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  html = upsertTag(html, /<meta[^>]*name=["']description["'][^>]*>/i, `<meta name="description" content="${description}" />`);
  html = upsertTag(html, /<meta[^>]*property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}" />`);
  html = upsertTag(
    html,
    /<meta[^>]*property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${description}" />`,
  );
  html = upsertTag(html, /<meta[^>]*property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = upsertTag(html, /<meta[^>]*property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="${meta.ogType || "website"}" />`);
  html = upsertTag(html, /<meta[^>]*name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${title}" />`);
  html = upsertTag(
    html,
    /<meta[^>]*name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${description}" />`,
  );
  html = upsertTag(html, /<link[^>]*rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
  html = upsertTag(html, /<meta[^>]*name=["']robots["'][^>]*>/i, `<meta name="robots" content="${meta.robots || "index, follow"}" />`);

  // 상품 페이지에 Product JSON-LD 삽입 (크롤러용 - JS 렌더링 전에 보임)
  if (meta.product) {
    const jsonLd = buildProductJsonLd(meta.product);
    const scriptTag = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
    html = html.replace("</head>", `  ${scriptTag}\n</head>`);
  }

  // 목록 페이지(전체/인기/카테고리/국가/지역/목적지 조합)에 CollectionPage+ItemList JSON-LD 삽입
  if (Array.isArray(meta.itemListProducts) && meta.itemListProducts.length > 0) {
    const jsonLd = buildItemListJsonLd(meta.path, meta.itemListProducts, meta.title, {
      includeOffers: Boolean(meta.itemListIncludeOffers),
    });
    const scriptTag = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
    html = html.replace("</head>", `  ${scriptTag}\n</head>`);
  }

  return html;
}

async function fetchJson(pathname, fallback) {
  try {
    const response = await fetch(`${API_BASE_URL}${pathname}`);
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

async function main() {
  const baseHtml = await fs.readFile(indexPath, "utf8");
  // isAvailable(관리자의 "활성화" 토글)이 false인 상품은 공개 사이트/크롤러 모두에서 숨김
  const products = (await fetchJson("/products", [])).filter((p) => p.isAvailable !== false);
  const categoriesRes = await fetchJson("/categories", { mainCategories: [] });
  const locationsRes = await fetchJson("/locations", { countries: [] });

  const routes = [
    {
      path: "/",
      title: "일본·해외 입장권 교통패스 최저가 비교 | 클룩·마이리얼트립·KKday | TourStream",
      description: "오사카·도쿄 등 일본 여행 입장권부터 교통패스·전망대·테마파크까지, 클룩·마이리얼트립·KKday 가격을 한 번에 비교하고 최저가로 예약하세요.",
      ogType: "website",
      // 홈 정적 본문이 제목 한 줄뿐이면 크롤러가 따라갈 링크가 없다. 조회 상위 상품을 내보낸다.
      itemListProducts: (Array.isArray(products) ? [...products] : [])
        .sort((a, b) => (Number(b.recentViews7d) || Number(b.views) || 0) - (Number(a.recentViews7d) || Number(a.views) || 0))
        .slice(0, 24),
    },
    {
      path: "/products",
      title: "해외여행 입장권·교통패스 전체 상품 | TourStream",
      description: "일본·대만·싱가포르 등 해외여행 입장권, 교통패스, 전망대, 테마파크 상품을 한눈에. 클룩·마이리얼트립·KKday 등 제휴사별 최저가를 비교하세요.",
      ogType: "website",
      itemListProducts: Array.isArray(products) ? products : [],
    },
    {
      path: "/popular",
      title: "인기 해외여행 입장권·패스 TOP | TourStream",
      description: "지금 가장 많이 조회된 해외여행 입장권, 교통패스, 테마파크 인기 상품을 확인하고 클룩·마이리얼트립·KKday 최저가를 비교하세요.",
      ogType: "website",
      itemListProducts: (Array.isArray(products) ? [...products] : []).sort(
        (a, b) => (Number(b.recentViews7d) || Number(b.views) || 0) - (Number(a.recentViews7d) || Number(a.views) || 0),
      ),
    },
    {
      path: "/privacy",
      title: "개인정보처리방침 | TourStream",
      description: "TourStream의 개인정보 수집·이용 및 제휴사 링크 이동에 관한 안내입니다.",
      ogType: "website",
    },
    {
      path: "/terms",
      title: "이용약관 | TourStream",
      description: "TourStream 서비스 이용약관과 제휴사 예약에 관한 책임 범위를 안내합니다.",
      ogType: "website",
    },
    {
      // 찜 목록은 브라우저에 저장된 개인 데이터라 검색결과에 올릴 내용이 없다
      path: "/favorites",
      title: "찜한 상품 | TourStream",
      description: "저장해둔 여행 상품을 모아봅니다.",
      ogType: "website",
      robots: "noindex, follow",
    },
    {
      path: "/flights",
      title: "항공권 검색 | TourStream",
      description: "출발지와 도착지, 날짜를 입력하고 마이리얼트립 항공권 검색결과를 확인하세요.",
      ogType: "website",
    },
  ];

  for (const product of Array.isArray(products) ? products : []) {
    if (!product?.id) continue;
    const productName = product.name || "상품";
    const categories = Array.isArray(product.categories) ? product.categories[0] || "" : "";
    const locations = Array.isArray(product.locations) ? product.locations[0] || "" : "";
    const contextHint = [locations, categories].filter(Boolean).join(" ");
    const price = resolvePrice(product);
    const priceLabel = Number.isFinite(price) ? `${price.toLocaleString("ko-KR")}원` : null;
    const partnerCount = (Array.isArray(product.partnerLinks) ? product.partnerLinks : []).filter((l) => l?.url).length;

    // 검색결과에서 다른 플랫폼과 구별되도록, 있으면 실제 최저가를 제목/설명에 노출.
    // (구글이 description을 안 쓰고 본문에서 스니펫을 만들어가는 걸 막으려면 description 자체가 검색 의도와 더 잘 맞아야 함)
    const title = priceLabel ? `${productName} 최저가 ${priceLabel} | TourStream` : `${productName} 가격비교 | TourStream`;

    const baseDesc = product.description
      ? flattenBullets(product.description).slice(0, 90)
      : `${contextHint ? contextHint + " " : ""}${productName}`;
    const priceSentence = priceLabel
      ? ` 최저 ${priceLabel}부터${partnerCount >= 2 ? `, 파트너사 ${partnerCount}곳` : ""} 가격을 비교해보세요.`
      : " 여러 예약 사이트에서 최저가로 비교하세요.";

    // 연관 상품: 겹치는 지역이 많을수록(도쿄 > 일본) 먼저, 그다음 같은 분류.
    // locations 배열의 순서가 상품마다 [국가, 지역]/[지역, 국가]로 제각각이라 첫 항목만 보면
    // 도쿄 상품에 오사카 상품이 붙는다. 교집합 크기로 판단한다.
    const pool = Array.isArray(products) ? products : [];
    const myLocations = new Set((Array.isArray(product.locations) ? product.locations : []).filter(Boolean));
    const myCategories = new Set((Array.isArray(product.categories) ? product.categories : []).filter(Boolean));
    const relatedProducts = pool
      .filter((o) => String(o.id) !== String(product.id))
      .map((o) => {
        const locHit = (Array.isArray(o.locations) ? o.locations : []).filter((l) => myLocations.has(l)).length;
        const catHit = (Array.isArray(o.categories) ? o.categories : []).filter((c) => myCategories.has(c)).length;
        return { product: o, score: locHit * 10 + catHit };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.product);

    routes.push({
      path: `/product/${product.id}`,
      title,
      description: `${baseDesc}${priceSentence}`.slice(0, 155),
      ogType: "product",
      product, // JSON-LD 생성에 사용
      relatedProducts,
      lastmod: productLastmod(product),
      // 예약 링크가 하나도 없으면 사용자가 할 수 있는 게 없는 막다른 페이지라 색인에서 뺀다
      robots: partnerCount === 0 ? "noindex, follow" : "index, follow",
    });
  }

  const mainCategories = Array.isArray(categoriesRes?.mainCategories) ? categoriesRes.mainCategories : [];
  for (const category of mainCategories) {
    const categoryName = typeof category === "string" ? category : category?.name || "";
    const categoryId = typeof category === "string" ? "" : category?.id || "";
    if (!categoryName && !categoryId) continue;
    const slug = categorySlug(categoryName || categoryId);
    const categoryProducts = (Array.isArray(products) ? products : []).filter(
      (p) => Array.isArray(p.categories) && p.categories.includes(categoryName),
    );
    const minPrice = categoryProducts.length > 0 ? Math.min(...categoryProducts.map(resolvePrice)) : Infinity;
    const priceLabel = Number.isFinite(minPrice) ? `${minPrice.toLocaleString("ko-KR")}원` : null;

    routes.push({
      path: `/category/${slug}`,
      title: priceLabel
        ? `${categoryName || "카테고리"} 최저 ${priceLabel}부터 | 가격비교 TourStream`
        : `${categoryName || "카테고리"} 액티비티 가격비교 | TourStream`,
      description: `${categoryName || "카테고리"} 상품 ${categoryProducts.length}개${
        priceLabel ? `, 최저 ${priceLabel}부터` : ""
      } 비교하세요. 제휴사별 최저가 링크를 제공합니다.`,
      ogType: "website",
      itemListProducts: categoryProducts,
      // 화면(V2CategoryPage)이 필터 없는 카테고리 페이지에만 안내를 그리므로 셸도 동일하게 맞춘다
      guide: categoryGuides[categoryName],
      guideTitle: `${categoryName} 고르는 법`,
    });
  }

  const countries = Array.isArray(locationsRes?.countries) ? locationsRes.countries : [];
  const regions = Array.isArray(locationsRes?.regions) ? locationsRes.regions : [];

  for (const country of countries) {
    const countryName = typeof country === "string" ? country : country?.name || "";
    const countryId = typeof country === "string" ? "" : country?.id || "";
    if (!countryName && !countryId) continue;
    const slug = countrySlug(countryName || countryId);
    const countryProducts = (Array.isArray(products) ? products : []).filter(
      (p) => Array.isArray(p.locations) && p.locations.includes(countryName),
    );
    const countryMinPrice = countryProducts.length > 0 ? Math.min(...countryProducts.map(resolvePrice)) : Infinity;
    const countryPriceLabel = Number.isFinite(countryMinPrice) ? `${countryMinPrice.toLocaleString("ko-KR")}원` : null;

    routes.push({
      path: `/country/${slug}`,
      title: countryPriceLabel
        ? `${countryName || "국가"} 최저 ${countryPriceLabel}부터 | 가격비교 TourStream`
        : `${countryName || "국가"} 여행 액티비티·투어 가격비교 | TourStream`,
      description: `${countryName || "국가"} 상품 ${countryProducts.length}개${
        countryPriceLabel ? `, 최저 ${countryPriceLabel}부터` : ""
      } 비교하세요. KKday, Klook, 트립닷컴 등 제휴사 최저가 링크를 한눈에 확인할 수 있습니다.`,
      ogType: "website",
      itemListProducts: countryProducts,
    });

    // 지역(region) 라우트도 생성 - 실제 클라이언트 라우트는 /region/:slug (국가 하위 경로가 아님)
    const countryRegions = regions.filter((r) => {
      const rCountryId = typeof r === "string" ? "" : r?.countryId || "";
      const cId = typeof country === "string" ? "" : country?.id || "";
      return rCountryId && cId && rCountryId === cId;
    });
    for (const region of countryRegions) {
      const regionName = typeof region === "string" ? region : region?.name || "";
      if (!regionName) continue;
      const regionSlugValue = regionSlug(regionName);
      const regionProducts = (Array.isArray(products) ? products : []).filter(
        (p) => Array.isArray(p.locations) && p.locations.includes(regionName),
      );
      const regionMinPrice = regionProducts.length > 0 ? Math.min(...regionProducts.map(resolvePrice)) : Infinity;
      const regionPriceLabel = Number.isFinite(regionMinPrice) ? `${regionMinPrice.toLocaleString("ko-KR")}원` : null;

      routes.push({
        path: `/region/${regionSlugValue}`,
        title: regionPriceLabel
          ? `${regionName} 최저 ${regionPriceLabel}부터 | 가격비교 TourStream`
          : `${regionName} 여행 액티비티 가격비교 | TourStream`,
        description: `${countryName ? countryName + " " : ""}${regionName} 상품 ${regionProducts.length}개${
          regionPriceLabel ? `, 최저 ${regionPriceLabel}부터` : ""
        } 비교하세요. 제휴사별 최저가 링크를 제공합니다.`,
        ogType: "website",
        itemListProducts: regionProducts,
      });
    }
  }

  // 프로그래매틱 SEO 랜딩페이지: 지역 × 카테고리 조합. 실제 겹치는 상품이 1개 이상인 조합만 페이지를 만들고,
  // 3개 미만인 조합은 저품질 인덱싱을 막기 위해 noindex로 생성한다 (페이지 자체는 만들어서 내부링크는 살아있게 함).
  const MIN_PRODUCTS_TO_INDEX = 3;
  const allProducts = Array.isArray(products) ? products : [];
  for (const region of regions) {
    const regionName = typeof region === "string" ? region : region?.name || "";
    if (!regionName) continue;
    const regionSlugValue = regionSlug(regionName);

    for (const category of mainCategories) {
      const categoryName = typeof category === "string" ? category : category?.name || "";
      if (!categoryName) continue;
      const categorySlugValue = categorySlug(categoryName);

      const comboProducts = allProducts.filter(
        (p) => Array.isArray(p.locations) && p.locations.includes(regionName) && Array.isArray(p.categories) && p.categories.includes(categoryName),
      );
      if (comboProducts.length === 0) continue;

      const distinctiveTags = pickDistinctiveTags(comboProducts, allProducts);
      const comboMinPrice = Math.min(...comboProducts.map(resolvePrice));
      const comboPriceLabel = Number.isFinite(comboMinPrice) ? `${comboMinPrice.toLocaleString("ko-KR")}원` : null;
      const baseDesc = `${regionName} ${categoryName} 상품 ${comboProducts.length}개${
        comboPriceLabel ? `, 최저 ${comboPriceLabel}부터` : ""
      } 최저가순으로 비교하세요.`;
      const description =
        distinctiveTags.length > 0 ? `${baseDesc} ${distinctiveTags.join(", ")} 등 인기 옵션도 함께 확인할 수 있어요.` : baseDesc;

      routes.push({
        path: `/destination/${regionSlugValue}/${categorySlugValue}`,
        title: comboPriceLabel
          ? `${regionName} ${categoryName} 최저 ${comboPriceLabel}부터 | TourStream`
          : `${regionName} ${categoryName} 가격비교 | TourStream`,
        description,
        ogType: "website",
        robots: comboProducts.length < MIN_PRODUCTS_TO_INDEX ? "noindex, follow" : "index, follow",
        itemListProducts: [...comboProducts].sort((a, b) => resolvePrice(a) - resolvePrice(b)),
        itemListIncludeOffers: true,
      });
    }
  }

  // 목록 페이지의 lastmod는 소속 상품들 중 가장 최근 갱신일
  for (const route of routes) {
    if (route.lastmod) continue;
    const members = Array.isArray(route.itemListProducts) ? route.itemListProducts : [];
    const stamps = members.map(productLastmod).filter(Boolean).sort();
    if (stamps.length > 0) route.lastmod = stamps[stamps.length - 1];
  }

  // 상품이 하나도 없는 목록 페이지는 색인 대상에서 뺀다.
  // (빈 페이지를 사이트맵으로 제출하면 크롤링 예산만 쓰고 사이트 품질 평가에 불리하다.
  //  페이지 자체는 남겨서 사용자가 들어와도 깨지지 않게 한다.)
  for (const route of routes) {
    if (!Array.isArray(route.itemListProducts) || route.robots) continue;
    if (route.itemListProducts.length === 0) route.robots = "noindex, follow";
  }

  const deduped = new Map();
  let homeMeta = null;
  for (const route of routes) {
    if (!route.path) continue;
    if (route.path === "/") {
      homeMeta = route;
      continue;
    }
    deduped.set(route.path, route);
  }

  if (homeMeta) {
    await fs.writeFile(indexPath, buildRouteHtml(baseHtml, homeMeta), "utf8");
  }

  let written = 0;
  for (const route of deduped.values()) {
    const routePath = route.path.replace(/^\/+|\/+$/g, "");
    const targetDir = routePath ? path.join(buildDir, routePath) : buildDir;
    const target = path.join(targetDir, "index.html");
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(target, buildRouteHtml(baseHtml, route), "utf8");
    written += 1;
  }

  // 네이버 서치어드바이저는 다른 호스트(api.tourstream.kr)로 넘기는 sitemapindex를 따라가지 않으므로
  // tourstream.kr/sitemap.xml 자체를 실제 URL 목록으로 만든다 (noindex 페이지는 제외).
  // lastmod는 실제로 내용이 바뀐 날만 적는다. 매일 전체를 오늘 날짜로 찍으면
  // 검색엔진이 lastmod를 신뢰하지 않게 되고 크롤링 예산만 낭비된다.
  const sitemapEntries = [
    ...(homeMeta ? [{ path: "/", lastmod: homeMeta.lastmod }] : [{ path: "/", lastmod: null }]),
    ...Array.from(deduped.values())
      .filter((r) => !/noindex/.test(r.robots || ""))
      .map((r) => ({ path: r.path, lastmod: r.lastmod || null })),
  ];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries
    .map((e) => `  <url><loc>${SITE_URL}${e.path}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
  await fs.writeFile(path.join(buildDir, "sitemap.xml"), sitemapXml, "utf8");

  // 없는 주소 전용 404 페이지. CloudFront가 404 상태코드와 함께 내려준다.
  // React 번들을 넣지 않는다 - 넣으면 앱이 마운트되면서 주소에 맞는 빈 페이지로 바뀌어
  // 사용자에게는 깨진 화면처럼 보인다.
  const notFoundHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, follow" />
<title>페이지를 찾을 수 없습니다 | TourStream</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#0f172a;background:#fff}
  main{max-width:560px;margin:0 auto;padding:96px 24px;text-align:center}
  h1{font-size:22px;margin:0 0 12px}
  p{color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px}
  a{display:inline-block;margin:0 6px;padding:11px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px}
  .primary{background:#0F46D6;color:#fff}
  .ghost{border:1px solid #e2e8f0;color:#0f172a}
  .brand{font-weight:800;font-size:16px;color:#0F46D6;text-decoration:none;display:block;margin-bottom:40px}
</style>
</head>
<body>
<main>
  <a class="brand" href="/">TourStream</a>
  <h1>페이지를 찾을 수 없습니다</h1>
  <p>주소가 바뀌었거나 삭제된 페이지입니다.<br />아래에서 다시 찾아보세요.</p>
  <a class="primary" href="/products">전체 상품 보기</a>
  <a class="ghost" href="/">홈으로</a>
</main>
</body>
</html>
`;
  await fs.writeFile(path.join(buildDir, "404.html"), notFoundHtml, "utf8");

  console.log(`[seo-shell] generated ${written} route html files, sitemap ${sitemapEntries.length} urls`);
}

main().catch((error) => {
  console.error("[seo-shell] failed:", error);
  process.exit(1);
});
