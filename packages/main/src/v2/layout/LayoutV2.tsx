import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Search, TrendingUp, Plane } from "lucide-react";

interface LayoutV2Props {
  children: React.ReactNode;
}

const NAV_LINKS = [
  { to: "/products", label: "전체 상품", icon: Search },
  { to: "/popular", label: "인기 상품", icon: TrendingUp },
  { to: "/flights", label: "항공권", icon: Plane },
];

const LayoutV2: React.FC<LayoutV2Props> = ({ children }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-brand"
      style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}
    >
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between gap-8">
          <Link to="/" className="flex items-center relative z-10">
            <span className="font-black text-2xl tracking-tight">
              Tour<span className="text-brand">Stream</span>
            </span>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="메뉴 열기"
              className="w-11 h-11 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto pb-20">{children}</main>

      <footer className="bg-white border-t border-slate-100/80 pt-12 pb-12 mt-auto">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-6">
              <span className="font-black text-xl tracking-tight">
                Tour<span className="text-brand">Stream</span>
              </span>
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
              <div className="flex items-center gap-4 text-[13px] font-semibold">
                <Link to="/terms" className="text-slate-500 hover:text-brand transition-colors">
                  이용약관
                </Link>
                <Link to="/privacy" className="text-slate-500 hover:text-brand transition-colors">
                  개인정보처리방침
                </Link>
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
