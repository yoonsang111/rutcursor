import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { products as mockProducts } from "../mock/products";

export default function CategoriesPage() {
  const navigate = useNavigate();

  // 모든 카테고리 추출
  const categories = useMemo(() => {
    const allCategories = Array.from(new Set(
      mockProducts.flatMap(product => product.categories || [])
    )).filter(Boolean);

    // 각 카테고리별 상품 개수 계산
    return allCategories.map(category => ({
      name: category,
      count: mockProducts.filter(p => p.categories.includes(category)).length
    })).sort((a, b) => b.count - a.count);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            카테고리
          </h1>
          <p className="text-gray-600">
            원하는 카테고리를 선택하여 상품을 확인하세요
          </p>
        </div>

        {/* 카테고리 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => navigate(`/category/${encodeURIComponent(category.name)}`)}
              className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-200 text-left group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-sm font-bold">{category.name.charAt(0)}</span>
                </div>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                  {category.count}개
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {category.name}
              </h3>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
