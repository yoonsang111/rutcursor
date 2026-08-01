import React, { useState } from 'react';
import { Link } from 'react-router';
import { PRODUCTS } from '../data';
import { ProductCard } from '../components/ProductCard';
import { ChevronRight, Loader2 } from 'lucide-react';

export function Popular() {
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoading, setIsLoading] = useState(false);

  // 인기 상품들을 필터링합니다.
  const popularProducts = PRODUCTS.filter(p => p.isPopular);

  // 더 많은 상품 보기를 시뮬레이션하기 위해 가상의 데이터 리스트를 확장합니다.
  const extendedList = [
    ...popularProducts,
    ...popularProducts.map(p => ({ ...p, id: p.id + '-2' })),
    ...popularProducts.map(p => ({ ...p, id: p.id + '-3' })),
    ...popularProducts.map(p => ({ ...p, id: p.id + '-4' })),
  ];

  const hasMore = visibleCount < extendedList.length;

  const handleLoadMore = () => {
    setIsLoading(true);
    // 약간의 지연 시간을 주어 실제 데이터를 불러오는 듯한 효과를 줍니다.
    setTimeout(() => {
      setVisibleCount(prev => prev + 8);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8 md:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-8">
        <Link to="/" className="hover:text-cyan-600 transition-colors">홈</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-bold">인기 상품 전체보기</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          지금 가장 인기 있는 상품
        </h1>
        <p className="text-slate-500 text-base">
          수많은 여행자들이 선택하고 만족한 베스트셀러 상품들을 한눈에 비교해보세요.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {extendedList.slice(0, visibleCount).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button 
            onClick={handleLoadMore}
            disabled={isLoading}
            className="flex items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-full shadow-sm hover:bg-slate-50 hover:text-cyan-600 disabled:opacity-70 transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                <span>상품 불러오는 중...</span>
              </>
            ) : (
              '더 많은 상품 보기'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
