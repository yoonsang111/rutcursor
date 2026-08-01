import React from "react";
import { Link } from "react-router-dom";
import { ProductCardV2 } from "../components/ProductCardV2";
import * as Icons from "lucide-react";
import { useV2Products } from "../hooks/useV2Products";
import { useV2Seo } from "../hooks/useV2Seo";
import { getCategorySlug, getCountrySlug } from "../utils/urlSlugs";

export default function V2HomePage() {
  const { items, categories, countries } = useV2Products();

  const popularProducts = items.filter((p) => p.isPopular);
  const rankedPopularProducts = (popularProducts.length > 0 ? popularProducts : items)
    .slice()
    .sort((a, b) => b.popularityScore - a.popularityScore || b.views - a.views);
  const homeCategories = categories
    .map((category) => ({
      ...category,
      productCount: items.filter((item) => item.categoryId === category.id).length,
    }))
    .filter((category) => category.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 6);
  const topCountries = countries
    .map((country) => {
      const countryProducts = items.filter((item) => item.countryId === country.id);
      const score = countryProducts.reduce((sum, item) => sum + item.popularityScore, 0);
      return { ...country, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

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
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: "https://tourstream.kr/" },
        ],
      },
    ],
  });

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden">
      <section className="px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-5 z-10">
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
              당신의 다음 여행,
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">
                가장 완벽한 가격
              </span>
              으로.
            </h1>
          </div>

          <div className="flex-1 w-full relative h-[240px] md:h-[320px]">
            <div className="absolute top-0 right-0 w-[80%] h-[90%] rounded-3xl overflow-hidden shadow-xl z-10">
              <img
                src="https://images.unsplash.com/photo-1612330766532-13be77cca650?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXJmJTIwb2NlYW4lMjB3YXZlc3xlbnwxfHx8fDE3NzY5NzQ2ODV8MA&ixlib=rb-4.1.0&q=80&w=1200"
                className="w-full h-full object-cover"
                alt="Hero"
              />
            </div>
            <div className="absolute bottom-0 left-0 w-[45%] h-[55%] rounded-2xl overflow-hidden shadow-lg border-[3px] border-white z-20">
              <img
                src="https://images.unsplash.com/photo-1691488822390-0fd80c389953?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGFpbGFuZCUyMGJhbmdrb2slMjB0ZW1wbGV8ZW58MXx8fHwxNzc2OTk0Njk3fDA&ixlib=rb-4.1.0&q=80&w=1080"
                className="w-full h-full object-cover"
                alt="Hero sub"
              />
            </div>
            <div className="absolute top-1/2 left-[5%] -translate-y-1/2 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg z-30 flex items-center gap-2.5">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Icons.TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">최대 할인율</div>
                <div className="text-base font-extrabold text-slate-900">-45% 발견</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {homeCategories.map((cat) => {
            const IconComponent = Icons[cat.iconName as keyof typeof Icons] as React.ElementType;
            return (
              <Link
                to={`/category/${getCategorySlug(cat)}`}
                key={cat.id}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-100 shadow-sm hover:shadow hover:border-cyan-200 transition-all duration-300"
              >
                <div className="text-slate-400 group-hover:text-cyan-500 transition-colors">
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                </div>
                <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{cat.name}</span>
              </Link>
            );
          })}
          {homeCategories.length === 0 && <div className="text-sm text-slate-500">등록된 대카테고리가 없습니다.</div>}
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">인기 여행지</h2>
            <p className="text-slate-500 text-sm mt-1.5">지금 가장 핫한 국가의 투어를 검색해보세요.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topCountries.map((country) => (
            <Link to={`/country/${getCountrySlug(country)}`} key={country.id} className="relative aspect-square md:aspect-[4/5] rounded-2xl overflow-hidden group block shadow-sm border border-slate-100">
              <img src={country.image} alt={country.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center text-center">
                <h3 className="font-extrabold text-lg text-white mb-1 group-hover:-translate-y-1 transition-transform">{country.name}</h3>
                <span className="text-white/80 text-xs font-medium bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full group-hover:-translate-y-1 transition-transform delay-75">
                  {country.regionCount}개 도시
                </span>
              </div>
            </Link>
          ))}
          {topCountries.length === 0 && <div className="col-span-full text-sm text-slate-500">등록된 국가가 없습니다.</div>}
        </div>
      </section>

      <section className="py-8 pl-6">
        <div className="flex items-end justify-between pr-6 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">인기 상품</h2>
            <p className="text-slate-500 text-sm mt-1.5">사용자들이 가장 많이 비교하고 예약한 상품입니다.</p>
          </div>
          <Link to="/popular" className="hidden sm:flex items-center gap-1 text-cyan-600 text-sm font-bold hover:text-cyan-700">
            전체보기 <Icons.ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-6 hide-scrollbar snap-x pr-6">
          {rankedPopularProducts.map((p) => (
            <div key={p.id} className="snap-start">
              <ProductCardV2 product={p} />
            </div>
          ))}
          {rankedPopularProducts.length === 0 && <div className="text-sm text-slate-500">노출할 인기 상품이 없습니다.</div>}
        </div>
      </section>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
