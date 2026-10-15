import React from 'react';
import { useProducts } from '../context/ProductContext';

export default function DashboardPage() {
  const { products } = useProducts();

  const statusOf = (p: (typeof products)[number]) => p.publishStatus || (p.isAvailable === false ? 'needs_classification' : 'published');
  const activeCount = products.filter((p) => statusOf(p) === 'published').length;
  const inactiveCount = products.length - activeCount;
  const needsClassification = products.filter((p) => statusOf(p) === 'needs_classification').length;
  const noBookable = products.filter((p) => statusOf(p) === 'published' && p.bookable === 'none').length;
  const noLinkCount = products.filter(
    (p) => !(p.partnerLinks || []).some((link) => link.url && link.url.trim() !== '')
  ).length;

  const cards = [
    { label: '등록된 상품', value: products.length, tone: 'bg-blue-100 text-blue-600' },
    { label: '공개 상품', value: activeCount, tone: 'bg-green-100 text-green-600' },
    { label: '비공개 (초안·숨김·분류 필요)', value: inactiveCount, tone: 'bg-gray-100 text-gray-600' },
    { label: '분류 필요', value: needsClassification, tone: 'bg-amber-100 text-amber-700' },
    { label: '공개 중 · 판매처 모두 중지', value: noBookable, tone: 'bg-orange-100 text-orange-700' },
    { label: '링크 없는 상품', value: noLinkCount, tone: 'bg-red-100 text-red-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value.toLocaleString()}개</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.tone}`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
