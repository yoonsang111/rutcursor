import React from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2NotFoundPage() {
  useV2Seo({
    title: "페이지를 찾을 수 없습니다 | TourStream",
    description: "요청하신 페이지를 찾을 수 없습니다.",
    canonicalPath: "/404",
    ogType: "website",
  });

  return (
    <div className="w-full max-w-[820px] mx-auto px-6 py-20 md:py-28 text-center">
      <div className="text-6xl font-black text-slate-200 mb-4">404</div>
      <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-slate-500 mb-8">주소가 잘못되었거나, 삭제되었거나, 이동된 페이지일 수 있어요.</p>
      <div className="flex items-center justify-center gap-3">
        <Link to="/" className="px-6 py-3 rounded-full bg-brand text-white text-sm font-bold hover:opacity-90 transition-opacity">
          홈으로 가기
        </Link>
        <Link
          to="/products"
          className="flex items-center gap-1.5 px-6 py-3 rounded-full border border-slate-200 text-sm font-bold text-slate-700 hover:border-slate-300 transition-colors"
        >
          <Search className="w-4 h-4" />
          전체 상품 보기
        </Link>
      </div>
    </div>
  );
}
