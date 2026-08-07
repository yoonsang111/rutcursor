import React from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ProductListRow } from "../components/ProductListRow";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import { findCountryBySlug, findRegionNameBySlug, getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";

export default function V2RegionPage() {
  const { name: regionSlug } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const countrySlug = searchParams.get("country");
  const { items, countries, categories, getRegionImage } = useV2Products();
  const country = findCountryBySlug(countries, countrySlug);
  const resolvedRegionName = findRegionNameBySlug(countries, regionSlug, countrySlug);
  const fallbackRegionName = (regionSlug || "").trim();
  const safeRegionName = resolvedRegionName || fallbackRegionName || "지역";
  const resolvedCountry =
    country || countries.find((c) => c.regions.some((region) => getRegionSlug(region) === getRegionSlug(safeRegionName)));

  const regionProducts = items.filter((p) => p.region === safeRegionName);
  const regionCategories = categories.filter((category) => regionProducts.some((product) => product.categoryId === category.id));
  const regionHeroImage = getRegionImage(resolvedCountry?.id, safeRegionName) || regionProducts[0]?.image;
  const canonicalPath = `/region/${getRegionSlug(safeRegionName)}${resolvedCountry ? `?country=${encodeURIComponent(getCountrySlug(resolvedCountry))}` : ""}`;

  useV2Seo({
    title: `${safeRegionName} 지역 여행 상품 | TourStream`,
    description: `${safeRegionName} 지역의 여행 상품 ${regionProducts.length}개를 확인해보세요.`,
    canonicalPath,
    ogType: "website",
    ogImage: regionHeroImage,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${safeRegionName} 지역 여행 상품`,
        url: `https://tourstream.kr${canonicalPath}`,
      },
    ],
  });

  if (!regionSlug) return <div className="p-8 text-center font-bold text-xl mt-20">지역을 찾을 수 없습니다.</div>;

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden pb-20 px-6">
      <section className="py-6 md:py-10">
        <div className="relative w-full h-[240px] md:h-[320px] rounded-3xl overflow-hidden shadow-sm bg-slate-800">
          {regionHeroImage && <img src={regionHeroImage} alt={safeRegionName} className="w-full h-full object-cover opacity-60" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 text-white">
            <div className="text-cyan-300 font-bold mb-2">{resolvedCountry?.name}</div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{safeRegionName}</h1>
          </div>
        </div>
      </section>

      <section className="pb-6">
        <div className="flex flex-wrap gap-2">
          {regionCategories.map((cat) => (
            <Link key={cat.id} to={`/destination/${getRegionSlug(safeRegionName)}/${getCategorySlug(cat)}`} className="px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700">
              {cat.name}
            </Link>
          ))}
          {regionCategories.length === 0 && <div className="text-xs text-slate-500">해당 지역에 연결된 카테고리가 없습니다.</div>}
        </div>
      </section>

      <section className="pb-8">
        <div className="flex flex-col rounded-2xl border border-slate-100 px-4 md:px-6">
          {regionProducts.map((p) => (
            <ProductListRow key={p.id} product={p} countryName={resolvedCountry?.name} />
          ))}
        </div>
        {regionProducts.length === 0 && <div className="text-sm text-slate-500">해당 지역의 상품이 아직 없습니다.</div>}
      </section>
    </div>
  );
}
