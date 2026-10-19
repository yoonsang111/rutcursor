import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { migrateProductsFromLocalStorage } from '../utils/migrateFromLocalStorage';
import { storage } from '../utils/storage';

const PAGE_SIZE = 20;

// 공개 상태 (이전 전 데이터: 활성 = 공개, 비활성 = 분류 필요)
const publishStatusOf = (p: { publishStatus?: string; isAvailable?: boolean }) =>
  (p.publishStatus || (p.isAvailable === false ? 'needs_classification' : 'published')) as 'draft' | 'published' | 'hidden' | 'needs_classification';
const STATUS_BADGE = {
  published: { label: '공개', tone: 'bg-green-100 text-green-700' },
  draft: { label: '초안', tone: 'bg-blue-100 text-blue-700' },
  hidden: { label: '숨김', tone: 'bg-gray-200 text-gray-700' },
  needs_classification: { label: '분류 필요', tone: 'bg-amber-100 text-amber-800' },
};
const AUTO_REFRESH_MS = 60000;
const FOCUS_REFRESH_MIN_GAP_MS = 5000;

type SortKey = 'default' | 'views-desc' | 'views-asc' | 'name-asc' | 'id-desc';

export default function ProductListPage() {
  const navigate = useNavigate();
  const { products, deleteProduct, searchProducts, refreshProducts } = useProducts();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'hidden' | 'needs_classification' | 'no_bookable' | 'recommended'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [page, setPage] = useState(1);
  
  // 로컬스토리지에 상품이 있는지 확인
  const localProducts = storage.getProducts();
  const hasLocalProducts = localProducts.length > 0;

  const categoryOptions = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.categories))).sort(),
    [products]
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.locations))).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = searchKeyword ? searchProducts(searchKeyword) : products;
    if (['published', 'draft', 'hidden', 'needs_classification'].includes(statusFilter)) list = list.filter((p) => publishStatusOf(p) === statusFilter);
    if (statusFilter === 'no_bookable') list = list.filter((p) => publishStatusOf(p) === 'published' && p.bookable === 'none');
    if (statusFilter === 'recommended') list = list.filter((p) => p.isRecommended);
    if (categoryFilter) list = list.filter((p) => p.categories.includes(categoryFilter));
    if (locationFilter) list = list.filter((p) => p.locations.includes(locationFilter));
    if (sortKey === 'default') return list;
    const sorted = [...list];
    if (sortKey === 'views-desc') sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
    if (sortKey === 'views-asc') sorted.sort((a, b) => (a.views || 0) - (b.views || 0));
    if (sortKey === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    if (sortKey === 'id-desc') sorted.sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));
    return sorted;
  }, [products, searchProducts, searchKeyword, statusFilter, categoryFilter, locationFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 검색·거르기·정렬·2쪽 이후를 보는 중이거나 이사(마이그레이션) 중이면 자동 새로고침을 멈춤
  const pauseAutoRefresh =
    isMigrating ||
    searchKeyword !== '' ||
    statusFilter !== 'all' ||
    categoryFilter !== '' ||
    locationFilter !== '' ||
    sortKey !== 'default' ||
    currentPage > 1;
  const pauseAutoRefreshRef = useRef(pauseAutoRefresh);
  pauseAutoRefreshRef.current = pauseAutoRefresh;

  // 보여줄 쪽 번호 (현재 쪽 기준 최대 5개)
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  // 조건이 바뀌면 첫 페이지로
  useEffect(() => {
    setPage(1);
  }, [searchKeyword, statusFilter, categoryFilter, locationFilter, sortKey]);

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error('상품 삭제 실패:', error);
        alert('상품 삭제에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleMigrate = async () => {
    if (!hasLocalProducts) {
      alert('로컬스토리지에 마이그레이션할 상품이 없습니다.');
      return;
    }

    if (!window.confirm(`로컬스토리지의 ${localProducts.length}개 상품을 확인하여 API 서버에 없는 상품만 마이그레이션하시겠습니까?\n\n(브라우저 콘솔에서 상세 로그를 확인할 수 있습니다.)`)) {
      return;
    }

    setIsMigrating(true);
    try {
      console.log('[마이그레이션 시작] 로컬스토리지 상품:', localProducts);
      const count = await migrateProductsFromLocalStorage();
      
      if (count === 0) {
        alert(`마이그레이션 결과: ${count}개 상품이 이동되었습니다.\n\n이미 모든 상품이 API 서버에 존재하는 것으로 보입니다.\n브라우저 콘솔을 확인해주세요.`);
      } else {
        alert(`마이그레이션 완료: ${count}개 상품이 API 서버로 이동되었습니다.\n페이지를 새로고침해주세요.`);
        window.location.reload();
      }
    } catch (error) {
      console.error('마이그레이션 실패:', error);
      alert('마이그레이션에 실패했습니다. 브라우저 콘솔을 확인해주세요.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProducts();
    setIsRefreshing(false);
  };

  useEffect(() => {
    let mounted = true;
    const initialRefresh = async () => {
      setIsRefreshing(true);
      await refreshProducts();
      if (mounted) {
        setIsRefreshing(false);
      }
    };
    initialRefresh();

    // 화면이 보일 때만 60초마다 새로고침 (숨겨진 탭에서는 쉼)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !pauseAutoRefreshRef.current) {
        refreshProducts();
      }
    }, AUTO_REFRESH_MS);

    // 창 포커스 시 새로고침 (5초 이내 중복 방지)
    let lastFocusRefresh = Date.now();
    const onFocus = () => {
      if (pauseAutoRefreshRef.current) return;
      const now = Date.now();
      if (now - lastFocusRefresh >= FOCUS_REFRESH_MIN_GAP_MS) {
        lastFocusRefresh = now;
        refreshProducts();
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshProducts]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">상품 목록</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRefreshing ? '새로고침 중...' : '새로고침'}
          </button>
          {hasLocalProducts && (
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMigrating ? '마이그레이션 중...' : `로컬 상품 마이그레이션 (${localProducts.length}개)`}
            </button>
          )}
          <button
            onClick={() => navigate('/products/new')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-medium"
          >
            상품 등록
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6 flex flex-col gap-3">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="상품명, 설명, 태그로 검색..."
          className="w-full max-w-full md:max-w-xl 2xl:max-w-2xl px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="상태 거르기"
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">상태: 전체</option>
            <option value="published">공개</option>
            <option value="draft">초안</option>
            <option value="hidden">숨김</option>
            <option value="needs_classification">분류 필요</option>
            <option value="no_bookable">공개 중 · 판매처 모두 중지</option>
            <option value="recommended">추천</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="카테고리 거르기"
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="">카테고리: 전체</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            aria-label="지역 거르기"
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="">지역: 전체</option>
            {locationOptions.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="정렬"
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="default">정렬: 기본</option>
            <option value="views-desc">조회수 높은 순</option>
            <option value="views-asc">조회수 낮은 순</option>
            <option value="name-asc">이름 순</option>
            <option value="id-desc">상품번호 최신 순</option>
          </select>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        {filteredProducts.length > 0 ? (
          <table className="min-w-[1100px] xl:min-w-full xl:table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="xl:w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품번호
                </th>
                <th className="xl:w-[34%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품명
                </th>
                <th className="xl:w-[17%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="xl:w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  지역
                </th>
                <th className="xl:w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="xl:w-[7%] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  조회수
                </th>
                <th className="xl:w-[10%] px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-bold text-blue-600">{product.id}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="text-xs font-medium text-gray-900 truncate" title={product.name}>
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2 break-words" title={product.description}>
                      {product.description}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="text-xs text-gray-900 truncate" title={product.categories.join(', ')}>
                      {product.categories.slice(0, 2).join(', ')}
                      {product.categories.length > 2 && ` +${product.categories.length - 2}`}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="text-xs text-gray-900 truncate" title={product.locations.join(', ')}>
                      {product.locations.slice(0, 2).join(', ')}
                      {product.locations.length > 2 && ` +${product.locations.length - 2}`}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex gap-2">
                      {product.isRecommended && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">추천</span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE[publishStatusOf(product)].tone}`}>{STATUS_BADGE[publishStatusOf(product)].label}</span>
                      {product.visibilitySync?.state === 'pending' && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full" title="서버 주소에는 바로 반영됐어요. 검색용 페이지·CDN은 메인 사이트 다시 빌드가 끝나야 반영돼요">
                          {product.visibilitySync.to === 'published' ? '공개 반영 중' : '숨김 반영 중'}
                        </span>
                      )}
                      {publishStatusOf(product) === 'published' && product.bookable === 'none' && (
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full" title="모든 판매처의 판매 중지가 확인됨 — 손님 목록에서 빠지고 상세는 안내만">판매처 모두 중지</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-center text-xs text-gray-600 whitespace-nowrap">
                    <span className="inline-flex min-w-10 justify-center rounded-md bg-gray-100 px-2 py-1 font-medium">
                      {product.views}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-right text-xs font-medium whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/products/${product.id}`)}
                        className="rounded-md border border-blue-200 px-2.5 py-1 text-blue-600 hover:bg-blue-50"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {products.length > 0 ? '조건에 맞는 상품이 없습니다.' : '등록된 상품이 없습니다.'}
            </p>
          </div>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className="mt-4 text-xs text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              총 {filteredProducts.length}개의 상품 ({currentPage}/{totalPages} 페이지, 한 번에 {PAGE_SIZE}개)
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage <= 1}
                className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                처음
              </button>
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={n === currentPage ? 'page' : undefined}
                  className={`rounded-md border px-3 py-1 ${
                    n === currentPage
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                끝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
