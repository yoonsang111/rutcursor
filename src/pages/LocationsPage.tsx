import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { products as mockProducts } from "../mock/products";

export default function LocationsPage() {
  const navigate = useNavigate();

  // 모든 지역 추출
  const locations = useMemo(() => {
    const allLocations = Array.from(new Set(
      mockProducts.flatMap(product => product.locations || [])
    )).filter(Boolean);

    // 각 지역별 상품 개수 계산
    return allLocations.map(location => ({
      name: location,
      count: mockProducts.filter(p => p.locations.includes(location)).length
    })).sort((a, b) => b.count - a.count);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            지역별 상품
          </h1>
          <p className="text-gray-600">
            원하는 지역을 선택하여 상품을 확인하세요
          </p>
        </div>

        {/* 지역 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations.map((location) => (
            <button
              key={location.name}
              onClick={() => navigate(`/location/${encodeURIComponent(location.name)}`)}
              className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border border-green-200 hover:border-green-300 transition-all duration-200 text-left group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                  {location.count}개
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                {location.name}
              </h3>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
