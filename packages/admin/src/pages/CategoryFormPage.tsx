import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCategories } from '../context/CategoryContext';
import { MainCategory, SubCategory } from '@tourstream/shared';

export default function CategoryFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') as 'main' | 'sub' | null;
  const navigate = useNavigate();
  const {
    mainCategories,
    subCategories,
    addMainCategory,
    addSubCategory,
    updateMainCategory,
    updateSubCategory,
    getMainCategory,
  } = useCategories();

  const isEdit = !!id;
  const categoryType = type || (isEdit ? (subCategories.find(s => s.id === id) ? 'sub' : 'main') : 'main');
  const isSubCategory = categoryType === 'sub';

  const mainCategory = isEdit && isSubCategory
    ? subCategories.find(s => s.id === id)
    : isEdit
    ? mainCategories.find(m => m.id === id)
    : null;

  const [formData, setFormData] = useState({
    name: '',
    mainCategoryId: '',
  });

  useEffect(() => {
    if (mainCategory) {
      if (isSubCategory) {
        const sub = mainCategory as SubCategory;
        setFormData({ name: sub.name, mainCategoryId: sub.mainCategoryId });
      } else {
        const main = mainCategory as MainCategory;
        setFormData({ name: main.name, mainCategoryId: '' });
      }
    }
  }, [mainCategory, isSubCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubCategory && !formData.mainCategoryId) {
      alert('대분류를 선택해주세요.');
      return;
    }

    if (isEdit && id) {
      if (isSubCategory) {
        updateSubCategory(id, formData.name);
      } else {
        updateMainCategory(id, formData.name);
      }
    } else {
      if (isSubCategory) {
        addSubCategory(formData.name, formData.mainCategoryId);
      } else {
        addMainCategory(formData.name);
      }
    }

    navigate('/categories');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? '카테고리 수정' : '카테고리 등록'} ({isSubCategory ? '소분류' : '대분류'})
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6 max-w-2xl">
        {/* 대분류 선택 (소분류인 경우) */}
        {isSubCategory && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              대분류 선택 *
            </label>
            {mainCategories.length > 0 ? (
              <select
                value={formData.mainCategoryId}
                onChange={(e) => setFormData({ ...formData, mainCategoryId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isEdit}
              >
                <option value="">대분류를 선택하세요</option>
                {mainCategories.map((main) => (
                  <option key={main.id} value={main.id}>
                    {main.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  대분류가 등록되어 있지 않습니다. 먼저 대분류를 등록해주세요.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/categories/new?type=main')}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-xs"
                >
                  대분류 등록하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* 카테고리명 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            {isSubCategory ? '소분류명' : '대분류명'} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={isSubCategory ? '소분류명을 입력하세요' : '대분류명을 입력하세요'}
            required
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubCategory && !formData.mainCategoryId}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? '수정하기' : '등록하기'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
