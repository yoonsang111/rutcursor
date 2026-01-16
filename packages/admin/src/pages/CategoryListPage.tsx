import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';

export default function CategoryListPage() {
  const navigate = useNavigate();
  const {
    mainCategories,
    subCategories,
    deleteMainCategory,
    deleteSubCategory,
    updateMainCategory,
    updateSubCategory,
    getSubCategoriesByMain,
  } = useCategories();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredMainCategories = mainCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );
  const filteredSubCategories = subCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const handleEdit = (id: string, name: string, isMain: boolean) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = (id: string, isMain: boolean) => {
    if (isMain) {
      updateMainCategory(id, editName);
    } else {
      updateSubCategory(id, editName);
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string, isMain: boolean) => {
    if (isMain) {
      const success = deleteMainCategory(id);
      if (!success) {
        alert('소분류가 등록된 대분류는 삭제할 수 없습니다.');
      }
    } else {
      if (window.confirm('정말 삭제하시겠습니까?')) {
        deleteSubCategory(id);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">카테고리 목록</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/categories/new?type=main')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            대분류 등록
          </button>
          <button
            onClick={() => navigate('/categories/new?type=sub')}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
          >
            소분류 등록
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="카테고리명으로 검색..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 대분류 목록 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">대분류</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredMainCategories.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">소분류 수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMainCategories.map((main) => {
                  const subCount = getSubCategoriesByMain(main.id).length;
                  const isEditing = editingId === main.id;
                  return (
                    <tr key={main.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div className="text-xs font-medium text-gray-900">{main.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{subCount}개</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(main.id, true)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(main.id, main.name, true)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(main.id, true)}
                              className="text-red-600 hover:text-red-900"
                              disabled={subCount > 0}
                              title={subCount > 0 ? '소분류가 있어 삭제할 수 없습니다' : ''}
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">등록된 대분류가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 소분류 목록 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">소분류</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredSubCategories.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">대분류</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubCategories.map((sub) => {
                  const mainCategory = mainCategories.find(m => m.id === sub.mainCategoryId);
                  const isEditing = editingId === sub.id;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div className="text-xs font-medium text-gray-900">{sub.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{mainCategory?.name || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(sub.id, false)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(sub.id, sub.name, false)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id, false)}
                              className="text-red-600 hover:text-red-900"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">등록된 소분류가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
