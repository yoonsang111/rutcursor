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

function buildProductJsonLd(product) {
  const productPrice = product.price ?? product.minPrice ?? product.salePrice ?? null;
  const safePrice = (productPrice != null && Number(productPrice) > 0) ? productPrice : 0;
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

  // 상품 페이지에 Product JSON-LD 삽입 (크롤러용 - JS 렌더링 전에 보임)
  if (meta.product) {
    const jsonLd = buildProductJsonLd(meta.product);
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
  const products = await fetchJson("/products", []);
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
    },
    {
      path: "/popular",
      title: "인기 여행 액티비티·투어 TOP | TourStream",
      description: "지금 가장 많이 조회된 여행 액티비티, 투어, 입장권 인기 상품을 확인하세요. 실시간 인기 순위 기준으로 정렬됩니다.",
      ogType: "website",
    },
  ];

  for (const product of Array.isArray(products) ? products : []) {
    if (!product?.id) continue;
    const productName = product.name || "상품";
    const categories = Array.isArray(product.categories) ? product.categories[0] || "" : "";
    const locations = Array.isArray(product.locations) ? product.locations[0] || "" : "";
    const contextHint = [locations, categories].filter(Boolean).join(" ");
    const baseDesc = product.description
      ? product.description.slice(0, 120)
      : `${contextHint ? contextHint + " " : ""}${productName}을 여러 예약 사이트에서 최저가로 비교하세요.`;
    routes.push({
      path: `/product/${product.id}`,
      title: `${productName} 가격비교 | TourStream`,
      description: baseDesc.slice(0, 140),
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
    routes.push({
      path: `/category/${slug}`,
      title: `${categoryName || "카테고리"} 액티비티 가격비교 | TourStream`,
      description: `${categoryName || "카테고리"} 관련 국내·해외여행 액티비티와 투어 상품을 한눈에 비교하세요. KKday, Klook 등 제휴사 최저가 링크를 제공합니다.`,
      ogType: "website",
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
    routes.push({
      path: `/country/${slug}`,
      title: `${countryName || "국가"} 여행 액티비티·투어 가격비교 | TourStream`,
      description: `${countryName || "국가"} 여행 액티비티, 투어, 입장권을 최저가로 비교하세요. KKday, Klook, 트립닷컴 등 제휴사 최저가 링크를 한눈에 확인할 수 있습니다.`,
      ogType: "website",
    });

    // 지역(region) 라우트도 생성
    const countryRegions = regions.filter((r) => {
      const rCountryId = typeof r === "string" ? "" : r?.countryId || "";
      const cId = typeof country === "string" ? "" : country?.id || "";
      return rCountryId && cId && rCountryId === cId;
    });
    for (const region of countryRegions) {
      const regionName = typeof region === "string" ? region : region?.name || "";
      if (!regionName) continue;
      const regionSlug = toSlug(regionName);
      routes.push({
        path: `/country/${slug}/${regionSlug}`,
        title: `${regionName} 여행 액티비티 가격비교 | TourStream`,
        description: `${countryName ? countryName + " " : ""}${regionName} 여행 액티비티, 투어, 입장권 가격을 비교하세요. 제휴사별 최저가 링크를 제공합니다.`,
        ogType: "website",
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
