import React, { useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ProductListRow } from "../components/ProductListRow";
import { useV2Products } from "../hooks/useV2Products";
import * as Icons from "lucide-react";
import { useV2Seo } from "../hooks/useV2Seo";
import { findCountryBySlug, getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";

export default function V2CountryPage() {
  const { id: countrySlug } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, countries, categories } = useV2Products();
  const [keyword, setKeyword] = useState("");
  const country = findCountryBySlug(countries, countrySlug);
  const rawRegionParam = (searchParams.get("region") || "").trim().toLowerCase();
  const selectedRegion =
    !country || !rawRegionParam || rawRegionParam === "all"
      ? "all"
      : country.regions.find((region) => {
          const bySlug = getRegionSlug(region) === rawRegionParam;
          const byRawName = region.trim().toLowerCase() === rawRegionParam;
          return bySlug || byRawName;
        }) || "all";
  const countryProducts = items.filter((p) => p.countryId === country?.id);
  const countryCategories = categories.filter((category) =>
    countryProducts.some((product) => product.categoryId === category.id),
  );

  const filteredProducts = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const list = countryProducts.filter((product) => {
      const regionMatch = selectedRegion === "all" || product.region === selectedRegion;
      if (!regionMatch) return false;
      if (!q) return true;
      return product.name.toLowerCase().includes(q) || product.description.toLowerCase().includes(q) || product.region.toLowerCase().includes(q);
    });

    return list.sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views);
  }, [countryProducts, keyword, selectedRegion]);

  const popularProducts = filteredProducts.filter((product) => product.isPopular);
  const safeCountryName = country?.name || "국가";
  const canonicalPath = `/country/${country ? getCountrySlug(country) : countrySlug || ""}${
    selectedRegion !== "all" ? `?region=${encodeURIComponent(getRegionSlug(selectedRegion))}` : ""
  }`;

  const setRegionFilter = (region: string) => {
    const next = new URLSearchParams(searchParams);
    if (region === "all") {
      next.delete("region");
    } else {
      next.set("region", getRegionSlug(region));
    }
    setSearchParams(next, { replace: true });
  };

  const countryMinPrice = filteredProducts.length > 0 ? Math.min(...filteredProducts.map((p) => p.price || Infinity)) : Infinity;
  const countryPriceLabel = Number.isFinite(countryMinPrice) ? `${countryMinPrice.toLocaleString("ko-KR")}원` : null;

  useV2Seo({
    title: countryPriceLabel
      ? `${safeCountryName} 최저 ${countryPriceLabel}부터 | 가격비교 TourStream`
      : `${safeCountryName} 여행 상품 | TourStream`,
    description: `${safeCountryName} 상품 ${filteredProducts.length}개${
      countryPriceLabel ? `, 최저 ${countryPriceLabel}부터` : ""
    } 비교해보세요.`,
    canonicalPath,
    ogType: "website",
    ogImage: country?.image,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${safeCountryName} 여행 상품`,
        url: `https://tourstream.kr${canonicalPath}`,
      },
    ],
  });

  if (!country) return <div className="p-8 text-center font-bold text-xl mt-20">국가를 찾을 수 없습니다.</div>;

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden pb-20">
      <section className="px-6 py-6 md:py-10">
        <div className="w-full bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 flex flex-col">
          <div className="relative w-full h-[240px] md:h-[320px] shrink-0">
            <img src={country.image} alt={country.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-md pb-2">{country.name}</h1>
              <div className="text-white/80 text-sm">등록 상품 {country.productCount}개 / {country.regionCount}개 도시</div>
            </div>
          </div>

          <div className="p-5 md:p-8 flex flex-col gap-6 w-full relative z-20">
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500 transition-all shadow-inner">
              <div className="pl-4 pr-2 shrink-0">
                <Icons.Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={`${country.name} 인기 투어, 티켓 검색`}
                className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 py-3.5 outline-none font-medium text-sm md:text-base min-w-0"
              />
              <div className="p-1.5 shrink-0">
                <button className="bg-slate-900 hover:bg-slate-800 text-white w-10 h-10 md:w-auto md:px-6 rounded-xl font-bold text-sm flex items-center justify-center transition-colors shadow-sm whitespace-nowrap">
                  <span className="hidden md:inline">검색</span>
                  <Icons.Search className="w-4 h-4 md:hidden" />
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-400 mb-3">주요 도시 탐색</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setRegionFilter("all")}
                    className={`px-4 py-2 rounded-full font-bold text-xs shadow-md whitespace-nowrap ${
                      selectedRegion === "all" ? "bg-slate-900 text-white shadow-slate-900/10" : "bg-white border border-slate-200 text-slate-700"
                    }`}
                  >
                    전체보기
                  </button>
                  {country.regions.map((region) => (
                    <button
                      key={region}
                      onClick={() => setRegionFilter(region)}
                      className={`px-4 py-2 rounded-full font-medium text-xs transition-colors whitespace-nowrap ${
                        selectedRegion === region
                          ? "bg-cyan-600 text-white"
                          : "border border-slate-200 bg-white hover:border-cyan-500 hover:text-cyan-600"
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px bg-slate-100 hidden md:block" />

              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-400 mb-3">카테고리 탐색</h3>
                <div className="flex flex-wrap gap-2">
                  {countryCategories.map((cat) => {
                    const IconComponent = Icons[cat.iconName as keyof typeof Icons] as React.ElementType;
                    return (
                      <Link
                        to={`/category/${getCategorySlug(cat)}?country=${getCountrySlug(country)}`}
                        key={cat.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        {IconComponent && <IconComponent className="w-3.5 h-3.5 text-slate-500" />}
                        <span className="text-xs font-medium text-slate-700">{cat.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {popularProducts.length > 0 && (
        <section className="px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight">
              <span className="text-cyan-600">{country.name}</span> 인기 특가
            </h2>
          </div>
          <div className="flex flex-col rounded-2xl border border-slate-100 px-4 md:px-6">
            {popularProducts.map((p, idx) => (
              <ProductListRow key={p.id} product={p} countryName={country.name} rank={idx + 1} />
            ))}
          </div>
        </section>
      )}

      <section className="px-6 py-8 bg-slate-50 rounded-3xl mx-6 mb-8">
        <h2 className="text-xl font-bold mb-2 px-2">전체 상품</h2>
        <div className="font-bold text-sm text-slate-900 mb-6 px-2">
          총 <span className="text-brand">{filteredProducts.length}</span>개의 상품
        </div>
        <div className="flex flex-col rounded-2xl bg-white border border-slate-100 px-4 md:px-6">
          {filteredProducts.map((p) => (
            <ProductListRow key={p.id} product={p} countryName={country.name} />
          ))}
        </div>
        {filteredProducts.length === 0 && <div className="text-sm text-slate-500 px-2 mt-4">검색/필터 조건에 맞는 상품이 없습니다.</div>}
      </section>
    </div>
  );
}
