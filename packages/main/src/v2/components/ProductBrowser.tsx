import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { Category, Product } from "../data";
import { looseMatches, partnerLogoSrc, priceSpread, productHaystack, searchTokens, sortProducts, tokenHits } from "../brand";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";

/*
  목록 화면(국가·카테고리·전체·인기·지역·찜)의 공통 몸통.
  전에는 화면마다 정렬·검색·격자를 따로 베껴 썼는데, 한 군데만 고치면 되도록 여기로 모았다.
  고른 조건은 전부 주소에 남겨서, 주소를 그대로 보내면 같은 화면이 열린다.
*/

const PAGE_SIZE = 20;

export type SortKey = "popular" | "priceAsc" | "off";
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "popular", label: "인기순" },
  { key: "priceAsc", label: "가격 낮은순" },
  { key: "off", label: "할인율순" },
];

/** 가격대 칸. low 이상 high 미만 (원) */
const PRICE_BANDS = [
  { key: "a", label: "2만원 이하", low: 0, high: 20000 },
  { key: "b", label: "2~5만원", low: 20000, high: 50000 },
  { key: "c", label: "5~10만원", low: 50000, high: 100000 },
  { key: "d", label: "10만원 이상", low: 100000, high: Infinity },
];

export type FilterKind = "category" | "seller" | "price";

/* ── 주소에서 고른 값 읽고 쓰기 ─────────────────────────────── */

const readSet = (params: URLSearchParams, key: string) => {
  const raw = (params.get(key) || "").trim();
  return new Set(raw ? raw.split(",").filter(Boolean) : []);
};

/* ── 체크박스 한 줄 ────────────────────────────────────────── */

interface OptionRowProps {
  label: string;
  count: number;
  checked: boolean;
  logo?: string;
  onToggle: () => void;
}

