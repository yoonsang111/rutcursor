import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { FlightSearchForm } from "./FlightSearchForm";

interface V2HomeHeroProps {
  trending: string[];
}

export function V2HomeHero({ trending }: V2HomeHeroProps) {
  const [tab, setTab] = useState<"tour" | "flight">("tour");
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const submitSearch = () => {
    const q = keyword.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <section className="px-6 pt-8 pb-10 md:pt-12 md:pb-14 text-center border-b border-slate-100">
      <div className="flex items-center justify-center mb-7">
        <span className="font-black text-3xl md:text-4xl tracking-tight">
          Tour<span className="text-brand">Stream</span>
        </span>
      </div>

      <div className="inline-flex gap-1 p-1 rounded-full bg-brand-tint mb-6">
        {(["tour", "flight"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${
              tab === key ? "bg-brand text-white shadow-sm" : "text-brand/70 hover:text-brand"
            }`}
          >
            {key === "tour" ? "투어·티켓" : "항공권"}
          </button>
        ))}
      </div>

      {tab === "tour" ? (
        <div>
          <div className="max-w-xl mx-auto flex items-center gap-2 border border-slate-200 rounded-full px-5 py-3.5 shadow-sm bg-white focus-within:border-brand/40 transition-colors">
            <Search className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="도시, 투어, 액티비티를 검색해보세요"
              className="w-full text-sm outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={submitSearch}
              className="flex-shrink-0 bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              검색
            </button>
          </div>
          {trending.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 text-sm">
              <span className="font-bold text-slate-400">실시간 인기 검색어</span>
              {trending.map((term, idx) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => navigate(`/products?q=${encodeURIComponent(term)}`)}
                  className="font-bold text-slate-700 hover:text-brand transition-colors"
                >
                  <span className="text-brand font-extrabold mr-1">{idx + 1}</span>
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <FlightSearchForm compact />
      )}
    </section>
  );
}
