import React from "react";
import { Search } from "lucide-react";

export type SortKey = "popular" | "priceAsc" | "off";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "popular", label: "인기순" },
  { key: "priceAsc", label: "가격 낮은순" },
  { key: "off", label: "할인율순" },
];

interface PillsProps {
  options: Array<{ key: string; label: string }>;
  selected: string;
  onSelect: (key: string) => void;
}

/** 도시·나라를 고르는 알약 줄 */
export function FilterPills({ options, selected, onSelect }: PillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onSelect(o.key)}
          className={`flex-none h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors ${
            selected === o.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface ToolbarProps {
  count: number;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchPlaceholder: string;
}

/** 목록 위에 붙는 "상품 N개 · 정렬 · 검색" 줄 */
export function ListToolbar({ count, sort, onSortChange, searchTerm, onSearchChange, searchPlaceholder }: ToolbarProps) {
  return (
    <div className="border-y border-slate-100">
      <div className="px-5 md:px-6 py-3 flex items-center justify-between gap-4">
        <span className="flex-none text-[13px] md:text-sm text-slate-500">
          상품 <b className="font-bold text-slate-900">{count.toLocaleString("ko-KR")}</b>개
        </span>
        <div className="flex gap-3 md:gap-4.5 text-[13px] md:text-sm">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onSortChange(s.key)}
              className={`font-medium transition-colors ${sort === s.key ? "text-slate-900 font-bold" : "text-slate-400 hover:text-slate-600"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 md:px-6 pb-3">
        <div className="flex items-center gap-2 h-10 px-3.5 rounded-[10px] bg-slate-100 focus-within:bg-slate-50 focus-within:ring-1 focus-within:ring-slate-300 transition-colors">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>
  );
}
