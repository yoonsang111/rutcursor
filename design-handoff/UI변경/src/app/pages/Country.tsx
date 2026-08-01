import React from 'react';
import { useParams, Link } from 'react-router';
import { COUNTRIES, CATEGORIES, PRODUCTS } from '../data';
import * as Icons from 'lucide-react';

export function Country() {
  const { id } = useParams<{ id: string }>();
  const country = COUNTRIES.find(c => c.id === id);

  if (!country) return <div className="p-8 text-center font-bold text-xl mt-20">국가를 찾을 수 없습니다.</div>;

  const countryProducts = PRODUCTS.filter(p => p.countryId === country.id);
  const popularProducts = countryProducts.filter(p => p.isPopular);

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden pb-20">
      
      {/* Connected Header & Search Filter Section */}
      <section className="px-6 py-6 md:py-10">
        <div className="w-full bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 flex flex-col">
          
          {/* Hero Image */}
          <div className="relative w-full h-[240px] md:h-[320px] shrink-0">
            <img src={country.image} alt={country.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-md pb-2">
                {country.name}
              </h1>
            </div>
          </div>

          {/* Search & Filter Options */}
          <div className="p-5 md:p-8 flex flex-col gap-6 w-full relative z-20">
            
            {/* Main Search Bar */}
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500 transition-all shadow-inner">
              <div className="pl-4 pr-2 shrink-0">
                <Icons.Search className="w-5 h-5 text-slate-400" />
              </div>
              <input 
                type="text" 
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

            <div className="w-full h-px bg-slate-100"></div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-400 mb-3">주요 도시 탐색</h3>
                <div className="flex flex-wrap gap-2">
                  <button className="px-4 py-2 rounded-full bg-slate-900 text-white font-bold text-xs shadow-md shadow-slate-900/10 whitespace-nowrap">전체보기</button>
                  {country.regions.map(region => (
                    <Link key={region} to={`/region/${region}?country=${country.id}`} className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:border-cyan-500 hover:text-cyan-600 font-medium text-xs transition-colors whitespace-nowrap">
                      {region}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="w-px bg-slate-100 hidden md:block"></div>

              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-400 mb-3">카테고리 탐색</h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const IconComponent = Icons[cat.iconName as keyof typeof Icons] as React.ElementType;
                    return (
                      <Link to={`/category/${cat.id}?country=${country.id}`} key={cat.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors whitespace-nowrap">
                        {IconComponent && <IconComponent className="w-3.5 h-3.5 text-slate-500" />}
                        <span className="text-xs font-medium text-slate-700">{cat.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Products in Country */}
      {popularProducts.length > 0 && (
        <section className="px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight">
              <span className="text-cyan-600">{country.name}</span> 인기 특가
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {popularProducts.map((p) => (
              <div key={p.id} className="w-full">
                <ResponsiveCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Country Products */}
      <section className="px-6 py-8 bg-slate-50 rounded-3xl mx-6 mb-8">
        <h2 className="text-xl font-bold mb-6 px-2">전체 상품</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
          {countryProducts.map((p) => (
            <div key={p.id} className="w-full">
              <ResponsiveCard product={p} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Compact Grid Card version
function ResponsiveCard({ product }: { product: any }) {
  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col w-full h-full relative">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 mb-3 isolate shadow-sm">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isRecommended && (
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-sm">
              에디터 픽
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-1 text-white/90 mb-0.5">
            <Icons.Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold">{product.rating}</span>
          </div>
          <h3 className="font-bold text-white text-sm md:text-base line-clamp-2 leading-tight drop-shadow-md">
            {product.name}
          </h3>
        </div>
      </div>
      <div className="flex items-end justify-between px-1">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium mb-0.5">최저가</span>
          <div className="font-extrabold text-base md:text-lg text-slate-900 tracking-tight">
            {product.price.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-0.5">원</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors">
          <Icons.ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}