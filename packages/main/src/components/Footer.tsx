import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
        <div className="mb-2 font-medium text-gray-700">TourStream | RU:T Inc.</div>
        <div className="text-xs text-gray-500 mb-2">
          사업자등록번호: 885-81-03412&nbsp;&nbsp;|&nbsp;&nbsp;대표자: 이윤상
        </div>
        <div className="text-xs text-gray-500 mb-2">
          주소: 인천광역시 남동구 논고개로 123번길 45, 4층 403-P35호(논현동)
        </div>
        <div className="mt-3 text-xs text-gray-400">© 2025 TourStream. All rights reserved.</div>
      </div>
    </footer>
  );
};

export default Footer; 