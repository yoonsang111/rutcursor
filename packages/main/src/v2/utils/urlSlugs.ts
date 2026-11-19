import { Category, Country } from "../data";
import slugMap from "../data/slugMap.json";

// 로마자 자동변환(gyotong-paeseu)을 쓰기 좋은 영어 슬러그로 대체하는 표.
// 크롤러용 셸 생성기도 같은 파일을 읽으므로 두 곳이 어긋나지 않는다.
const SLUG_MAP = slugMap as unknown as {
  categories: Record<string, string>;
  countries: Record<string, string>;
  regions: Record<string, string>;
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
const T_TABLE = [
  "",
  "k",
  "k",
  "ks",
  "n",
  "nj",
  "nh",
  "t",
  "l",
  "lk",
  "lm",
  "lb",
  "ls",
  "lt",
  "lp",
  "lh",
  "m",
  "p",
  "ps",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "h",
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function romanizeKorean(text: string) {
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

export function toEnglishSlug(value?: string) {
  const source = (value || "").trim();
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

  if (cleaned) return cleaned;
  return `item-${hashString(source).slice(0, 6)}`;
}

/*
  주소에 쓸 영어 이름은 세 군데서 차례로 찾는다.

  1) 관리자에 입력한 englishName  ← 앞으로 여기만 쓴다
  2) slugMap.json                ← 1번 칸이 없던 시절에 손으로 적어 둔 것. 옮기는 중이라 남겨 둔다
  3) 한글을 소리나는 대로 옮기기    ← 최후의 수단. /region/sseuchwan 같은 주소가 나오므로 쓰면 안 된다

  3번까지 내려가면 그 페이지는 사이트맵에 올리지 않는다 (generate-seo-route-shells.mjs 참고).
*/

/** 지역 이름 → 관리자에 입력한 영어 이름. 자료를 불러올 때 채운다 (useV2Products) */
const regionEnglishNames = new Map<string, string>();

export function registerRegionEnglishNames(pairs: Array<[string, string]>) {
  pairs.forEach(([name, english]) => {
    const cleaned = toEnglishSlug(english);
    if (name && cleaned && cleaned !== "item") regionEnglishNames.set(name, cleaned);
  });
}

export function getCountrySlug(country: Country) {
  return toEnglishSlug(country.englishName || "") !== "item" && country.englishName
    ? toEnglishSlug(country.englishName)
    : SLUG_MAP.countries[country.name] || toEnglishSlug(country.name);
}

export function getCategorySlug(category: Category) {
  return SLUG_MAP.categories[category.name] || toEnglishSlug(category.name);
}

export function getRegionSlug(regionName: string) {
  return regionEnglishNames.get(regionName) || SLUG_MAP.regions[regionName] || toEnglishSlug(regionName);
}

/** 이 이름이 제대로 된 영어 주소를 가지고 있나 (소리나는 대로 옮긴 게 아니라) */
export function hasRealSlug(kind: "country" | "region", name: string, englishName?: string): boolean {
  if (englishName && englishName.trim()) return true;
  return Boolean(kind === "country" ? SLUG_MAP.countries[name] : SLUG_MAP.regions[name]);
}

export function findCountryBySlug(countries: Country[], slug?: string | null) {
  const normalized = (slug || "").trim().toLowerCase();
  if (!normalized) return undefined;
  return countries.find((country) => {
    const byName = getCountrySlug(country) === normalized;
    const byId = (country.id || "").trim().toLowerCase() === normalized;
    const byRawName = (country.name || "").trim().toLowerCase() === normalized;
    const byEnglishName = (country.englishName || "").trim().toLowerCase() === normalized;
    // 영어 이름을 지도에 적기 전 쓰던 옛 주소(/country/dokil = 독일)도 계속 받아준다
    const byLegacySlug = toEnglishSlug(country.englishName || country.name) === normalized;
    return byName || byId || byRawName || byEnglishName || byLegacySlug;
  });
}

export function findCategoryBySlug(categories: Category[], slug?: string | null) {
  const normalized = (slug || "").trim().toLowerCase();
  if (!normalized) return undefined;
  return categories.find((category) => {
    const byName = getCategorySlug(category) === normalized;
    const byId = (category.id || "").trim().toLowerCase() === normalized;
    const byRawName = (category.name || "").trim().toLowerCase() === normalized;
    return byName || byId || byRawName;
  });
}

export function findRegionNameBySlug(countries: Country[], regionSlug?: string | null, countrySlug?: string | null) {
  const normalizedRegion = (regionSlug || "").trim().toLowerCase();
  if (!normalizedRegion) return undefined;

  const country = findCountryBySlug(countries, countrySlug);
  const candidates = country ? [country] : countries;

  for (const item of candidates) {
    const region = item.regions.find((regionName) => {
      const bySlug = getRegionSlug(regionName) === normalizedRegion;
      const byRawName = (regionName || "").trim().toLowerCase() === normalizedRegion;
      /*
        옛 주소도 계속 받아준다.
        지역 이름을 영어로 바로 적기 전에는 한글을 소리나는 대로 옮긴 주소(/region/bereulrin = 베를린)를
        썼고, 그게 이미 사이트맵에 올라가 검색엔진에 수집됐다. 끊으면 그 주소들이 전부 404가 된다.
        화면은 그대로 띄우고 canonical 만 새 주소를 가리키게 해서 검색엔진이 알아서 합치게 둔다.
      */
      const byLegacySlug = toEnglishSlug(regionName) === normalizedRegion;
      return bySlug || byRawName || byLegacySlug;
    });
    if (region) return region;
  }

  return undefined;
}
