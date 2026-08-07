import React from "react";
import { useParams, Link } from "react-router-dom";
import { ProductListRow } from "../components/ProductListRow";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import { findCategoryBySlug, findRegionNameBySlug, getCategorySlug, getRegionSlug } from "../utils/urlSlugs";

const MIN_PRODUCTS_TO_INDEX = 3;

export default function V2DestinationPage() {
  const { region: regionSlug, category: categorySlug } = useParams<{ region: string; category: string }>();
  const { items, countries, categories, getRegionImage } = useV2Products();

  const regionName = findRegionNameBySlug(countries, regionSlug);
  const category = findCategoryBySlug(categories, categorySlug);
  const resolvedCountry = countries.find((c) => c.regions.some((r) => getRegionSlug(r) === getRegionSlug(regionName || regionSlug || "")));

  const products = React.useMemo(() => {
    if (!regionName || !category) return [];
    return items
      .filter((p) => p.region === regionName && p.categoryId === category.id)
      .sort((a, b) => a.price - b.price);
  }, [items, regionName, category]);

  const heroImage = getRegionImage(resolvedCountry?.id, regionName || undefined) || products[0]?.image;
  const canonicalPath = `/destination/${getRegionSlug(regionName || regionSlug || "")}/${category ? getCategorySlug(category) : categorySlug || ""}`;

  const relatedCategories = React.useMemo(() => {
    if (!regionName) return [];
    return categories.filter((c) => c.id !== category?.id && items.some((p) => p.region === regionName && p.categoryId === c.id));
  }, [categories, items, regionName, category]);

  const relatedRegions = React.useMemo(() => {
    if (!category) return [];
    const names = new Set<string>();
    items.forEach((p) => {
      if (p.categoryId === category.id && p.region !== regionName) names.add(p.region);
    });
    return Array.from(names);
  }, [items, category, regionName]);

  const title = `${regionName || "지역"} ${category?.name || "카테고리"} 가격비교 | TourStream`;
  const description = React.useMemo(() => {
    const base = `${regionName || "지역"} ${category?.name || "카테고리"} 상품 ${products.length}개를 최저가순으로 비교하세요.`;
    const distinctiveTags = pickDistinctiveTags(products);
    if (distinctiveTags.length === 0) return base;
    return `${base} ${distinctiveTags.join(", ")} 등 인기 옵션도 함께 확인할 수 있어요.`;
  }, [regionName, category, products]);

  useV2Seo({
    title,
    description,
    canonicalPath,
    ogType: "website",
    ogImage: heroImage,
    robots: products.length < MIN_PRODUCTS_TO_INDEX ? "noindex, follow" : "index, follow",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        url: `https://tourstream.kr${canonicalPath}`,
      },
    ],
  });

  if (!regionSlug || !categorySlug) {
    return <div className="p-8 text-center font-bold text-xl mt-20">잘못된 경로입니다.</div>;
  }

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden pb-20 px-6">
      <section className="py-6 md:py-10">
        <div className="relative w-full h-[240px] md:h-[320px] rounded-3xl overflow-hidden shadow-sm bg-slate-800">
          {heroImage && <img src={heroImage} alt={`${regionName} ${category?.name}`} className="w-full h-full object-cover opacity-60" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 text-white">
            <div className="text-cyan-300 font-bold mb-2">{regionName || "지역"}</div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{category?.name || "카테고리"}</h1>
          </div>
        </div>
      </section>

      <section className="pb-4">
        <div className="font-bold text-sm text-slate-900">
          총 <span className="text-brand">{products.length}</span>개의 상품 · 최저가순
        </div>
      </section>

      <section className="pb-8">
        <div className="flex flex-col rounded-2xl border border-slate-100 px-4 md:px-6">
          {products.map((p) => (
            <ProductListRow key={p.id} product={p} countryName={resolvedCountry?.name} />
          ))}
        </div>
        {products.length === 0 && <div className="text-sm text-slate-500">해당 조합의 상품이 아직 없습니다.</div>}
      </section>

      {(relatedCategories.length > 0 || relatedRegions.length > 0) && (
        <section className="pb-8 space-y-4">
          {relatedCategories.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2">{regionName}의 다른 카테고리</div>
              <div className="flex flex-wrap gap-2">
                {relatedCategories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/destination/${getRegionSlug(regionName || "")}/${getCategorySlug(c)}`}
                    className="px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {relatedRegions.length > 0 && category && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2">{category.name}이(가) 가능한 다른 지역</div>
              <div className="flex flex-wrap gap-2">
                {relatedRegions.map((r) => (
                  <Link
                    key={r}
                    to={`/destination/${getRegionSlug(r)}/${getCategorySlug(category)}`}
                    className="px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700"
                  >
                    {r}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// 조합 내 상품들의 태그 중, 전체 상품에서 너무 흔하게(30% 이상) 등장해 변별력 없는 태그는 제외하고
// 이 조합에서 특히 자주 나오는 태그 1~2개를 골라 설명 문구를 조합마다 다르게 만든다.
function pickDistinctiveTags(products: Array<{ tags?: string[] }>): string[] {
  if (products.length === 0) return [];
  const counts = new Map<string, number>();
  products.forEach((p) => {
    (p.tags || []).forEach((tag) => {
      const trimmed = (tag || "").trim();
      if (!trimmed) return;
      counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([tag]) => tag);
}
