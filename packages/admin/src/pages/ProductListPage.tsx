import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { migrateProductsFromLocalStorage } from '../utils/migrateFromLocalStorage';
import { storage } from '../utils/storage';

export default function ProductListPage() {
  const navigate = useNavigate();
  const { products, deleteProduct, searchProducts, refreshProducts } = useProducts();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 로컬스토리지에 상품이 있는지 확인
  const localProducts = storage.getProducts();
  const hasLocalProducts = localProducts.length > 0;

  const filteredProducts = searchKeyword ? searchProducts(searchKeyword) : products;

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

    const interval = setInterval(() => {
      refreshProducts();
    }, 15000);

    const onFocus = () => {
      refreshProducts();
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
      <div className="mb-6">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="상품명, 설명, 태그로 검색..."
          className="w-full max-w-full md:max-w-xl 2xl:max-w-2xl px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
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
              {filteredProducts.map((product) => (
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
                      {product.isAvailable ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">활성</span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">비활성</span>
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
            <p className="text-gray-500">등록된 상품이 없습니다.</p>
          </div>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className="mt-4 text-xs text-gray-600">
          총 {filteredProducts.length}개의 상품
        </div>
      )}
    </div>
  );
}
