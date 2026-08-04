import React, { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Loader2, Search } from "lucide-react";
import { api, FlightAirport } from "../../utils/api";
import { trackEvent } from "../../utils/analytics";

const POPULAR_ROUTES: { label: string; dep: FlightAirport; arr: FlightAirport }[] = [
  { label: "인천 → 오사카", dep: { code: "ICN", name: "인천국제공항" }, arr: { code: "KIX", name: "간사이국제공항" } },
  { label: "인천 → 방콕", dep: { code: "ICN", name: "인천국제공항" }, arr: { code: "BKK", name: "수완나품국제공항" } },
  { label: "인천 → 다낭", dep: { code: "ICN", name: "인천국제공항" }, arr: { code: "DAD", name: "다낭국제공항" } },
  { label: "인천 → 후쿠오카", dep: { code: "ICN", name: "인천국제공항" }, arr: { code: "FUK", name: "후쿠오카공항" } },
  { label: "인천 → 타이베이", dep: { code: "ICN", name: "인천국제공항" }, arr: { code: "TPE", name: "타이완타오위안국제공항" } },
];

const CABIN_CLASS_OPTIONS: { value: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST"; label: string }[] = [
  { value: "ECONOMY", label: "일반석" },
  { value: "PREMIUM_ECONOMY", label: "프리미엄 일반석" },
  { value: "BUSINESS", label: "비즈니스" },
  { value: "FIRST", label: "일등석" },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function AirportField({
  label,
  placeholder,
  value,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value: FlightAirport | null;
  onSelect: (airport: FlightAirport) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FlightAirport[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      const airports = await api.searchFlightAirports(query.trim());
      setResults(airports);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1" ref={wrapRef}>
      <label className="block text-[11px] font-bold text-slate-400 mb-1">{label}</label>
      <button type="button" onClick={() => setIsOpen(true)} className="w-full text-left">
        {value ? (
          <div>
            <div className="font-extrabold text-slate-900">{value.cityName || value.name}</div>
            <div className="text-xs text-slate-400">
              {value.name} ({value.code})
            </div>
          </div>
        ) : (
          <div className="text-slate-400 font-medium py-1">{placeholder}</div>
        )}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100 z-30 p-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="도시명, 공항명으로 검색"
              className="w-full text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          {isLoading && (
            <div className="px-3 py-4 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> 검색 중...
            </div>
          )}
          {!isLoading &&
            results.map((airport) => (
              <button
                key={airport.code}
                type="button"
                onClick={() => {
                  onSelect(airport);
                  setIsOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="font-bold text-sm text-slate-800">{airport.cityName || airport.name}</div>
                <div className="text-xs text-slate-400">
                  {airport.name} ({airport.code})
                </div>
              </button>
            ))}
          {!isLoading && query.trim() && results.length === 0 && (
            <div className="px-3 py-4 text-sm text-slate-400">검색 결과가 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

interface FlightSearchFormProps {
  compact?: boolean;
}

export function FlightSearchForm({ compact = false }: FlightSearchFormProps) {
  const [tripType, setTripType] = useState<"RT" | "OW">("RT");
  const [depAirport, setDepAirport] = useState<FlightAirport | null>({ code: "ICN", name: "인천국제공항", cityName: "서울" });
  const [arrAirport, setArrAirport] = useState<FlightAirport | null>(null);
  const [depDate, setDepDate] = useState(addDays(14));
  const [arrDate, setArrDate] = useState(addDays(18));
  const [adult, setAdult] = useState(1);
  const [cabinClass, setCabinClass] = useState<"ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST">("ECONOMY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const swapAirports = () => {
    setDepAirport(arrAirport);
    setArrAirport(depAirport);
  };

  const handleSearch = async () => {
    if (!depAirport || !arrAirport) {
      setErrorMessage("출발지와 도착지를 선택해주세요.");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);
    const url = await api.getFlightSearchLink({
      depAirportCd: depAirport.code,
      arrAirportCd: arrAirport.code,
      tripTypeCd: tripType,
      depDate,
      ...(tripType === "RT" ? { arrDate } : {}),
      adult,
      cabinClass,
    });
    setIsSubmitting(false);
    if (url) {
      trackEvent("flight_search", {
        dep_airport: depAirport.code,
        arr_airport: arrAirport.code,
        trip_type: tripType,
        cabin_class: cabinClass,
        adult,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setErrorMessage("항공권 검색 링크를 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className={compact ? "max-w-xl mx-auto text-left" : "max-w-2xl mx-auto"}>
      <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm ${compact ? "p-5" : "p-6 md:p-8"}`}>
        <div className="flex gap-2 mb-6">
          {(["RT", "OW"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTripType(type)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                tripType === type ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {type === "RT" ? "왕복" : "편도"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border border-slate-200 rounded-2xl p-4 mb-3">
          <AirportField label="출발지" placeholder="출발 도시 선택" value={depAirport} onSelect={setDepAirport} />
          <button
            type="button"
            onClick={swapAirports}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand hover:border-brand/30 transition-colors flex-shrink-0"
            aria-label="출발지/도착지 바꾸기"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <AirportField label="도착지" placeholder="도착 도시 선택" value={arrAirport} onSelect={setArrAirport} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <div className="border border-slate-200 rounded-2xl p-4">
            <label className="block text-[11px] font-bold text-slate-400 mb-1">가는 날</label>
            <input
              type="date"
              value={depDate}
              min={addDays(0)}
              onChange={(e) => setDepDate(e.target.value)}
              className="w-full text-sm font-bold text-slate-900 outline-none"
            />
          </div>
          <div className={`border border-slate-200 rounded-2xl p-4 ${tripType === "OW" ? "opacity-40 pointer-events-none" : ""}`}>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">오는 날</label>
            <input
              type="date"
              value={arrDate}
              min={depDate}
              onChange={(e) => setArrDate(e.target.value)}
              disabled={tripType === "OW"}
              className="w-full text-sm font-bold text-slate-900 outline-none"
            />
          </div>
          <div className="border border-slate-200 rounded-2xl p-4 col-span-2 md:col-span-1">
            <label className="block text-[11px] font-bold text-slate-400 mb-1">인원</label>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">성인 {adult}명</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdult((n) => Math.max(1, n - 1))}
                  className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setAdult((n) => Math.min(9, n + 1))}
                  className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {CABIN_CLASS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCabinClass(option.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                cabinClass === option.value
                  ? "bg-brand-tint text-brand border border-brand/30"
                  : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {errorMessage && <div className="text-sm font-semibold text-red-500 mb-4">{errorMessage}</div>}

        <button
          type="button"
          onClick={handleSearch}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-brand text-white font-extrabold text-base shadow-md hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 검색 링크 생성 중...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" /> 항공권 검색
            </>
          )}
        </button>
      </div>

      <div className="mt-6">
        <div className="text-sm font-bold text-slate-500 mb-3">인기 노선</div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ROUTES.map((route) => (
            <button
              key={route.label}
              type="button"
              onClick={() => {
                setDepAirport(route.dep);
                setArrAirport(route.arr);
              }}
              className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:border-brand/30 hover:text-brand transition-colors"
            >
              {route.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
