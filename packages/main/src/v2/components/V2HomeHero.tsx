import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { FlightSearchForm } from "./FlightSearchForm";

export type HomeTab = "tour" | "flight";

interface V2HomeHeroProps {
  trending: string[];
  /** 어느 탭인지. 홈 페이지가 들고 있다 — 항공권일 때는 아래 내용을 통째로 감추기 때문이다. */
  tab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}

/**
 * 홈 맨 위. 로고는 바로 위 머리줄에 이미 있으므로 여기서는 반복하지 않는다.
 * 검색창 하나와 인기 검색어 한 줄만 두어, 첫 화면에 상품이 보이게 한다.
 */
export function V2HomeHero({ trending, tab, onTabChange }: V2HomeHeroProps) {
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const submitSearch = () => {
    const q = keyword.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <section className="px-5 md:px-6 pt-4 pb-1">
      <div className="inline-flex gap-1 p-1 rounded-full bg-slate-100 mb-3">
        {(["tour", "flight"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            aria-pressed={tab === key}
            className={`px-5 h-10 rounded-full text-[15px] font-bold tracking-[-0.03em] transition-colors ${
              tab === key ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {key === "tour" ? "투어·티켓" : "항공권"}
          </button>
        ))}
      </div>

      {tab === "tour" ? (
        <>
          <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-slate-100 focus-within:bg-slate-50 focus-within:ring-1 focus-within:ring-slate-300 transition-colors">
            <Search className="w-[18px] h-[18px] text-slate-400 flex-shrink-0" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="가고싶은 여행지를 검색해보세요"
              aria-label="상품 검색"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={submitSearch}
              className="flex-shrink-0 text-[13px] font-bold text-slate-900 px-1"
            >
              검색
            </button>
          </div>

          {trending.length > 0 && (
            <div className="flex items-center gap-3 mt-2.5 overflow-x-auto hide-scrollbar text-[12.5px]">
              <span className="flex-none font-medium text-slate-400">인기</span>
              {trending.slice(0, 4).map((term, idx) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => navigate(`/products?q=${encodeURIComponent(term)}`)}
                  className="flex-none max-w-[180px] truncate font-medium text-slate-600 hover:text-brand transition-colors"
                >
                  <span className="text-brand font-bold mr-1">{idx + 1}</span>
                  {term}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <FlightSearchForm compact />
      )}
    </section>
  );
}
