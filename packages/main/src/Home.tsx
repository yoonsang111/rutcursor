import React, { useState } from "react";
import { products as mockProducts } from "./mock/products";
import ProductCard from "./components/ProductCard";
import SearchBar from "./components/SearchBar";
import PartnerWidget from "./components/PartnerWidget";
import Footer from "./components/Footer";

export default function Home() {
  const [keyword, setKeyword] = useState("");

  const filtered = mockProducts.filter((p) => {
    const target = [
      p.name,
      p.description,
      ...(p.tags || []),
      ...(p.categories || []),
      ...(p.locations || [])
    ].join(" ").toLowerCase();
    return target.includes(keyword.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            투어 스트림
          </h1>
          <p className="text-gray-600 text-lg">
            전세계 투어와 액티비티를 한눈에 가격 비교하고 예약하세요
          </p>
        </div>

        {/* 검색바 */}
        <div className="max-w-2xl mx-auto mb-8">
          <SearchBar value={keyword} onChange={setKeyword} />
        </div>

        {/* 상품 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* 결과 없음 메시지 */}
        {filtered.length === 0 && keyword && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">🔍</div>
            <p className="text-gray-500">검색 결과가 없습니다</p>
            <p className="text-gray-400 text-sm">다른 키워드로 검색해보세요</p>
          </div>
        )}

        {/* 제휴사 */}
        <PartnerWidget />
      </div>
      
      <Footer />
    </div>
  );
} 