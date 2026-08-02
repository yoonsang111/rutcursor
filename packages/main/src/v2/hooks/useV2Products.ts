import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../utils/api";
import { Category, Country, Product } from "../data";

type RawPartnerLink = {
  partner?: string;
  url?: string;
  source?: string;
  price?: number | string;
  priceDisplay?: string;
};

type RawProduct = {
  id?: string;
  name?: string;
  description?: string;
  categories?: string[];
  locations?: string[];
  partnerLinks?: RawPartnerLink[];
  images?: string[];
  price?: number | string;
  minPrice?: number | string;
  salePrice?: number | string;
  rating?: number | string;
  reviewCount?: number | string;
  views?: number;
  recentViews7d?: number | string;
  recentViews30d?: number | string;
  isRecommended?: boolean;
  [key: string]: any;
};

type RawMainCategory = {
  id?: string;
  name?: string;
};

type RawSubCategory = {
  id?: string;
  name?: string;
  mainCategoryId?: string;
};

type RawCategoriesResponse = {
  mainCategories?: RawMainCategory[];
  subCategories?: RawSubCategory[];
};

type RawCountry = {
  id?: string;
  name?: string;
  image?: string;
};

type RawRegion = {
  id?: string;
  name?: string;
  countryId?: string;
  image?: string;
};

type RawLocationsResponse = {
  countries?: RawCountry[];
  regions?: RawRegion[];
};

type CachedV2Data = {
  items: Product[];
  categories: Category[];
  countries: Country[];
  regionImageByKey: Record<string, string>;
};