function OptionRow({ label, count, checked, logo, onToggle }: OptionRowProps) {
  return (
    <label className="flex items-center gap-2 py-[5px] cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only peer" />
      <span
        aria-hidden="true"
        className={`flex-none w-4 h-4 rounded border flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-1 ${
          checked ? "bg-slate-900 border-slate-900" : "bg-white border-slate-300"
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="m1 4 2.6 2.6L9 1.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {logo && <img src={logo} alt="" width={18} height={18} className="w-[18px] h-[18px] flex-none rounded object-contain bg-white border border-slate-100" />}
      <span className="flex-1 min-w-0 truncate text-[13px] text-slate-700">{label}</span>
      <span className="flex-none text-[11.5px] text-slate-300 tabular-nums">{count}</span>
    </label>
  );
}

/* ── 필터 묶음 (사이드바와 아래 창에서 같이 쓴다) ────────────── */

interface GroupsProps {
  groups: Array<{ kind: FilterKind; title: string; options: Array<{ key: string; label: string; count: number; logo?: string }> }>;
  selected: Record<FilterKind, Set<string>>;
  onToggle: (kind: FilterKind, key: string) => void;
}

function FilterGroups({ groups, selected, onToggle }: GroupsProps) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.kind} className="mb-5 last:mb-0">
          <div className="text-[12.5px] font-bold text-slate-500 mb-1.5">{g.title}</div>
          {g.options.map((o) => (
            <OptionRow
              key={o.key}
              label={o.label}
              count={o.count}
              logo={o.logo}
              checked={selected[g.kind].has(o.key)}
              onToggle={() => onToggle(g.kind, o.key)}
            />
          ))}
        </div>
      ))}
    </>
  );
}

/* ── 본체 ──────────────────────────────────────────────────── */

interface ProductBrowserProps {
  /** 필터를 걸기 전의 목록 (화면이 이미 나라·종류로 좁혀 둔 것) */
  products: Product[];
  categories: Category[];
  countryNameById: Map<string, string>;
  searchPlaceholder: string;
  /** 이 화면에서 뜻이 없는 필터는 숨긴다 (예: 카테고리 화면의 카테고리 필터) */
  hideFilters?: FilterKind[];
  loading?: boolean;
  emptyText?: string;
}

export function ProductBrowser({
  products,
  categories,
  countryNameById,
  searchPlaceholder,
  hideFilters = [],
  loading = false,
  emptyText = "조건에 맞는 상품이 없습니다.",
}: ProductBrowserProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const keyword = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") as SortKey) || "popular";
  const selected: Record<FilterKind, Set<string>> = {
    category: readSet(searchParams, "cat"),
    seller: readSet(searchParams, "seller"),
    price: readSet(searchParams, "price"),
  };

  const patch = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setSearchParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE);
  };

  const PARAM_OF: Record<FilterKind, string> = { category: "cat", seller: "seller", price: "price" };

  const toggle = (kind: FilterKind, key: string) => {
    const set = new Set(selected[kind]);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    patch({ [PARAM_OF[kind]]: set.size ? Array.from(set).join(",") : null });
  };

  const clearAll = () => patch({ cat: null, seller: null, price: null });
  const chosenCount = selected.category.size + selected.seller.size + selected.price.size;

  /* 고를 수 있는 값은 지금 목록에 실제로 있는 것만 보여 준다 (빈 칸을 누르게 하지 않는다) */
  const groups = useMemo(() => {
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    const catCount = new Map<string, number>();
    const sellerCount = new Map<string, number>();
    const bandCount = new Map<string, number>();

    products.forEach((p) => {
      catCount.set(p.categoryId, (catCount.get(p.categoryId) || 0) + 1);
      new Set(p.partnerLinks.filter((l) => l.url && l.state !== "stopped").map((l) => l.name)).forEach((name) =>
        sellerCount.set(name, (sellerCount.get(name) || 0) + 1),
      );
      const low = priceSpread(p).low;
      if (low !== undefined) {
        const band = PRICE_BANDS.find((b) => low >= b.low && low < b.high);
        if (band) bandCount.set(band.key, (bandCount.get(band.key) || 0) + 1);
      }
    });

    const out: GroupsProps["groups"] = [];
    if (!hideFilters.includes("category")) {
      const options = Array.from(catCount.entries())
        .filter(([id]) => categoryName.has(id))
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ key: id, label: categoryName.get(id)!, count }));
      if (options.length > 1) out.push({ kind: "category", title: "카테고리", options });
    }
    if (!hideFilters.includes("seller")) {
      const options = Array.from(sellerCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ key: name, label: name, count, logo: partnerLogoSrc(name) || undefined }));
      if (options.length > 1) out.push({ kind: "seller", title: "판매처", options });
    }
    if (!hideFilters.includes("price")) {
      const options = PRICE_BANDS.filter((b) => (bandCount.get(b.key) || 0) > 0).map((b) => ({
        key: b.key,
        label: b.label,
        count: bandCount.get(b.key) || 0,
      }));
      if (options.length > 1) out.push({ kind: "price", title: "가격", options });
    }
    return out;
  }, [products, categories, hideFilters]);

  // 검색어를 단어로 쪼갠다. 통째로 찾으면 "오사카 패스"가 1건밖에 안 나온다 (brand.ts 참고)
  const tokens = useMemo(() => searchTokens(keyword), [keyword]);

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      if (selected.category.size && !selected.category.has(p.categoryId)) return false;

      if (selected.seller.size) {
        const live = p.partnerLinks.filter((l) => l.url && l.state !== "stopped").map((l) => l.name);
        if (!live.some((name) => selected.seller.has(name))) return false;
      }

      if (selected.price.size) {
        const low = priceSpread(p).low;
        if (low === undefined) return false;
        const band = PRICE_BANDS.find((b) => low >= b.low && low < b.high);
        if (!band || !selected.price.has(band.key)) return false;
      }

      if (tokens.length === 0) return true;
      // 단어가 전부 들어맞아야 한다 (하나라도 맞는 상품은 결과가 0건일 때만 '혹시 이것' 으로 보여 준다)
      return tokenHits(productHaystack(p, countryNameById.get(p.countryId)), tokens) === tokens.length;
    });

    return sortProducts(list, sort);
  }, [products, tokens, sort, selected.category, selected.seller, selected.price, countryNameById]);

  /* 결과가 0건일 때만 계산한다 */
  const suggestions = useMemo(() => {
    if (loading || filtered.length > 0 || tokens.length === 0) return [];
    return looseMatches(products, tokens, countryNameById, 6);
  }, [loading, filtered.length, products, tokens, countryNameById]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const showSkeleton = loading && products.length === 0;

  const sidebar = groups.length > 0 && (
    <aside className="hidden lg:block w-[212px] flex-none border border-slate-200 rounded-xl p-5 sticky top-24">
      <div className="flex items-baseline justify-between mb-3.5">
        <span className="text-sm font-bold">필터</span>
        {chosenCount > 0 && (
          <button type="button" onClick={clearAll} className="text-[12px] text-slate-400 hover:text-brand">
            초기화
          </button>
        )}
      </div>
      <FilterGroups groups={groups} selected={selected} onToggle={toggle} />
    </aside>
  );

  return (
    <>
      {/* 상품 수 · 정렬 · 필터 버튼 · 검색 */}
      <div className="border-y border-slate-100">
        <div className="px-5 md:px-6 py-3 flex items-center justify-between gap-3">
          <span className="flex-none text-[13px] md:text-sm text-slate-500">
            상품 <b className="font-bold text-slate-900 tabular-nums">{filtered.length.toLocaleString("ko-KR")}</b>개
          </span>
          <div className="flex items-center gap-3 md:gap-4">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => patch({ sort: s.key === "popular" ? null : s.key })}
                className={`text-[13px] md:text-sm font-medium transition-colors ${
                  sort === s.key ? "text-slate-900 font-bold" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {s.label}
              </button>
            ))}
            {groups.length > 0 && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className={`lg:hidden flex items-center gap-1 h-8 pl-2.5 pr-3 rounded-full border text-[13px] font-medium transition-colors ${
                  chosenCount > 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                필터{chosenCount > 0 ? ` ${chosenCount}` : ""}
              </button>
            )}
          </div>
        </div>

        <div className="px-5 md:px-6 pb-3">
          <div className="flex items-center gap-2 h-10 px-3.5 rounded-[10px] bg-slate-100 focus-within:bg-slate-50 focus-within:ring-1 focus-within:ring-slate-300 transition-colors">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              id="list-search"
              value={keyword}
              onChange={(e) => patch({ q: e.target.value.trim() ? e.target.value : null })}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="px-5 md:px-6 pt-5 flex gap-10 items-start">
        {sidebar}

        <div className="flex-1 min-w-0">
          {!loading && filtered.length === 0 ? (
            <div className="py-8">
              <p className="text-[15px] font-bold text-slate-900">
                {keyword ? `‘${keyword}’에 맞는 상품이 없습니다` : emptyText}
              </p>
              {keyword && <p className="mt-1.5 text-[13px] text-slate-400">단어를 줄이거나 다른 말로 찾아 보세요.</p>}

              {chosenCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-4 inline-flex items-center px-4 h-9 rounded-full border border-slate-200 text-[13px] font-bold text-slate-700 hover:border-slate-300 transition-colors"
                >
                  필터 {chosenCount}개 지우기
                </button>
              )}

              {/* 막다른 길을 만들지 않는다. 단어가 하나라도 맞는 상품을 대신 보여 준다 */}
              {suggestions.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-[15px] font-bold tracking-[-0.035em] text-slate-900 mb-3.5">혹시 이걸 찾으셨나요?</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-[11px] gap-y-6 md:gap-x-5 md:gap-y-[34px]">
                    {suggestions.map((p) => (
                      <ProductCard key={p.id} product={p} countryName={countryNameById.get(p.countryId)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-[11px] gap-y-6 md:gap-x-5 md:gap-y-[34px]">
              {showSkeleton
                ? Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)
                : visible.map((p) => <ProductCard key={p.id} product={p} countryName={countryNameById.get(p.countryId)} />)}
            </div>
          )}

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="flex items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-full shadow-sm hover:bg-slate-50 hover:text-brand transition-colors"
              >
                더 보기 <span className="tabular-nums text-slate-400">{(filtered.length - visibleCount).toLocaleString("ko-KR")}개 남음</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 폰: 아래에서 올라오는 필터 창 */}
      {sheetOpen && groups.length > 0 && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="필터">
          <button type="button" aria-label="필터 닫기" onClick={() => setSheetOpen(false)} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative w-full max-h-[78vh] overflow-y-auto bg-white rounded-t-2xl pb-[max(16px,env(safe-area-inset-bottom,0px))]">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 h-14 border-b border-slate-100">
              <span className="text-[17px] font-bold tracking-[-0.03em]">필터</span>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="닫기" className="w-9 h-9 flex items-center justify-center">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4">
              <FilterGroups groups={groups} selected={selected} onToggle={toggle} />
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-3 flex gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="h-12 px-5 rounded-xl border border-slate-200 text-[15px] font-bold text-slate-600"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex-1 h-12 rounded-xl bg-slate-900 text-white text-[15px] font-bold"
              >
                상품 {filtered.length.toLocaleString("ko-KR")}개 보기
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && products.length > 0 && (
        <div className="px-6 py-6 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-brand" />
        </div>
      )}
    </>
  );
}
