import React, { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import { CATEGORIES, PRODUCTS, COUNTRIES } from '../data';
import { Search, SlidersHorizontal, ArrowUpRight, Star } from 'lucide-react';

export function Category() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const countryId = searchParams.get('country');
  const regionName = searchParams.get('region');
  const [searchTerm, setSearchTerm] = useState('');

  const category = CATEGORIES.find(c => c.id === id);
  if (!category) return <div className="p-8 text-center font-bold text-xl mt-20">카테고리를 찾을 수 없습니다.</div>;

  let prefixText = '';
  if (countryId) {
    const country = COUNTRIES.find(c => c.id === countryId);
    if (country) prefixText = country.name;
  } else if (regionName) {
    prefixText = regionName;
  }

  let filteredProducts = PRODUCTS.filter(p => p.categoryId === category.id);

  if (countryId) filteredProducts = filteredProducts.filter(p => p.countryId === countryId);
  if (regionName) filteredProducts = filteredProducts.filter(p => p.region === regionName);
  
  if (searchTerm) {
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto overflow-hidden pb-20">
      
      {/* Category Header - Compact */}
      <section className="px-6 py-8 md:py-10">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 md:p-12 relative overflow-hidden text-white shadow-md">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
            <div className="text-cyan-200 font-bold mb-2">{prefixText ? `${prefixText}의` : '전 세계의'}</div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              {category.name}
            </h1>
            <p className="text-sm md:text-base text-cyan-50 font-medium mb-8">
              다양한 예약 사이트의 {prefixText} {category.name} 상품을 한눈에 비교하고 가장 저렴하게 예약하세요.
            </p>
            
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

      {/* Filter and Content Area */}
      <section className="px-6 py-4">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="font-bold text-sm text-slate-900">
            총 <span className="text-cyan-600">{filteredProducts.length}</span>개의 상품
          </div>
          
          <div className="flex items-center gap-2">
            {/* 상세필터 모달 구현 전까지 임시 미노출
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 hover:border-cyan-500 hover:text-cyan-600 transition-colors shadow-[0_2px_10px_rgb(0,0,0,0.03)]">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              상세필터
            </button>
            */}
            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors appearance-none">
              <option>인기순</option>
              <option>가격 낮은순</option>
              <option>평점 높은순</option>
            </select>
          </div>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {filteredProducts.map((p) => (
            <div key={p.id} className="w-full">
              <ResponsiveCard product={p} />
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">검색 결과가 없습니다</h3>
              <p className="text-sm text-slate-500">다른 검색어를 입력하거나 조건을 변경해보세요.</p>
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
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
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
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}