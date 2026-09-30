import React, { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ProductListRow } from "../components/ProductListRow";
import { Search } from "lucide-react";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import { findCategoryBySlug, findCountryBySlug, findRegionNameBySlug, getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";
import categoryGuides from "../data/categoryGuides.json";

// 크롤러용 정적 셸(generate-seo-route-shells.mjs)도 같은 파일을 읽는다.
// 화면과 셸 내용이 달라지면 클로킹으로 보일 수 있으므로 반드시 한 곳에서만 관리한다.
type CategoryGuide = { intro: string; sections: Array<{ heading: string; items: string[] }> };
const guides = categoryGuides as unknown as Record<string, CategoryGuide>;

export default function V2CategoryPage() {
  const { id: categorySlug } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
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

  let prefixText = "";
  if (selectedCountry) {
    prefixText = selectedCountry.name;
  } else if (regionName) {
    prefixText = regionName;
  }

  let filteredProducts = items.filter((p) => p.categoryId === safeCategoryId);
  if (selectedCountry) filteredProducts = filteredProducts.filter((p) => p.countryId === selectedCountry.id);
  if (regionName) filteredProducts = filteredProducts.filter((p) => p.region === regionName);
  if (searchTerm) filteredProducts = filteredProducts.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
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

  useV2Seo({
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
  });

  if (!category) return <div className="p-8 text-center font-bold text-xl mt-20">카테고리를 찾을 수 없습니다.</div>;

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden pb-20 px-6">
      <section className="py-8 md:py-10">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 md:p-12 relative overflow-hidden text-white shadow-md">
          <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
            <div className="text-cyan-200 font-bold mb-2">{prefixText ? `${prefixText}의` : "전 세계의"}</div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{category.name}</h1>
            <div className="w-full relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder={`'${category.name}' 내에서 검색`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white rounded-full pl-12 pr-5 py-3 outline-none text-slate-900 font-medium shadow-lg placeholder:text-slate-400 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-4">
        <div className="font-bold text-sm text-slate-900 mb-6">
          총 <span className="text-brand">{filteredProducts.length}</span>개의 상품
        </div>
        <div className="flex flex-col rounded-2xl border border-slate-100 px-4 md:px-6">
          {filteredProducts.map((p) => (
            <ProductListRow key={p.id} product={p} countryName={countryNameById.get(p.countryId)} />
          ))}
        </div>
        {filteredProducts.length === 0 && <div className="text-sm text-slate-500">검색 조건에 맞는 상품이 없습니다.</div>}
      </section>

      {guide && (
        <section className="py-8 border-t border-slate-100">
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
