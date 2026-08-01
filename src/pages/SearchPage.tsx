import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { storage } from "../utils/storage";
import { matchesCategory, matchesLocation } from "../utils/filterHelpers";
import { createProductSlug } from "../utils/slug";
import { api } from "../utils/api";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import SortSelector from "../components/SortSelector";
import AdWidget from "../components/ad-widgets/AdWidget";

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  
  const [keyword, setKeyword] = useState(queryParam);
  const [selectedLocation, setSelectedLocation] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("popular");
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // API에서 상품 불러오기
  useEffect(() => {
    console.log('[SearchPage] 컴포넌트 마운트됨 - useEffect 실행');
    
    const loadProducts = async () => {
      try {
        console.log('[SearchPage] 상품 로드 시작...');
        console.log('[SearchPage] API 호출 전 - api 객체:', typeof api, api);
        const apiProducts = await api.getProducts();
        console.log('[SearchPage] API에서 받은 상품 수:', apiProducts.length);
        // API에서 받은 상품만 사용 (mock 데이터 제거)
        const cleanedProducts = apiProducts.map((product: any) => ({
          ...product,
          images: []
        }));
        console.log('[SearchPage] 상품 설정:', cleanedProducts.length, '개');
        setAllProducts(cleanedProducts);
      } catch (error) {
        console.error('[SearchPage] 상품 로드 실패:', error);
        console.error('[SearchPage] 에러 상세:', error);
        // API 실패 시 빈 배열
        setAllProducts([]);
      }
    };
    
    // 즉시 실행
    loadProducts();
    
    // 30초마다 새로고침
    const interval = setInterval(() => {
      console.log('[SearchPage] 주기적 새로고침 실행');
      loadProducts();
    }, 30000);
    
    return () => {
      console.log('[SearchPage] 컴포넌트 언마운트 - cleanup');
      clearInterval(interval);
    };
  }, []);

  // URL 파라미터와 동기화
  React.useEffect(() => {
    if (queryParam && queryParam !== keyword) {
      setKeyword(queryParam);
    }
  }, [queryParam]);

  // 필터링된 상품들
  const filteredProducts = useMemo(() => {
    if (!keyword.trim()) {
      return [];
    }

    let filtered = allProducts.filter((product) => {
      // 검색어 필터
      const searchTarget = [
        product.name,
        product.description,
        ...product.tags,
        ...product.categories,
        ...product.locations,
      ].join(" ").toLowerCase();
      
      const keywordMatch = searchTarget.includes(keyword.toLowerCase());

      // 지역 필터 (계층구조 매칭)
      const locationMatch = matchesLocation(product.locations, selectedLocation);

      // 카테고리 필터 (계층구조 매칭)
      const categoryMatch = matchesCategory(product.categories, selectedCategory);

      return keywordMatch && locationMatch && categoryMatch;
    });

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.views - a.views;
        case "latest":
          const aId = parseInt(a.id.split('_')[1]) || 0;
          const bId = parseInt(b.id.split('_')[1]) || 0;
          return bId - aId;
        default:
          return 0;
      }
    });

    return filtered;
  }, [keyword, selectedLocation, selectedCategory, sortBy, allProducts]);

  const handleProductClick = (productId: string) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    // ID를 무조건 6자리 번호로 변환
    let slug: string;
    if (/^\d{6}$/.test(product.id)) {
      slug = product.id;
    } else {
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
    setSearchParams({ q: searchTerm });
    setKeyword(searchTerm);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            검색 결과
          </h1>
          {keyword && (
            <p className="text-gray-600">
              "<span className="font-semibold text-blue-600">{keyword}</span>"에 대한 검색 결과 {filteredProducts.length}개
            </p>
          )}
        </div>

        {/* 검색바 */}
        <div className="mb-6">
          <SearchBar 
            value={keyword} 
            onChange={setKeyword}
            onSearch={handleSearch}
          />
        </div>

        {/* 필터 및 정렬 */}
        {keyword && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-4">
              <FilterBar
                selectedLocation={selectedLocation}
                selectedCategory={selectedCategory}
                onLocationChange={setSelectedLocation}
                onCategoryChange={setSelectedCategory}
              />
              <div className="mt-3">
                <SortSelector sortBy={sortBy} onSortChange={setSortBy} />
              </div>
            </div>
          </div>
        )}

        {/* 검색 결과 */}
        {keyword ? (
          filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product, index) => (
                <React.Fragment key={product.id}>
                  <ProductCard 
                    product={product} 
                    onProductClick={handleProductClick}
                  />
                  {(index + 1) % 12 === 0 && index + 1 < filteredProducts.length && (
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
                  setSearchParams({});
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-md"
              >
                필터 초기화
              </button>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-500 text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">검색어를 입력해주세요</h3>
            <p className="text-gray-600">위 검색바에 원하는 액티비티를 검색해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
