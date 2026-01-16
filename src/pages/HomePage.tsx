import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { products as mockProducts } from "../mock/products";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import SortSelector from "../components/SortSelector";
import PartnerWidget from "../components/PartnerWidget";
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

export default function HomePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("popular");

  // 필터링된 상품들 - 성능 최적화 (검색어는 검색 버튼 클릭 시에만 적용)
  const filteredProducts = useMemo(() => {
    let filtered = mockProducts.filter((product) => {
      // 지역 필터
      const locationMatch = selectedLocation === "전체" || 
        product.locations.some(location => location.includes(selectedLocation));

      // 카테고리 필터
      const categoryMatch = selectedCategory === "전체" || 
        product.categories.includes(selectedCategory);

      return locationMatch && categoryMatch;
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

    return filtered.slice(0, 12); // 홈에서는 12개만 표시
  }, [selectedLocation, selectedCategory, sortBy]);

  // 추천 상품들
  const recommendedProducts = useMemo(() => {
    return mockProducts.filter(product => product.isRecommended).slice(0, 6);
  }, []);

  const handleProductClick = (productId: string) => {
    trackEvent('product_click', {
      product_id: productId,
      event_category: 'engagement',
      event_label: 'product_card_click'
    });
    
    navigate(`/product/${productId}`);
  };

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      trackEvent('search', {
        search_term: searchTerm,
        event_category: 'search',
        event_label: 'keyword_search'
      });
      // 검색 결과 페이지로 이동
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
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
            }}
            onSearch={handleSearch}
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs">🔥</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">추천 액티비티</h2>
              </div>
              <button
                onClick={() => navigate('/products?recommended=true')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                더보기 →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedProducts.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product} 
                  onProductClick={handleProductClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* 인기 상품 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">✨</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">인기 액티비티</h2>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              더보기 →
            </button>
          </div>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product} 
                  onProductClick={handleProductClick}
                />
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
    </div>
  );
}
