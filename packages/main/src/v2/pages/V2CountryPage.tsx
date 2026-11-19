import React, { useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ProductBrowser } from "../components/ProductBrowser";
import { ListPageSkeleton } from "../components/ListPageSkeleton";
import { FilterPills } from "../components/ListToolbar";
import { flagSrc } from "../brand";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import V2NotFoundPage from "./V2NotFoundPage";
import { findCountryBySlug, getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";

export default function V2CountryPage() {
  const { id: countrySlug } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, countries, categories, loading } = useV2Products();
  const country = findCountryBySlug(countries, countrySlug);
  const countryNameById = useMemo(() => new Map(countries.map((c) => [c.id, c.name])), [countries]);
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

  const filteredProducts = useMemo(
    () => countryProducts.filter((product) => selectedRegion === "all" || product.region === selectedRegion),
    [countryProducts, selectedRegion],
  );

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

  // 없는 주소면 제목·canonical 도 404 로 바꾼다. 안 그러면 이 화면의 값이 나중에 덮어쓴다.
  const notFound = !loading && !country;

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
      title: countryPriceLabel
        ? `${safeCountryName} 최저 ${countryPriceLabel}부터 | 가격비교 TourStream`
        : `${safeCountryName} 여행 상품 | TourStream`,
      description: `${safeCountryName} 상품 ${filteredProducts.length}개${
        countryPriceLabel ? `, 최저 ${countryPriceLabel}부터` : ""
      } 비교해보세요.`,
      canonicalPath,
      ogType: "website",
      ogImage: country?.image,
      // 없는 국가이거나 상품이 0개면 soft 404로 잡히므로 noindex
      robots: !loading && (!country || filteredProducts.length === 0) ? "noindex, follow" : "index, follow",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${safeCountryName} 여행 상품`,
          url: `https://tourstream.kr${canonicalPath}`,
        },
      ],
    }
  );

  // 자료가 오기 전에는 "없습니다"가 아니라 자리맡기를 보여 준다
  if (!country) return loading ? <ListPageSkeleton /> : <V2NotFoundPage />;

  const flag = flagSrc(country.name);
  const regionPills = [
    { key: "all", label: "전체" },
    ...country.regions.map((region) => ({ key: region, label: region })),
  ];

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16">
      <section className="px-5 md:px-6 pt-5 pb-4">
        <nav className="text-[12.5px] text-slate-400">
          <Link to="/" className="hover:text-brand transition-colors">홈</Link> &rsaquo; {country.name}
        </nav>
        <div className="mt-1.5 flex items-center gap-2.5">
          {flag && (
            <span className="block w-[44px] h-[30px] md:w-[52px] md:h-[35px] rounded-lg border border-black/[.07] overflow-hidden flex-none">
              <img src={flag} alt="" width={52} height={35} className="w-full h-full object-cover" />
            </span>
          )}
          <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.04em] text-slate-900">{country.name}</h1>
        </div>

        <div className="mt-4">
          <FilterPills options={regionPills} selected={selectedRegion} onSelect={setRegionFilter} />
        </div>

        {countryCategories.length > 0 && (
          <div className="mt-2.5 flex gap-2 overflow-x-auto hide-scrollbar">
            {countryCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${getCategorySlug(cat)}?country=${getCountrySlug(country)}`}
                className="flex-none h-8 px-3.5 inline-flex items-center rounded-full border border-slate-200 text-[13px] font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <ProductBrowser
        products={filteredProducts}
        categories={categories}
        countryNameById={countryNameById}
        searchPlaceholder={`${country.name} 안에서 검색`}
        loading={loading}
      />
    </div>
  );
}
