import React, { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProductBrowser } from "../components/ProductBrowser";
import { ListPageSkeleton } from "../components/ListPageSkeleton";
import { FilterPills } from "../components/ListToolbar";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import V2NotFoundPage from "./V2NotFoundPage";
import { findCategoryBySlug, findCountryBySlug, findRegionNameBySlug, getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";
import categoryGuides from "../data/categoryGuides.json";

// 크롤러용 정적 셸(generate-seo-route-shells.mjs)도 같은 파일을 읽는다.
// 화면과 셸 내용이 달라지면 클로킹으로 보일 수 있으므로 반드시 한 곳에서만 관리한다.
type CategoryGuide = { intro: string; sections: Array<{ heading: string; items: string[] }> };
const guides = categoryGuides as unknown as Record<string, CategoryGuide>;

export default function V2CategoryPage() {
  const { id: categorySlug } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const countrySlug = searchParams.get("country");
  const regionSlug = searchParams.get("region");
  const [searchTerm, setSearchTerm] = useState("");
  const { items, categories, countries, loading } = useV2Products();
  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);

  const category = findCategoryBySlug(categories, categorySlug);
  const selectedCountry = findCountryBySlug(countries, countrySlug);
  const regionName = findRegionNameBySlug(countries, regionSlug, countrySlug);
  const safeCategoryName = category?.name || "카테고리";
  const safeCategoryId = category?.id || "";

  // 이 카테고리에 상품이 있는 나라만 알약으로 보여 준다 (빈 알약을 누르게 하지 않는다)
  const countryPills = useMemo(() => {
    const inCategory = items.filter((p) => p.categoryId === safeCategoryId);
    const countById = new Map<string, number>();
    inCategory.forEach((p) => countById.set(p.countryId, (countById.get(p.countryId) || 0) + 1));
    return [
      { key: "all", label: "전체" },
      ...countries
        .filter((c) => (countById.get(c.id) || 0) > 0)
        .sort((a, b) => (countById.get(b.id) || 0) - (countById.get(a.id) || 0))
        .map((c) => ({ key: getCountrySlug(c), label: c.name })),
    ];
  }, [items, countries, safeCategoryId]);

  const selectCountry = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("country");
    else next.set("country", key);
    setSearchParams(next, { replace: true });
  };

  let filteredProducts = items.filter((p) => p.categoryId === safeCategoryId);
  if (selectedCountry) filteredProducts = filteredProducts.filter((p) => p.countryId === selectedCountry.id);
  if (regionName) filteredProducts = filteredProducts.filter((p) => p.region === regionName);
  // 지역으로 필터링된 경우, /destination/:region/:category 가 정규 URL이므로 그쪽을 canonical로 지정해
  // 두 URL이 같은 상품 목록을 보여주는 중복 콘텐츠로 잡히지 않도록 한다.
  const canonicalPath = regionName
    ? `/destination/${getRegionSlug(regionName)}/${category ? getCategorySlug(category) : categorySlug || ""}`
    : `/category/${category ? getCategorySlug(category) : categorySlug || ""}${
        selectedCountry ? `?country=${encodeURIComponent(getCountrySlug(selectedCountry))}` : ""
      }`;

  // 카테고리 전체를 볼 때만 안내를 노출한다 (국가/지역/검색 필터가 걸리면 문맥이 달라짐)
  const guide = !selectedCountry && !regionName && !searchTerm ? guides[safeCategoryName] : undefined;

  const categoryMinPrice = filteredProducts.length > 0 ? Math.min(...filteredProducts.map((p) => p.price || Infinity)) : Infinity;
  const categoryPriceLabel = Number.isFinite(categoryMinPrice) ? `${categoryMinPrice.toLocaleString("ko-KR")}원` : null;

  // 없는 주소면 제목·canonical 도 404 로 바꾼다. 안 그러면 이 화면의 값이 나중에 덮어쓴다.
  const notFound = !loading && !category;

  useV2Seo(
    notFound
      ? {
          title: "페이지를 찾을 수 없습니다 | TourStream",
          description: "요청하신 페이지를 찾을 수 없습니다.",
          canonicalPath: "/404",
          ogType: "website",
          robots: "noindex, follow",
        }
      :{
      title: categoryPriceLabel
        ? `${safeCategoryName} 최저 ${categoryPriceLabel}부터 | 가격비교 TourStream`
        : `${safeCategoryName} 카테고리 | TourStream`,
      description: `${safeCategoryName} 상품 ${filteredProducts.length}개${
        categoryPriceLabel ? `, 최저 ${categoryPriceLabel}부터` : ""
      } 비교해보세요.`,
      canonicalPath,
      ogType: "website",
      ogImage: filteredProducts[0]?.image,
      // 없는 카테고리이거나 상품이 0개면 soft 404로 잡히므로 noindex
      robots: !loading && (!category || filteredProducts.length === 0) ? "noindex, follow" : "index, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${safeCategoryName} 카테고리`,
          url: `https://tourstream.kr${canonicalPath}`,
        },
      ],
    }
  );

  if (!category) return loading ? <ListPageSkeleton /> : <V2NotFoundPage />;

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16">
      <section className="px-5 md:px-6 pt-5 pb-4">
        <nav className="text-[12.5px] text-slate-400">
          <Link to="/" className="hover:text-brand transition-colors">홈</Link> &rsaquo; 카테고리 &rsaquo; {category.name}
        </nav>
        <h1 className="mt-1.5 text-[24px] md:text-[30px] font-bold tracking-[-0.04em] text-slate-900">
          {category.name}
          {regionName && <span className="ml-2 text-[16px] md:text-[20px] font-medium text-slate-400">{regionName}</span>}
        </h1>
        {!regionName && (
          <div className="mt-4">
            <FilterPills options={countryPills} selected={countrySlug || "all"} onSelect={selectCountry} />
          </div>
        )}
      </section>

      <ProductBrowser
        products={filteredProducts}
        categories={categories}
        countryNameById={countryNameById}
        searchPlaceholder={`'${category.name}' 안에서 검색`}
        hideFilters={["category"]}
        loading={loading}
      />

      {guide && (
        <section className="px-5 md:px-6 mt-10 pt-8 border-t border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-3">{safeCategoryName} 고르는 법</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">{guide.intro}</p>
          {guide.sections.map((section) => (
            <div key={section.heading} className="mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-2">{section.heading}</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="text-sm text-slate-600 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
