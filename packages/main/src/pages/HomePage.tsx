import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { matchesCategory, matchesLocation } from "../utils/filterHelpers";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import SortSelector from "../components/SortSelector";
import PartnerWidget from "../components/PartnerWidget";

// 즉시 실행되는 전역 테스트
console.log('🔥🔥🔥 HomePage.tsx 파일이 로드되었습니다! 🔥🔥🔥');

const trackEvent = (eventName: string, parameters?: any) => {
  const gtag = (window as any).gtag;
  if (typeof gtag === 'function') {
    gtag('event', eventName, parameters);
  }
};

export default function HomePage() {
  console.log('🔵 [HomePage] 컴포넌트 렌더링 시작');
  
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("latest"); // 기본값을 latest로 변경 (새 상품이 먼저 보이도록)
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // API에서 상품 불러오기
  const loadProducts = async () => {
    console.log('🟢 [HomePage] loadProducts 함수 호출됨');
    try {
      console.log('🟡 [HomePage] API 호출 시작...');
      console.log('🟡 [HomePage] api 객체:', api);
      console.log('🟡 [HomePage] api.getProducts:', typeof api?.getProducts);
      
      const apiProducts = await api.getProducts();
      console.log('✅ [HomePage] API 호출 완료! 받은 상품 수:', apiProducts.length);
      
      // 받은 상품들의 ID와 이름 출력 (디버깅)
      if (apiProducts.length > 0) {
        console.log('✅ [HomePage] 받은 상품 목록 (최신 5개):', 
          apiProducts.slice(-5).map((p: any) => ({ id: p.id, name: p.name, categories: p.categories, locations: p.locations }))
        );
      }
      
      const cleanedProducts = apiProducts.map((product: any) => ({
        ...product,
        images: []
      }));
      console.log('✅ [HomePage] 상품 설정 완료:', cleanedProducts.length, '개');
      setAllProducts(cleanedProducts);
    } catch (error: any) {
      console.error('❌ [HomePage] 상품 로드 실패:', error);
      setAllProducts([]);
    } finally {
      console.log('🟢 [HomePage] loadProducts 완료');
    }
  };

  useEffect(() => {
    console.log('🟣 [HomePage] useEffect 실행됨!');
    loadProducts();
    
    // 5초마다 자동 새로고침 (더 빠른 동기화)
    const interval = setInterval(() => {
      console.log('🔄 [HomePage] 주기적 새로고침 실행');
      loadProducts();
    }, 5000);
    
    // 페이지 포커스 시 자동 새로고침
    const handleFocus = () => {
      console.log('👁️ [HomePage] 페이지 포커스 - 상품 새로고침');
      loadProducts();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      console.log('🔴 [HomePage] 컴포넌트 언마운트 - cleanup');
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 필터링된 상품들 - 성능 최적화 (검색어는 검색 버튼 클릭 시에만 적용)
  const filteredProducts = useMemo(() => {
    console.log('🔍 [HomePage] 필터링 시작 - 전체 상품:', allProducts.length, '개');
    console.log('🔍 [HomePage] 선택된 필터 - 지역:', selectedLocation, '카테고리:', selectedCategory);
    
    let filtered = allProducts.filter((product) => {
      const locationMatch = matchesLocation(product.locations || [], selectedLocation);
      const categoryMatch = matchesCategory(product.categories || [], selectedCategory);
      
      // 필터링 디버깅 (처음 3개만)
      if (allProducts.indexOf(product) < 3) {
        console.log('🔍 [HomePage] 상품 필터링 체크:', {
          id: product.id,
          name: product.name,
          locations: product.locations,
          categories: product.categories,
          locationMatch,
          categoryMatch,
          최종매칭: locationMatch && categoryMatch
        });
      }
      
      return locationMatch && categoryMatch;
    });

    console.log('🔍 [HomePage] 필터링 후:', filtered.length, '개');

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.views - a.views;
        case "latest":
          // 6자리 번호 기준으로 정렬 (큰 번호가 최신)
          const aId = /^\d{6}$/.test(a.id) ? parseInt(a.id) : parseInt(a.id.replace(/[^0-9]/g, '') || '0');
          const bId = /^\d{6}$/.test(b.id) ? parseInt(b.id) : parseInt(b.id.replace(/[^0-9]/g, '') || '0');
          console.log('🔍 [HomePage] 정렬 비교:', { aId, bId, aName: a.name, bName: b.name });
          return bId - aId;
        default:
          return 0;
      }
    });

    const result = filtered.slice(0, 12);
    console.log('🔍 [HomePage] 최종 표시 상품:', result.length, '개');
    console.log('🔍 [HomePage] 전체 필터링된 상품 수:', filtered.length, '개 (12개만 표시)');
    if (result.length > 0) {
      console.log('🔍 [HomePage] 첫 번째 상품:', { id: result[0].id, name: result[0].name });
      console.log('🔍 [HomePage] 마지막 상품:', { id: result[result.length - 1].id, name: result[result.length - 1].name });
    }
    // 필터링된 모든 상품 ID 출력 (디버깅용)
    console.log('🔍 [HomePage] 필터링된 모든 상품 ID:', filtered.map(p => ({ id: p.id, name: p.name })));
    return result;
  }, [selectedLocation, selectedCategory, sortBy, allProducts]);

  // 추천 상품들
  const recommendedProducts = useMemo(() => {
    return allProducts.filter(product => product.isRecommended).slice(0, 6);
  }, [allProducts]);

  // 인기 카테고리 추출 (상품이 3개 이상인 카테고리)
  const popularCategories = useMemo(() => {
    const categoryCounts: { [key: string]: number } = {};
    allProducts.forEach(product => {
      (product.categories || []).forEach((cat: string) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });
    return Object.entries(categoryCounts)
      .filter(([_, count]) => count >= 3)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 8)
      .map(([category]) => category);
  }, [allProducts]);

  // 인기 지역 추출 (상품이 3개 이상인 지역)
  const popularLocations = useMemo(() => {
    const locationCounts: { [key: string]: number } = {};
    allProducts.forEach(product => {
      (product.locations || []).forEach((loc: string) => {
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      });
    });
    return Object.entries(locationCounts)
      .filter(([_, count]) => count >= 3)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 8)
      .map(([location]) => location);
  }, [allProducts]);

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

  // BreadcrumbList 구조화된 데이터 (홈페이지)
  useEffect(() => {
    const existingBreadcrumb = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
    if (existingBreadcrumb) {
      existingBreadcrumb.remove();
    }
    
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.setAttribute('data-breadcrumb', 'true');
    breadcrumbScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "홈",
          "item": "https://tourstream.kr"
        }
      ]
    });
    document.head.appendChild(breadcrumbScript);
    
    return () => {
      const breadcrumb = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
      if (breadcrumb) breadcrumb.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 bg-clip-text text-transparent" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              TourStream
            </h1>
          </div>
          <p className="text-base text-gray-600 font-medium">전세계 투어와 액티비티를 한눈에 가격 비교하고 예약하세요</p>
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
              allProducts={allProducts}
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

        {/* 인기 카테고리 섹션 (SEO 내부 링크) */}
        {popularCategories.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">🏷️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">인기 카테고리</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularCategories.map((category) => (
                <a
                  key={category}
                  href={`/category/${encodeURIComponent(category)}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 font-medium text-sm shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/category/${encodeURIComponent(category)}`);
                  }}
                >
                  {category}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 인기 지역 섹션 (SEO 내부 링크) */}
        {popularLocations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">📍</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">인기 지역</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularLocations.map((location) => (
                <a
                  key={location}
                  href={`/location/${encodeURIComponent(location)}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-200 font-medium text-sm shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/location/${encodeURIComponent(location)}`);
                  }}
                >
                  {location}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 제휴사 */}
        <PartnerWidget />
      </div>
    </div>
  );
}
