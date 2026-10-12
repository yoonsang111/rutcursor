import React from 'react';
import { useProducts } from '../context/ProductContext';

export default function DashboardPage() {
  const { products } = useProducts();
  const activeCount = products.filter((p) => p.isAvailable).length;
  const inactiveCount = products.length - activeCount;
  const noLinkCount = products.filter(
    (p) => !p.partnerLinks || !p.partnerLinks.some((l) => l.url && l.url.trim())
  ).length;

  const statCards = [
    { label: '활성 상품', value: activeCount, color: 'green' },
    { label: '비활성 상품', value: inactiveCount, color: 'gray' },
    { label: '링크 없는 상품', value: noLinkCount, color: 'red' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 상품 개수 */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">등록된 상품</p>
              <p className="text-3xl font-bold text-gray-900">{products.length}개</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* 상품 현황 */}
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">{card.label}</p>
            <p
              className={`text-3xl font-bold ${
                card.color === 'green' ? 'text-green-600' : card.color === 'red' ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {card.value}개
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
