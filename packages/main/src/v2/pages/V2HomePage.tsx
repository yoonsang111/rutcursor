import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { V2HomeHero } from "../components/V2HomeHero";
import { ProductListRow } from "../components/ProductListRow";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2HomePage() {
  const { items, categories, countries, loading } = useV2Products();
  const [selectedCountryId, setSelectedCountryId] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);

  const topCountries = useMemo(
    () =>
      countries
        .map((country) => ({ ...country, productCount: items.filter((item) => item.countryId === country.id).length }))
        .filter((country) => country.productCount > 0)
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 8),
    [countries, items],
  );

  const homeCategories = useMemo(
    () =>
      categories
        .map((category) => ({ ...category, productCount: items.filter((item) => item.categoryId === category.id).length }))
        .filter((category) => category.productCount > 0)
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 6),
    [categories, items],
  );

  const matchesFilters = (product: (typeof items)[number]) =>
    (selectedCountryId === "all" || product.countryId === selectedCountryId) &&
    (selectedCategoryId === "all" || product.categoryId === selectedCategoryId);

  const flaggedPopular = items.filter((p) => p.isPopular);
  const popularPool = flaggedPopular.length > 0 ? flaggedPopular : items;
  const popularProducts = popularPool
    .filter(matchesFilters)
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views)
    .slice(0, 8);

  const recommendedProducts = items
    .filter((p) => p.isRecommended)
    .filter(matchesFilters)
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views)
    .slice(0, 8);

  const trending = popularPool
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views)
    .slice(0, 4)
    .map((p) => p.name);

  useV2Seo({
    title: "TourStream - 여행 상품 가격 비교",
    description: "국가/지역/카테고리별 여행 상품을 비교하고 최저가 파트너를 확인하세요.",
    canonicalPath: "/",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "TourStream",
        url: "https://tourstream.kr/",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: "https://tourstream.kr/" }],
      },
    ],
  });

  return (
    <div className="flex flex-col w-full max-w-[1080px] mx-auto">
      <V2HomeHero trending={trending} />

      <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center px-6 pt-5 pb-4 border-b border-slate-100">
        <button
          onClick={() => setSelectedCountryId("all")}
          className={`pb-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
            selectedCountryId === "all" ? "text-slate-900 border-brand" : "text-slate-400 border-transparent hover:text-slate-600"
          }`}
        >
          전체
        </button>
        {topCountries.map((country) => (
          <button
            key={country.id}
            onClick={() => setSelectedCountryId(country.id)}
            className={`pb-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
              selectedCountryId === country.id ? "text-slate-900 border-brand" : "text-slate-400 border-transparent hover:text-slate-600"
            }`}
          >
            {country.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center px-6 py-4">
        <button
          onClick={() => setSelectedCategoryId("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
            selectedCategoryId === "all" ? "bg-brand-tint text-brand" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          전체
        </button>
        {homeCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategoryId(category.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              selectedCategoryId === category.id ? "bg-brand-tint text-brand" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <section className="px-6 pt-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">인기 상품</h2>
            <span className="text-[11px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">HOT</span>
          </div>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-7 h-7 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : popularProducts.length === 0 ? (
          <div className="py-8 text-sm text-slate-400">선택하신 국가/카테고리에 해당하는 인기 상품이 아직 없습니다.</div>
        ) : (
          <div className="flex flex-col">
            {popularProducts.map((product, idx) => (
              <ProductListRow key={product.id} product={product} countryName={countryNameById.get(product.countryId)} rank={idx + 1} />
            ))}
          </div>
        )}
      </section>

      <section className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">추천 상품</h2>
            <span className="text-[11px] font-extrabold text-brand bg-brand-tint px-2 py-0.5 rounded-full">에디터 픽</span>
          </div>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-7 h-7 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recommendedProducts.length === 0 ? (
          <div className="py-8 text-sm text-slate-400">선택하신 국가/카테고리에 해당하는 추천 상품이 아직 없습니다.</div>
        ) : (
          <div className="flex flex-col">
            {recommendedProducts.map((product) => (
              <ProductListRow key={product.id} product={product} countryName={countryNameById.get(product.countryId)} />
            ))}
          </div>
        )}
      </section>

      <div className="px-6 pt-2 pb-10 flex justify-center">
        <Link to="/products" className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-brand transition-colors">
          전체 상품 보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