const COUNTRY_IMAGE_MAP: Record<string, string> = {
  일본: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  프랑스: "https://images.unsplash.com/photo-1431274172761-fca41d930114?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  태국: "https://images.unsplash.com/photo-1528181304800-259b08848526?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  베트남: "https://images.unsplash.com/photo-1528127269322-539801943592?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  한국: "https://images.unsplash.com/photo-1538485399081-7191377e8241?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  대만: "https://images.unsplash.com/photo-1531581141141-1f88f63a9dbf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  홍콩: "https://images.unsplash.com/photo-1506973035872-a4f23ef7b97e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  싱가포르: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  미국: "https://images.unsplash.com/photo-1491557345352-5929e343eb89?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  이탈리아: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
};
const COUNTRY_ENGLISH_MAP: Record<string, string> = {
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
const COUNTRY_NAME_CANDIDATES = new Set([
  "일본",
  "프랑스",
  "태국",
  "베트남",
  "한국",
  "대만",
  "홍콩",
  "싱가포르",
  "미국",
  "이탈리아",
  "중국",
  "마카오",
]);

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";
const DEFAULT_COUNTRY_IMAGE =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

let cachedData: CachedV2Data | null = null;
let inflightPromise: Promise<CachedV2Data> | null = null;

function normalizeName(value?: string) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function slugify(value?: string) {
  const source = (value || "").trim().toLowerCase();
  const cleaned = source
    .normalize("NFKC")
    .replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  if (cleaned) return cleaned;
  if (source) return `id-${hashString(source)}`;
  return "unknown";
}

function inferCategoryIconName(name: string) {
  if (name.includes("티켓") || name.includes("패스")) return "Ticket";
  if (name.includes("투어")) return "Map";
  if (name.includes("액티비티")) return "PersonStanding";
  if (name.includes("해양") || name.includes("수중")) return "Waves";
  if (name.includes("클래스")) return "BookOpen";
  if (name.includes("스파") || name.includes("마사지")) return "Flower2";
  return "Tag";
}

function buildCategories(raw: RawCategoriesResponse): {
  categories: Category[];
  mainNameToId: Map<string, string>;
  subNameToMainId: Map<string, string>;
} {
  const mains = Array.isArray(raw.mainCategories) ? raw.mainCategories : [];
  const subs = Array.isArray(raw.subCategories) ? raw.subCategories : [];

  const categories: Category[] = mains
    .filter((main) => (main.name || "").trim() !== "")
    .map((main) => {
      const id = (main.id || "").trim() || slugify(main.name);
      const name = (main.name || "").trim() || "미분류";
      return { id, name, iconName: inferCategoryIconName(name) };
    });

  const mainNameToId = new Map<string, string>();
  categories.forEach((cat) => mainNameToId.set(normalizeName(cat.name), cat.id));

  const subNameToMainId = new Map<string, string>();
  subs.forEach((sub) => {
    const subName = normalizeName(sub.name);
    if (!subName) return;
    const mappedMainId = (sub.mainCategoryId || "").trim();
    if (mappedMainId) subNameToMainId.set(subName, mappedMainId);
  });

  return { categories, mainNameToId, subNameToMainId };
}

function deriveCategoriesFromProducts(products: RawProduct[]) {
  const counts = new Map<string, number>();
  products.forEach((product) => {
    const categories = Array.isArray(product.categories) ? product.categories : [];
    categories.forEach((category) => {
      const name = String(category || "").trim();
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => ({
      id: slugify(name),
      name,
      iconName: inferCategoryIconName(name),
    })) satisfies Category[];
}

function buildCountries(raw: RawLocationsResponse): {
  countries: Country[];
  countryNameToId: Map<string, string>;
  regionNameToCountryId: Map<string, string>;
  regionsByCountryId: Map<string, string[]>;
  regionImageByKey: Record<string, string>;
} {
  const rawCountries = Array.isArray(raw.countries) ? raw.countries : [];
  const rawRegions = Array.isArray(raw.regions) ? raw.regions : [];

  const countries: Country[] = rawCountries
    .filter((country) => (country.name || "").trim() !== "")
    .map((country) => {
      const name = (country.name || "").trim();
      const id = (country.id || "").trim() || slugify(name);
      const regions = rawRegions
        .filter((region) => ((region.countryId || "").trim() || "") === id)
        .map((region) => (region.name || "").trim())
        .filter(Boolean);

      return {
        id,
        name,
        englishName: COUNTRY_ENGLISH_MAP[name] || name,
        image: (country.image || "").trim() || COUNTRY_IMAGE_MAP[name] || DEFAULT_COUNTRY_IMAGE,
        regionCount: regions.length,
        productCount: 0,
        regions,
      };
    });

  const countryNameToId = new Map<string, string>();
  countries.forEach((country) => countryNameToId.set(normalizeName(country.name), country.id));

  const regionNameToCountryId = new Map<string, string>();
  rawRegions.forEach((region) => {
    const regionName = normalizeName(region.name);
    if (!regionName) return;
    const countryId = (region.countryId || "").trim();
    if (countryId) regionNameToCountryId.set(regionName, countryId);
  });

  const regionsByCountryId = new Map<string, string[]>();
  countries.forEach((country) => {
    regionsByCountryId.set(country.id, country.regions);
  });

  const regionImageByKey: Record<string, string> = {};
  rawRegions.forEach((region) => {
    const countryId = (region.countryId || "").trim();
    const regionName = (region.name || "").trim();
    const regionImage = (region.image || "").trim();
    if (!countryId || !regionName || !regionImage) return;
    regionImageByKey[`${countryId}::${normalizeName(regionName)}`] = regionImage;
  });

  return { countries, countryNameToId, regionNameToCountryId, regionsByCountryId, regionImageByKey };
}

function deriveCountriesFromProducts(products: RawProduct[]) {
  const regionsByCountry = new Map<string, Set<string>>();
  const countryOrder: string[] = [];

  products.forEach((product) => {
    const locations = (Array.isArray(product.locations) ? product.locations : []).map((loc) => String(loc || "").trim()).filter(Boolean);
    if (locations.length === 0) return;

    let countryName = locations[0];
    if (!COUNTRY_NAME_CANDIDATES.has(countryName)) {
      const foundCountry = locations.find((loc) => COUNTRY_NAME_CANDIDATES.has(loc));
      if (foundCountry) countryName = foundCountry;
    }

    if (!regionsByCountry.has(countryName)) {
      regionsByCountry.set(countryName, new Set());
      countryOrder.push(countryName);
    }

    const countryRegions = regionsByCountry.get(countryName)!;
    locations
      .filter((loc) => loc !== countryName)
      .forEach((region) => countryRegions.add(region));
  });

  return countryOrder.map((countryName) => {
    const id = slugify(countryName);
    const regions = Array.from(regionsByCountry.get(countryName) || []);
    return {
      id,
      name: countryName,
      englishName: COUNTRY_ENGLISH_MAP[countryName] || countryName,
      image: COUNTRY_IMAGE_MAP[countryName] || DEFAULT_COUNTRY_IMAGE,
      regionCount: regions.length,
      productCount: 0,
      regions,
    };
  }) satisfies Country[];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function inferPrice(raw: RawProduct): number {
  const candidates = [raw.minPrice, raw.salePrice, raw.price];
  for (const candidate of candidates) {
    const parsed = toNumber(candidate);
    if (parsed !== null && parsed > 0) return parsed;
  }
  return 0;
}

function inferImage(raw: RawProduct): string {
  if (Array.isArray(raw.images)) {
    const found = raw.images.find((img) => typeof img === "string" && img.trim() !== "");
    if (found) return found;
  }
  if (typeof raw.image === "string" && raw.image.trim() !== "") return raw.image;
  return DEFAULT_IMAGE;
}

function inferPartners(raw: RawProduct, fallbackUrl: string) {
  const links = Array.isArray(raw.partnerLinks) ? raw.partnerLinks : [];
  const partners = links
    .map((link) => {
      const url = typeof link.url === "string" ? link.url.trim() : "";
      const price = toNumber(link.price);
      return {
        name: (link.partner || "").trim() || "파트너",
        url,
        price: price !== null && price > 0 ? price : undefined,
        priceDisplay: typeof link.priceDisplay === "string" && link.priceDisplay.trim() ? link.priceDisplay.trim() : undefined,
      };
    })
    .filter((p) => p.url !== "");

  if (partners.length === 0) return [{ name: "공식 링크", url: fallbackUrl }];

  // 가격 정보가 있는 파트너끼리는 실제 최저가 순으로, 가격을 모르는 파트너는 뒤로 (배지 없이 "바로가기"만)
  const priced = partners.filter((p) => p.price !== undefined).sort((a, b) => a.price! - b.price!);
  const unpriced = partners.filter((p) => p.price === undefined);
  return [...priced, ...unpriced];
}

function inferPartnerMinPrice(links: RawPartnerLink[] | undefined): number | null {
  if (!Array.isArray(links)) return null;
  const prices = links
    .map((link) => toNumber(link.price))
    .filter((price): price is number => price !== null && price > 0);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

function dedupeProducts(items: Product[]) {
  const bestByKey = new Map<string, Product>();

  items.forEach((item) => {
    const key = [
      normalizeName(item.name),
      normalizeName(item.categoryId),
      normalizeName(item.countryId),
      normalizeName(item.region),
      normalizeName(item.partnerLinks[0]?.url || item.url),
    ].join("|");

    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, item);
      return;
    }

    const itemScore = Number(item.popularityScore || 0);
    const existingScore = Number(existing.popularityScore || 0);
    if (itemScore > existingScore || (itemScore === existingScore && item.views > existing.views)) {
      bestByKey.set(key, item);
    }
  });

  return Array.from(bestByKey.values());
}

function inferCategoryId(
  categories: string[],
  mainNameToId: Map<string, string>,
  subNameToMainId: Map<string, string>,
  fallbackCategoryId: string,
) {
  for (const category of categories) {
    const normalized = normalizeName(category);
    if (!normalized) continue;
    if (mainNameToId.has(normalized)) return mainNameToId.get(normalized)!;
    if (subNameToMainId.has(normalized)) return subNameToMainId.get(normalized)!;
  }
  return fallbackCategoryId;
}

function inferCountryId(
  locations: string[],
  countryNameToId: Map<string, string>,
  regionNameToCountryId: Map<string, string>,
  fallbackCountryId: string,
) {
  for (const location of locations) {
    const normalized = normalizeName(location);
    if (!normalized) continue;
    if (countryNameToId.has(normalized)) return countryNameToId.get(normalized)!;
    if (regionNameToCountryId.has(normalized)) return regionNameToCountryId.get(normalized)!;
  }
  return fallbackCountryId;
}

function inferRegion(locations: string[], countryId: string, regionsByCountryId: Map<string, string[]>) {
  const regions = regionsByCountryId.get(countryId) || [];
  for (const location of locations) {
    if (regions.includes(location)) return location;
  }
  if (regions.length > 0) return regions[0];
  return locations.find((loc) => (loc || "").trim() !== "") || "미정";
}

function toV2Product(
  raw: RawProduct,
  mainNameToId: Map<string, string>,
  subNameToMainId: Map<string, string>,
  fallbackCategoryId: string,
  countryNameToId: Map<string, string>,
  regionNameToCountryId: Map<string, string>,
  fallbackCountryId: string,
  regionsByCountryId: Map<string, string[]>,
): Product {
  const id = String(raw.id || `p-${Math.random().toString(36).slice(2, 9)}`);
  const locations = (Array.isArray(raw.locations) ? raw.locations : []).map((loc) => String(loc || "").trim()).filter(Boolean);
  const categories = (Array.isArray(raw.categories) ? raw.categories : []).map((cat) => String(cat || "").trim()).filter(Boolean);
  const fallbackUrl = raw.partnerLinks?.[0]?.url || "https://tourstream.kr";
  const countryId = inferCountryId(locations, countryNameToId, regionNameToCountryId, fallbackCountryId);
  const categoryId = inferCategoryId(categories, mainNameToId, subNameToMainId, fallbackCategoryId);
  const views = Math.max(0, Number(raw.views || 0));
  const recentViews7d = Math.max(0, Number(raw.recentViews7d || 0));
  const recentViews30d = Math.max(0, Number(raw.recentViews30d || 0));
  const popularityScore = views + recentViews30d * 3 + recentViews7d * 5;

  return {
    id,
    name: raw.name || "이름 없는 상품",
    description: raw.description || "상품 설명이 없습니다.",
    countryId,
    region: inferRegion(locations, countryId, regionsByCountryId),
    categoryId,
    price: inferPartnerMinPrice(raw.partnerLinks) ?? inferPrice(raw),
    views,
    recentViews7d,
    recentViews30d,
    popularityScore,
    rating: Math.max(0, toNumber(raw.rating) || 0),
    reviews: Math.max(0, toNumber(raw.reviewCount) || 0),
    image: inferImage(raw),
    url: fallbackUrl,
    partnerLinks: inferPartners(raw, fallbackUrl),
    isPopular: popularityScore >= 20 || Boolean(raw.isRecommended),
    isRecommended: Boolean(raw.isRecommended),
  };
}

export function useV2Products() {
  const [items, setItems] = useState<Product[]>(cachedData?.items || []);
  const [categories, setCategories] = useState<Category[]>(cachedData?.categories || []);
  const [countries, setCountries] = useState<Country[]>(cachedData?.countries || []);
  const [regionImageByKey, setRegionImageByKey] = useState<Record<string, string>>(cachedData?.regionImageByKey || {});
  const [loading, setLoading] = useState(!cachedData);

  const incrementProductView = useCallback(async (id: string) => {
    const result = await api.incrementProductView(id);
    const nextViews = Math.max(0, Number(result?.views || 0));
    const nextRecent7d = Math.max(0, Number(result?.recentViews7d || 0));
    const nextRecent30d = Math.max(0, Number(result?.recentViews30d || 0));
    const nextPopularity = nextViews + nextRecent30d * 3 + nextRecent7d * 5;
    if (!nextViews) return;

    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id
          ? {
              ...item,
              views: nextViews,
              recentViews7d: nextRecent7d,
              recentViews30d: nextRecent30d,
              popularityScore: nextPopularity,
              isPopular: item.isRecommended || nextPopularity >= 20,
            }
          : item,
      );
      if (cachedData) {
        cachedData = { ...cachedData, items: updated };
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    let active = true;
    const runFetch = async () => {
      const [productsResult, categoriesResult, locationsResult] = await Promise.allSettled([
        api.getProducts(),
        api.getCategories(),
        api.getLocations(),
      ]);

      const rawProducts =
        productsResult.status === "fulfilled" && Array.isArray(productsResult.value) ? (productsResult.value as RawProduct[]) : [];

      const rawCategories =
        categoriesResult.status === "fulfilled"
          ? (categoriesResult.value as RawCategoriesResponse)
          : ({ mainCategories: [], subCategories: [] } as RawCategoriesResponse);

      const rawLocations =
        locationsResult.status === "fulfilled"
          ? (locationsResult.value as RawLocationsResponse)
          : ({ countries: [], regions: [] } as RawLocationsResponse);

      const { categories, mainNameToId, subNameToMainId } = buildCategories(rawCategories);
      const { countries, countryNameToId, regionNameToCountryId, regionsByCountryId, regionImageByKey } = buildCountries(rawLocations);

      const finalCategories = categories.length > 0 ? categories : deriveCategoriesFromProducts(rawProducts);
      const finalCountries = countries.length > 0 ? countries : deriveCountriesFromProducts(rawProducts);

      const finalMainNameToId =
        categories.length > 0
          ? mainNameToId
          : new Map<string, string>(finalCategories.map((category) => [normalizeName(category.name), category.id]));

      const finalCountryNameToId =
        countries.length > 0
          ? countryNameToId
          : new Map<string, string>(finalCountries.map((country) => [normalizeName(country.name), country.id]));

      const finalRegionNameToCountryId =
        countries.length > 0
          ? regionNameToCountryId
          : new Map<string, string>(
              finalCountries.flatMap((country) => country.regions.map((region) => [normalizeName(region), country.id] as [string, string])),
            );

      const finalRegionsByCountryId =
        countries.length > 0
          ? regionsByCountryId
          : new Map<string, string[]>(finalCountries.map((country) => [country.id, country.regions]));

      const fallbackCategoryId = finalCategories[0]?.id || "uncategorized";
      const fallbackCountryId = finalCountries[0]?.id || "unknown-country";

      const mappedItems = rawProducts.map((raw) =>
        toV2Product(
          raw,
          finalMainNameToId,
          subNameToMainId,
          fallbackCategoryId,
          finalCountryNameToId,
          finalRegionNameToCountryId,
          fallbackCountryId,
          finalRegionsByCountryId,
        ),
      );

      const adminProductCountByCountryId = mappedItems.reduce((acc, item) => {
        acc.set(item.countryId, (acc.get(item.countryId) || 0) + 1);
        return acc;
      }, new Map<string, number>());

      const items = dedupeProducts(mappedItems);
      const countriesWithCounts = finalCountries.map((country) => ({
        ...country,
        productCount: adminProductCountByCountryId.get(country.id) || 0,
      }));

      return { items, categories: finalCategories, countries: countriesWithCounts, regionImageByKey } satisfies CachedV2Data;
    };

    const load = async () => {
      if (cachedData) {
        if (active) {
          setItems(cachedData.items);
          setCategories(cachedData.categories);
          setCountries(cachedData.countries);
          setRegionImageByKey(cachedData.regionImageByKey);
          setLoading(false);
        }
        return;
      }

      if (!inflightPromise) {
        inflightPromise = runFetch().then((result) => {
          cachedData = result;
          inflightPromise = null;
          return result;
        });
      }

      const loaded = await inflightPromise;
      if (!active) return;
      setItems(loaded.items);
      setCategories(loaded.categories);
      setCountries(loaded.countries);
      setRegionImageByKey(loaded.regionImageByKey);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const byId = useMemo(() => {
    const map = new Map<string, Product>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((item) => map.set(item.id, item));
    return map;
  }, [categories]);

  const countryById = useMemo(() => {
    const map = new Map<string, Country>();
    countries.forEach((item) => map.set(item.id, item));
    return map;
  }, [countries]);

  const getRegionImage = (countryId: string | undefined, regionName: string | undefined) => {
    if (!regionName) return undefined;
    const normalizedRegion = normalizeName(regionName);
    if (!normalizedRegion) return undefined;

    if (countryId) {
      const directKey = `${countryId}::${normalizedRegion}`;
      if (regionImageByKey[directKey]) return regionImageByKey[directKey];
    }

    for (const country of countries) {
      const key = `${country.id}::${normalizedRegion}`;
      if (regionImageByKey[key]) return regionImageByKey[key];
    }
    return undefined;
  };

  return { items, byId, categories, countries, categoryById, countryById, getRegionImage, incrementProductView, loading };
}
