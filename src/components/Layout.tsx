import React from "react";
import { Link, useLocation } from "react-router-dom";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">TS</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                TourStream
              </span>
            </Link>

            {/* 네비게이션 */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/")
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                홈
              </Link>
              <Link
                to="/products"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/products")
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                전체 상품
              </Link>
              <Link
                to="/categories"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/categories")
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                카테고리
              </Link>
              <Link
                to="/locations"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/locations")
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                지역별
              </Link>
            </nav>

            {/* 모바일 메뉴 버튼 */}
            <button className="md:hidden p-2 text-gray-600 hover:text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  );
};

export default Layout;
