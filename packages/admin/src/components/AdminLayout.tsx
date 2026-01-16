import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">TS</span>
                </div>
                <span className="text-xl font-bold text-gray-900">TourStream Admin</span>
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* 사이드바 */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-4">
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/"
                    className={`block px-4 py-2 rounded-lg transition-colors text-sm ${
                      isActive('/')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    대시보드
                  </Link>
                </li>
                <li className="pt-2">
                  <div className="px-4 py-2 text-base font-bold text-gray-700">상품 관리</div>
                </li>
                <li>
                  <Link
                    to="/products/new"
                    className={`block px-4 py-2 rounded-lg transition-colors text-sm ${
                      isActive('/products/new')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    상품 등록
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products"
                    className={`block px-4 py-2 rounded-lg transition-colors text-sm ${
                      isActive('/products')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    상품 목록
                  </Link>
                </li>
                <li className="pt-2">
                  <div className="px-4 py-2 text-base font-bold text-gray-700">카테고리 관리</div>
                </li>
                <li>
                  <Link
                    to="/categories/new"
                    className={`block px-4 py-2 rounded-lg transition-colors text-sm ${
                      isActive('/categories/new')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    카테고리 등록
                  </Link>
                </li>
                <li>
                  <Link
                    to="/categories"
                    className={`block px-4 py-2 rounded-lg transition-colors text-sm ${
                      isActive('/categories')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    카테고리 목록
                  </Link>
                </li>
                <li className="pt-2">
                  <div className="px-4 py-2 text-base font-bold text-gray-700">지역 관리</div>
                </li>
                <li>
                  <Link
                    to="/locations/new"
                    className={`block px-4 py-2 rounded-lg transition-colors text-sm ${
                      isActive('/locations/new')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    지역 등록
                  </Link>
                </li>
                <li>
                  <Link
                    to="/locations"
                    className={`block px-4 py-2 rounded-lg transition-colors text-sm ${
                      isActive('/locations')
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    지역 목록
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>

          {/* 메인 컨텐츠 */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
