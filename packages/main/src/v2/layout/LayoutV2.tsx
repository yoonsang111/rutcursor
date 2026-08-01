import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Waves, Search, Menu } from "lucide-react";

interface LayoutV2Props {
  children: React.ReactNode;
}

const LayoutV2: React.FC<LayoutV2Props> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = React.useState("");

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  React.useEffect(() => {
    const q = new URLSearchParams(location.search).get("q") || "";
    setSearchKeyword(q);
  }, [location.pathname, location.search]);

  const submitSearch = React.useCallback(() => {
    const q = searchKeyword.trim();
    if (q) {
      navigate(`/products?q=${encodeURIComponent(q)}`);
      return;
    }
    navigate("/products");
  }, [navigate, searchKeyword]);

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 selection:bg-cyan-200 selection:text-cyan-900"
      style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}
    >
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between gap-8">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group relative z-10">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_4px_20px_-4px_rgba(56,189,248,0.5)] transform group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_-6px_rgba(56,189,248,0.6)] transition-all duration-300">
                <div className="absolute inset-[1.5px] rounded-[10px] bg-gradient-to-tr from-white/30 to-white/10 backdrop-blur-md" />
                <Waves className="w-6 h-6 text-white drop-shadow-sm relative z-10" strokeWidth={2.5} />
              </div>
              <span className="font-black text-[26px] tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 group-hover:from-cyan-600 group-hover:to-blue-600 transition-all duration-300">
                TOURSTREAM
              </span>
            </Link>
          </div>

          <div className="flex-1 max-w-2xl mx-auto hidden lg:block">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
              <div className="relative flex items-center bg-white rounded-full border border-slate-100 shadow-sm overflow-hidden">
                <div className="pl-5 pr-2">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitSearch();
                    }
                  }}
                  placeholder="도시, 투어, 액티비티를 검색해보세요"
                  className="w-full bg-transparent text-sm font-medium text-slate-700 py-3.5 pr-6 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={submitSearch}
                  className="hidden sm:block whitespace-nowrap bg-slate-900 text-white px-6 py-2 m-1.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  검색
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submitSearch}
              className="w-11 h-11 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition-colors lg:hidden"
            >
              <Search className="w-5 h-5" />
            </button>
            <button className="w-11 h-11 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition-colors sm:hidden">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto pb-20">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-100/80 pt-12 pb-12 mt-auto">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-md">
                  <div className="absolute inset-[1px] rounded-[7px] bg-gradient-to-tr from-white/30 to-white/10 backdrop-blur-sm" />
                  <Waves className="w-4 h-4 text-white relative z-10" strokeWidth={2.5} />
                </div>
                <span className="font-black text-xl tracking-tighter uppercase text-slate-900">TOURSTREAM</span>
              </div>
              <div className="text-[13px] text-slate-500 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold text-slate-700">주식회사 알유티</span>
                  <span className="w-[1px] h-3 bg-slate-300 hidden sm:block" />
                  <span>대표자: 이윤상</span>
                  <span className="w-[1px] h-3 bg-slate-300 hidden sm:block" />
                  <span>사업자등록번호: 885-81-03412</span>
                </div>
                <p>주소: 인천광역시 남동구 논고개로 123번길 45, 4층 403-P35호(논현동)</p>
              </div>
            </div>
            <div className="text-[13px] text-slate-400">
              <p>© 2026 TOURSTREAM Inc. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LayoutV2;
