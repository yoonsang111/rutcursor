import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../utils/storage";
import { matchesCategory, matchesLocation } from "../utils/filterHelpers";
import { createProductSlug } from "../utils/slug";
import { api } from "../utils/api";
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
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("popular");
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // API에서 상품 불러오기
  useEffect(() => {
    const loadProducts = async () => {
      try {
        console.log('[ProductsPage/index] 상품 로드 시작...');
        const apiProducts = await api.getProducts();
        console.log('[ProductsPage/index] API에서 받은 상품 수:', apiProducts.length);
        // API에서 받은 상품만 사용 (mock 데이터 제거)
        const cleanedProducts = apiProducts.map((product: any) => ({
          ...product,
          images: []
        }));
        console.log('[ProductsPage/index] 상품 설정:', cleanedProducts.length, '개');
        setAllProducts(cleanedProducts);
      } catch (error) {
        console.error('[ProductsPage/index] 상품 로드 실패:', error);
        // API 실패 시 빈 배열
        setAllProducts([]);
      }
    };
    
    loadProducts();
    
    // 주기적으로 상품 새로고침 (30초마다)
    const interval = setInterval(loadProducts, 30000);
    return () => clearInterval(interval);
  }, []);


  // 필터링된 상품들 - 성능 최적화
  const filteredProducts = useMemo(() => {
    let filtered = allProducts.filter((product) => {
      // 검색어 필터
      const searchTarget = [
        product.name,
        product.description,
        ...product.tags,
        ...product.categories,
        ...product.locations,
      ].join(" ").toLowerCase();
      
      const keywordMatch = keyword === "" || searchTarget.includes(keyword.toLowerCase());

      // 지역 필터 (계층구조 매칭)
      const locationMatch = matchesLocation(product.locations, selectedLocation);

      // 카테고리 필터 (계층구조 매칭)
      const categoryMatch = matchesCategory(product.categories, selectedCategory);

      return keywordMatch && locationMatch && categoryMatch;
    });

    // 정렬 - 성능 최적화된 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.views - a.views;
        case "latest":
          // ID 순서로 정렬 (최신 등록 순) - 6자리 번호 기준
          const aId = /^\d{6}$/.test(a.id) ? parseInt(a.id) : parseInt(a.id.replace(/[^0-9]/g, '') || '0');
          const bId = /^\d{6}$/.test(b.id) ? parseInt(b.id) : parseInt(b.id.replace(/[^0-9]/g, '') || '0');
          return bId - aId;
        default:
          return 0;
      }
    });

    return filtered;
  }, [keyword, selectedLocation, selectedCategory, sortBy, allProducts]);

  // 추천 상품들
  const recommendedProducts = useMemo(() => {
    return filteredProducts.filter(product => product.isRecommended);
  }, [filteredProducts]);

  // 일반 상품들
  const regularProducts = useMemo(() => {
    return filteredProducts.filter(product => !product.isRecommended);
  }, [filteredProducts]);

  const handleProductClick = (productId: string) => {
    // 상품 찾기
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
      return;
    }
    
    // Google Analytics 이벤트 추적
    trackEvent('product_click', {
      product_id: productId,
      event_category: 'engagement',
      event_label: 'product_card_click'
    });
    
    // ID를 무조건 6자리 번호로 변환
    let slug: string;
    if (/^\d{6}$/.test(product.id)) {
      slug = product.id;
    } else {
      // product_X 형식에서 숫자 추출하여 변환
      const num = product.id.replace(/[^0-9]/g, '');
      if (num) {
        slug = (100000 + parseInt(num, 10)).toString();
      } else {
        slug = '100001';
      }
    }
    
    navigate(`/product/${slug}`);
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
