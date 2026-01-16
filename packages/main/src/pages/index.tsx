import React, { useState, useMemo } from "react";
import { products as mockProducts } from "../mock/products";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import SortSelector from "../components/SortSelector";
import PartnerWidget from "../components/PartnerWidget";
import Footer from "../components/Footer";
import AdWidget from "../components/ad-widgets/AdWidget";

// Google Analytics 이벤트 추적 함수
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

const trackEvent = (eventName: string, parameters?: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("popular");

  // 필터링된 상품들 - 성능 최적화
  const filteredProducts = useMemo(() => {
    let filtered = mockProducts.filter((product) => {
      // 검색어 필터
      const searchTarget = [
        product.name,
        product.description,
        ...product.tags,
        ...product.categories,
        ...product.locations,
      ].join(" ").toLowerCase();
      
      const keywordMatch = keyword === "" || searchTarget.includes(keyword.toLowerCase());

      // 지역 필터
      const locationMatch = selectedLocation === "전체" || 
        product.locations.some(location => location.includes(selectedLocation));

      // 카테고리 필터
      const categoryMatch = selectedCategory === "전체" || 
        product.categories.includes(selectedCategory);

      return keywordMatch && locationMatch && categoryMatch;
    });

    // 정렬 - 성능 최적화된 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.views - a.views;
        case "latest":
          // ID 순서로 정렬 (최신 등록 순)
          return parseInt(b.id.split('_')[1]) - parseInt(a.id.split('_')[1]);
        default:
          return 0;
      }
    });

    return filtered;
  }, [keyword, selectedLocation, selectedCategory, sortBy]);

  // 추천 상품들
  const recommendedProducts = useMemo(() => {
    return filteredProducts.filter(product => product.isRecommended);
  }, [filteredProducts]);

  // 일반 상품들
  const regularProducts = useMemo(() => {
    return filteredProducts.filter(product => !product.isRecommended);
  }, [filteredProducts]);

  const handleProductClick = (productId: string) => {
    // Google Analytics 이벤트 추적
    trackEvent('product_click', {
      product_id: productId,
      event_category: 'engagement',
      event_label: 'product_card_click'
    });
    
    // 실제로는 라우터를 사용하여 상품 상세 페이지로 이동
    console.log(`상품 ${productId} 클릭됨`);
    // window.location.href = `/product/${productId}`;
  };

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      trackEvent('search', {
        search_term: searchTerm,
        event_category: 'search',
        event_label: 'keyword_search'
      });
    }
  };

  const handleFilterChange = (filterType: string, filterValue: string) => {
    trackEvent('filter_change', {
      filter_type: filterType,
      filter_value: filterValue,
      event_category: 'engagement',
      event_label: 'filter_interaction'
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 bg-clip-text text-transparent mb-3" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            TourStream
          </h1>
          <p className="text-base text-gray-600 font-medium">전국 최고의 액티비티를 한눈에 비교하고 예약하세요</p>
        </div>

        {/* 검색바 */}
        <div className="mb-6">
          <SearchBar 
            value={keyword} 
            onChange={(value) => {
              setKeyword(value);
              handleSearch(value);
            }} 
          />
        </div>

        {/* 필터 및 정렬 */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-4">
            <FilterBar
              selectedLocation={selectedLocation}
              selectedCategory={selectedCategory}
              onLocationChange={(location) => {
                setSelectedLocation(location);
                handleFilterChange('location', location);
              }}
              onCategoryChange={(category) => {
                setSelectedCategory(category);
                handleFilterChange('category', category);
              }}
              allProducts={mockProducts}
            />
            <div className="mt-3">
              <SortSelector sortBy={sortBy} onSortChange={setSortBy} />
            </div>
          </div>
        </div>

        {/* 추천 상품 섹션 */}
        {recommendedProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">🔥</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">추천 액티비티</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedProducts.map((product, index) => (
                <React.Fragment key={product.id}>
                  <ProductCard 
                    product={product} 
                    onProductClick={handleProductClick}
                  />
                  {/* 12개마다 가로형 광고 삽입 (5줄 = 3개×4줄) */}
                  {(index + 1) % 12 === 0 && index + 1 < recommendedProducts.length && (
                    <div className="col-span-full flex justify-center my-4">
                      <AdWidget />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* 일반 상품 리스트 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">✨</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {filteredProducts.length > 0 ? "모든 액티비티" : "검색 결과"}
            </h2>
          </div>
          {regularProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularProducts.map((product, index) => (
                <React.Fragment key={product.id}>
                  <ProductCard 
                    product={product} 
                    onProductClick={handleProductClick}
                  />
                  {/* 12개마다 가로형 광고 삽입 (5줄 = 3개×4줄) */}
                  {(index + 1) % 12 === 0 && index + 1 < regularProducts.length && (
                    <div className="col-span-full flex justify-center my-4">
                      <AdWidget />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-500 text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600 mb-4">다른 키워드로 검색해보세요</p>
              <button 
                onClick={() => {
                  setKeyword('');
                  setSelectedLocation('전체');
                  setSelectedCategory('전체');
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-md"
              >
                필터 초기화
              </button>
            </div>
          )}
        </div>

        {/* 제휴사 */}
        <PartnerWidget />
      </div>
      
      <Footer />
    </div>
  );
} 