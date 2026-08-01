import React from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import { COUNTRIES, CATEGORIES, PRODUCTS } from '../data';
import * as Icons from 'lucide-react';

export function Region() {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const countryId = searchParams.get('country');
  
  const country = COUNTRIES.find(c => c.id === countryId) || COUNTRIES.find(c => c.regions.includes(name || ''));

  if (!name) return <div className="p-8 text-center font-bold text-xl mt-20">지역을 찾을 수 없습니다.</div>;

  const regionProducts = PRODUCTS.filter(p => p.region === name);
  const popularProducts = regionProducts.filter(p => p.isPopular);

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden pb-20">
      
      {/* Region Header */}
      <section className="px-6 py-6 md:py-10">
        <div className="relative w-full h-[240px] md:h-[360px] rounded-3xl overflow-hidden shadow-sm bg-slate-800">
          {regionProducts[0]?.image && (
            <img src={regionProducts[0].image} alt={name} className="w-full h-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
          
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 text-white">
            <div className="flex items-center gap-2 mb-2 text-cyan-300 font-bold text-sm">
              <Icons.MapPin className="w-4 h-4" />
              {country?.name}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              {name}
            </h1>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-base md:text-lg text-white/80 font-medium max-w-lg">
                {name}의 완벽한 여행을 위한<br className="hidden md:block"/> 
                모든 투어와 티켓을 비교하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Categories Filter */}
      <section className="px-6 -mt-6 relative z-20">
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 mb-3">카테고리 탐색</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const IconComponent = Icons[cat.iconName as keyof typeof Icons] as React.ElementType;
              return (
                <Link to={`/category/${cat.id}?region=${name}`} key={cat.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  {IconComponent && <IconComponent className="w-3.5 h-3.5 text-slate-500" />}
                  <span className="text-xs font-medium text-slate-700">{cat.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Popular Products in Region */}
      {popularProducts.length > 0 && (
        <section className="px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight">
              <span className="text-cyan-600">{name}</span> 인기 특가
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

      {/* All Region Products */}
      <section className="px-6 py-8 bg-slate-50 rounded-3xl mx-6 mb-8">
        <h2 className="text-xl font-bold mb-6 px-2">전체 상품</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
          {regionProducts.map((p) => (
            <div key={p.id} className="w-full">
              <ResponsiveCard product={p} />
            </div>
          ))}
          {regionProducts.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-500 font-medium">
              아직 등록된 상품이 없습니다.
            </div>
          )}
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