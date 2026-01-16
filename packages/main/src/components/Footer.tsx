import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="text-center text-xs text-gray-400 py-10 leading-relaxed border-t mt-12">
      <div className="mb-2 font-medium text-gray-500">TourStream | RU:T Inc.</div>
      <div>
        사업자등록번호: 885-81-03412&nbsp;&nbsp;|&nbsp;&nbsp;
        대표자: 이윤상
      </div>
      <div>주소: 인천광역시 남동구 논고개로 123번길 45, 4층 403-P35호(논현동)</div>
      <div className="mt-2">이용약관 | 개인정보처리방침</div>
      <div className="mt-4 text-gray-300">© 2025 TourStream. All rights reserved.</div>
    </footer>
  );
};

export default Footer; 