import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ProductCardV2 } from "../components/ProductCardV2";
import { Search } from "lucide-react";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import { findCategoryBySlug, findCountryBySlug, findRegionNameBySlug, getCategorySlug, getCountrySlug, getRegionSlug } from "../utils/urlSlugs";

export default function V2CategoryPage() {
  const { id: categorySlug } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const countrySlug = searchParams.get("country");
  const regionSlug = searchParams.get("region");
  const [searchTerm, setSearchTerm] = useState("");
  const { items, categories, countries } = useV2Products();

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
  const canonicalQuery = selectedCountry
    ? `?country=${encodeURIComponent(getCountrySlug(selectedCountry))}`
    : regionName
      ? `?region=${encodeURIComponent(getRegionSlug(regionName))}`
      : "";
  const canonicalPath = `/category/${category ? getCategorySlug(category) : categorySlug || ""}${canonicalQuery}`;

  useV2Seo({
    title: `${safeCategoryName} 카테고리 | TourStream`,
    description: `${safeCategoryName} 카테고리의 여행 상품 ${filteredProducts.length}개를 확인해보세요.`,
    canonicalPath,
    ogType: "website",
    ogImage: filteredProducts[0]?.image,
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
          총 <span className="text-cyan-600">{filteredProducts.length}</span>개의 상품
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p) => (
            <ProductCardV2 key={p.id} product={p} />
          ))}
        </div>
        {filteredProducts.length === 0 && <div className="text-sm text-slate-500">검색 조건에 맞는 상품이 없습니다.</div>}
      </section>
    </div>
  );
}
