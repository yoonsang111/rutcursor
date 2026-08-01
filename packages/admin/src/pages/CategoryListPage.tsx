import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';

export default function CategoryListPage() {
  const navigate = useNavigate();
  const {
    mainCategories,
    deleteMainCategory,
    deleteSubCategory,
    updateMainCategory,
    updateSubCategory,
    getSubCategoriesByMain,
  } = useCategories();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedMainCategories, setExpandedMainCategories] = useState<Set<string>>(new Set());

  const filteredMainCategories = mainCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    getSubCategoriesByMain(cat.id).some(sub => 
      sub.name.toLowerCase().includes(searchKeyword.toLowerCase())
    )
  );

  const toggleMainCategory = (mainId: string) => {
    const newExpanded = new Set(expandedMainCategories);
    if (newExpanded.has(mainId)) {
      newExpanded.delete(mainId);
    } else {
      newExpanded.add(mainId);
    }
    setExpandedMainCategories(newExpanded);
  };

  const handleEdit = (id: string, name: string) => {
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

  const handleDelete = (id: string, isMain: boolean, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
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

      {/* 아코디언 형태의 카테고리 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredMainCategories.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredMainCategories.map((main) => {
              const subCategoriesList = getSubCategoriesByMain(main.id);
              const isExpanded = expandedMainCategories.has(main.id);
              const isEditing = editingId === main.id;
              const filteredSubs = subCategoriesList.filter(sub =>
                !searchKeyword || sub.name.toLowerCase().includes(searchKeyword.toLowerCase())
              );

              return (
                <div key={main.id} className="border-b border-gray-200 last:border-b-0">
                  {/* 대분류 헤더 */}
                  <div
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => !isEditing && toggleMainCategory(main.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm font-medium text-gray-900">{main.name}</span>
                          <span className="text-xs text-gray-500">({subCategoriesList.length}개 소분류)</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(main.id, true)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(main.id, main.name);
                            }}
                            className="px-3 py-1 text-xs text-blue-600 hover:text-blue-900"
                          >
                            수정
                          </button>
                          <button
                            onClick={(e) => handleDelete(main.id, true, e)}
                            disabled={subCategoriesList.length > 0}
                            className="px-3 py-1 text-xs text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={subCategoriesList.length > 0 ? '소분류가 있어 삭제할 수 없습니다' : ''}
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 소분류 목록 (아코디언) */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-200">
                      {filteredSubs.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {filteredSubs.map((sub) => {
                            const isSubEditing = editingId === sub.id;
                            return (
                              <div key={sub.id} className="px-6 py-3 pl-14 hover:bg-gray-100">
                                <div className="flex items-center justify-between">
                                  {isSubEditing ? (
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-700">{sub.name}</span>
                                  )}
                                  <div className="flex items-center gap-2 ml-4">
                                    {isSubEditing ? (
                                      <>
                                        <button
                                          onClick={() => handleSaveEdit(sub.id, false)}
                                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                          저장
                                        </button>
                                        <button
                                          onClick={() => setEditingId(null)}
                                          className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                        >
                                          취소
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleEdit(sub.id, sub.name)}
                                          className="px-3 py-1 text-xs text-blue-600 hover:text-blue-900"
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={() => handleDelete(sub.id, false)}
                                          className="px-3 py-1 text-xs text-red-600 hover:text-red-900"
                                        >
                                          삭제
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-6 py-4 pl-14 text-sm text-gray-500">
                          {searchKeyword ? '검색 결과가 없습니다.' : '등록된 소분류가 없습니다.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">등록된 대분류가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
