import { Category, Country } from "../data";

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

export function getCountrySlug(country: Country) {
  return toEnglishSlug(country.englishName || country.name);
}

export function getCategorySlug(category: Category) {
  return toEnglishSlug(category.name);
}

export function getRegionSlug(regionName: string) {
  return toEnglishSlug(regionName);
}

export function findCountryBySlug(countries: Country[], slug?: string | null) {
  const normalized = (slug || "").trim().toLowerCase();
  if (!normalized) return undefined;
  return countries.find((country) => {
    const byName = getCountrySlug(country) === normalized;
    const byId = (country.id || "").trim().toLowerCase() === normalized;
    const byRawName = (country.name || "").trim().toLowerCase() === normalized;
    const byEnglishName = (country.englishName || "").trim().toLowerCase() === normalized;
    return byName || byId || byRawName || byEnglishName;
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
      return bySlug || byRawName;
    });
    if (region) return region;
  }

  return undefined;
}
