import React from "react";
import { useParams, Link } from "react-router-dom";
import { ProductBrowser } from "../components/ProductBrowser";
import { ListPageSkeleton } from "../components/ListPageSkeleton";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import { findCategoryBySlug, findRegionNameBySlug, getCategorySlug, getRegionSlug } from "../utils/urlSlugs";

const MIN_PRODUCTS_TO_INDEX = 3;

export default function V2DestinationPage() {
  const { region: regionSlug, category: categorySlug } = useParams<{ region: string; category: string }>();
  const { items, countries, categories, getRegionImage, loading } = useV2Products();
  const countryNameById = React.useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);

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

  const priceLabel = products.length > 0 && products[0].price > 0 ? `${products[0].price.toLocaleString("ko-KR")}원` : null;
  const title = priceLabel
    ? `${regionName || "지역"} ${category?.name || "카테고리"} ${priceLabel}부터 | TourStream`
    : `${regionName || "지역"} ${category?.name || "카테고리"} 가격비교 | TourStream`;
  const description = React.useMemo(() => {
    const base = `${regionName || "지역"} ${category?.name || "카테고리"} 상품 ${products.length}개${
      priceLabel ? `, ${priceLabel}부터` : ""
    } 가격 낮은 순으로 비교하세요.`;
    const distinctiveTags = pickDistinctiveTags(products);
    if (distinctiveTags.length === 0) return base;
    return `${base} ${distinctiveTags.join(", ")} 등 인기 옵션도 함께 확인할 수 있어요.`;
  }, [regionName, category, products, priceLabel]);

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
  // 종류 이름을 아직 모르는 동안은 빈 제목 대신 자리맡기를 보여 준다
  if (!category && loading) return <ListPageSkeleton />;

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16 px-5 md:px-6">
      <section className="pt-5 pb-4">
        <nav className="text-[12.5px] text-slate-400">
          <Link to="/" className="hover:text-brand transition-colors">홈</Link> &rsaquo; {regionName || "지역"} &rsaquo; {category?.name || "카테고리"}
        </nav>
        <h1 className="mt-1.5 text-[24px] md:text-[30px] font-bold tracking-[-0.04em] text-slate-900">
          {regionName} {category?.name}
        </h1>
        <p className="mt-1.5 text-[13px] md:text-sm text-slate-400">
          상품 <b className="font-bold text-slate-900">{products.length.toLocaleString("ko-KR")}</b>개 · 가격 낮은 순
        </p>
      </section>

      <div className="-mx-5 md:-mx-6">
        <ProductBrowser
          products={products}
          categories={categories}
          countryNameById={countryNameById}
          searchPlaceholder={`${regionName} ${category?.name ?? ""} 안에서 검색`}
          hideFilters={["category"]}
          emptyText="이 조합의 상품이 아직 없습니다."
        />
      </div>

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
