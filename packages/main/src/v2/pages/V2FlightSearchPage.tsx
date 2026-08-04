import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plane } from "lucide-react";
import { FlightSearchForm } from "../components/FlightSearchForm";
import { useV2Seo } from "../hooks/useV2Seo";

export default function V2FlightSearchPage() {
  useV2Seo({
    title: "항공권 검색 | TourStream",
    description: "출발지와 도착지, 날짜를 입력하고 마이리얼트립 항공권 검색결과를 확인하세요.",
    canonicalPath: "/flights",
    ogType: "website",
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8 md:py-12">
      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-8">
        <Link to="/" className="hover:text-brand transition-colors">
          홈
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-bold">항공권 검색</span>
      </div>

      <div className="mb-10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand flex items-center justify-center shadow-md flex-shrink-0">
          <Plane className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">항공권 검색</h1>
          <p className="text-slate-500 text-sm mt-1">마이리얼트립의 실시간 항공권 결과로 연결됩니다.</p>
        </div>
      </div>

      <FlightSearchForm />
    </div>
  );
}
