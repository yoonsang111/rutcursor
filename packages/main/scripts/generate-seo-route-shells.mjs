import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.resolve(__dirname, "..", "build");
const indexPath = path.join(buildDir, "index.html");

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://api.tourstream.kr/api";
const SITE_URL = "https://tourstream.kr";

const COUNTRY_ENGLISH_MAP = {
  일본: "Japan",
  프랑스: "France",
  태국: "Thailand",
  베트남: "Vietnam",
  한국: "Korea",
  대만: "Taiwan",
  홍콩: "Hong Kong",
  싱가포르: "Singapore",
  미국: "United States",
  이탈리아: "Italy",
};

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

function buildRouteHtml(baseHtml, meta) {
  let html = baseHtml;
  const canonicalUrl = `${SITE_URL}${meta.path}`;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${meta.title}</title>`);
  html = upsertTag(html, /<meta[^>]*name=["']description["'][^>]*>/i, `<meta name="description" content="${meta.description}" />`);
  html = upsertTag(html, /<meta[^>]*property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${meta.title}" />`);
  html = upsertTag(
    html,
    /<meta[^>]*property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${meta.description}" />`,
  );
  html = upsertTag(html, /<meta[^>]*property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = upsertTag(html, /<meta[^>]*property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="${meta.ogType || "website"}" />`);
  html = upsertTag(html, /<meta[^>]*name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${meta.title}" />`);
  html = upsertTag(
    html,
    /<meta[^>]*name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${meta.description}" />`,
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
      title: "국내여행, 해외여행 액티비티·입장권 가격비교 | TourStream",
      description: "국내여행·해외여행 액티비티, 투어, 패스, 입장권 가격을 한 번에 비교하세요. 제휴사별 최저가 링크와 인기 상품을 빠르게 확인할 수 있습니다.",
      ogType: "website",
    },
    {
      path: "/products",
      title: "여행 액티비티·투어·입장권 전체 상품 | TourStream",
      description: "국내·해외여행 액티비티, 투어, 패스, 입장권 전체 상품 목록을 확인하세요. KKday, Klook, 트립닷컴 등 제휴사별 최저가 링크를 비교할 수 있습니다.",
      ogType: "website",
      itemListProducts: Array.isArray(products) ? products : [],
    },
    {
      path: "/popular",
      title: "인기 여행 액티비티·투어 TOP | TourStream",
      description: "지금 가장 많이 조회된 여행 액티비티, 투어, 입장권 인기 상품을 확인하세요. 실시간 인기 순위 기준으로 정렬됩니다.",
      ogType: "website",
      itemListProducts: (Array.isArray(products) ? [...products] : []).sort(
        (a, b) => (Number(b.recentViews7d) || Number(b.views) || 0) - (Number(a.recentViews7d) || Number(a.views) || 0),
      ),
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
      ? product.description.slice(0, 90)
      : `${contextHint ? contextHint + " " : ""}${productName}`;
    const priceSentence = priceLabel
      ? ` 최저 ${priceLabel}부터${partnerCount >= 2 ? `, 파트너사 ${partnerCount}곳` : ""} 가격을 비교해보세요.`
      : " 여러 예약 사이트에서 최저가로 비교하세요.";

    routes.push({
      path: `/product/${product.id}`,
      title,
      description: `${baseDesc}${priceSentence}`.slice(0, 155),
      ogType: "product",
      product, // JSON-LD 생성에 사용
    });
  }

  const mainCategories = Array.isArray(categoriesRes?.mainCategories) ? categoriesRes.mainCategories : [];
  for (const category of mainCategories) {
    const categoryName = typeof category === "string" ? category : category?.name || "";
    const categoryId = typeof category === "string" ? "" : category?.id || "";
    if (!categoryName && !categoryId) continue;
    const slug = toSlug(categoryName || categoryId);
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
    });
  }

  const countries = Array.isArray(locationsRes?.countries) ? locationsRes.countries : [];
  const regions = Array.isArray(locationsRes?.regions) ? locationsRes.regions : [];

  for (const country of countries) {
    const countryName = typeof country === "string" ? country : country?.name || "";
    const countryId = typeof country === "string" ? "" : country?.id || "";
    if (!countryName && !countryId) continue;
    const englishName = COUNTRY_ENGLISH_MAP[countryName] || countryName || countryId;
    const slug = toSlug(englishName);
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
      const regionSlug = toSlug(regionName);
      const regionProducts = (Array.isArray(products) ? products : []).filter(
        (p) => Array.isArray(p.locations) && p.locations.includes(regionName),
      );
      const regionMinPrice = regionProducts.length > 0 ? Math.min(...regionProducts.map(resolvePrice)) : Infinity;
      const regionPriceLabel = Number.isFinite(regionMinPrice) ? `${regionMinPrice.toLocaleString("ko-KR")}원` : null;

      routes.push({
        path: `/region/${regionSlug}`,
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
    const regionSlug = toSlug(regionName);

    for (const category of mainCategories) {
      const categoryName = typeof category === "string" ? category : category?.name || "";
      if (!categoryName) continue;
      const categorySlug = toSlug(categoryName);

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
        path: `/destination/${regionSlug}/${categorySlug}`,
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

  console.log(`[seo-shell] generated ${written} route html files`);
}

main().catch((error) => {
  console.error("[seo-shell] failed:", error);
  process.exit(1);
});
