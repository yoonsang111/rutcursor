import React from "react";

const partners = ["네이버", "카카오", "WAUG", "KKday", "클룩"];

const PartnerWidget: React.FC = () => {
  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">신뢰할 수 있는 예약 파트너</h3>
        <p className="text-sm text-gray-600">검증된 예약 사이트에서 안전하게 예약하세요</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {partners.map((name, idx) => (
          <div key={idx} className="flex items-center justify-center w-16 h-16 bg-white rounded-xl hover:shadow-md transition-all duration-200 group border border-gray-200">
            <span className="text-xs font-medium text-gray-700 group-hover:text-red-600 transition-colors">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartnerWidget; 