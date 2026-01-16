import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCategories } from '../context/CategoryContext';
import { useLocations } from '../context/LocationContext';
import { Product } from '@tourstream/shared';

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { addProduct, updateProduct, getProduct } = useProducts();
  const { mainCategories, subCategories } = useCategories();
  const { countries, regions } = useLocations();

  const isEdit = !!id;
  const product = id ? getProduct(id) : null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    images: [''],
    categories: [] as string[],
    locations: [] as string[],
    tags: [] as string[],
    isRecommended: false,
    isAvailable: true,
    externalUrl1: '',
    externalUrl2: '',
    externalUrl3: '',
    externalUrl4: '',
    externalUrl5: '',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        images: product.images.length > 0 ? product.images : [''],
        categories: product.categories,
        locations: product.locations,
        tags: product.tags,
        isRecommended: product.isRecommended,
        isAvailable: product.isAvailable,
        externalUrl1: product.externalUrl1 || '',
        externalUrl2: product.externalUrl2 || '',
        externalUrl3: product.externalUrl3 || '',
        externalUrl4: product.externalUrl4 || '',
        externalUrl5: product.externalUrl5 || '',
      });
    }
  }, [product, id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const productData: Omit<Product, 'id' | 'views'> = {
      name: formData.name,
      description: formData.description,
      images: formData.images.filter(img => img.trim() !== ''),
      categories: formData.categories,
      locations: formData.locations,
      tags: formData.tags,
      isRecommended: formData.isRecommended,
      isAvailable: formData.isAvailable,
      externalUrl1: formData.externalUrl1 || undefined,
      externalUrl2: formData.externalUrl2 || undefined,
      externalUrl3: formData.externalUrl3 || undefined,
      externalUrl4: formData.externalUrl4 || undefined,
      externalUrl5: formData.externalUrl5 || undefined,
    };

    if (isEdit && id) {
      updateProduct(id, productData);
    } else {
      addProduct(productData);
    }

    navigate('/products');
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const toggleCategory = (category: string) => {
    if (formData.categories.includes(category)) {
      setFormData({ ...formData, categories: formData.categories.filter(c => c !== category) });
    } else {
      setFormData({ ...formData, categories: [...formData.categories, category] });
    }
  };

  const toggleLocation = (location: string) => {
    if (formData.locations.includes(location)) {
      setFormData({ ...formData, locations: formData.locations.filter(l => l !== location) });
    } else {
      setFormData({ ...formData, locations: [...formData.locations, location] });
    }
  };

  // 모든 카테고리와 지역 목록 생성
  const allCategories = [
    ...mainCategories.map(c => c.name),
    ...subCategories.map(c => c.name),
  ];
  const allLocations = [
    ...countries.map(c => c.name),
    ...regions.map(r => r.name),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? '상품 수정' : '상품 등록'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* 상품명 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            상품명 *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            설명 *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* 이미지 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            이미지 URL
          </label>
          {formData.images.map((image, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={image}
                onChange={(e) => {
                  const newImages = [...formData.images];
                  newImages[index] = e.target.value;
                  setFormData({ ...formData, images: newImages });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="이미지 URL"
              />
              {formData.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newImages = formData.images.filter((_, i) => i !== index);
                    setFormData({ ...formData, images: newImages });
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, images: [...formData.images, ''] })}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            이미지 추가
          </button>
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            카테고리
          </label>
          <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
            {allCategories.length > 0 ? (
              <div className="space-y-2">
                {allCategories.map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="mr-2"
                    />
                    <span className="text-xs text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">등록된 카테고리가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 지역 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            지역
          </label>
          <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
            {allLocations.length > 0 ? (
              <div className="space-y-2">
                {allLocations.map((location) => (
                  <label key={location} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.locations.includes(location)}
                      onChange={() => toggleLocation(location)}
                      className="mr-2"
                    />
                    <span className="text-xs text-gray-700">{location}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">등록된 지역이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 태그 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            태그
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="태그 입력 후 Enter"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-blue-700 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 예약 URL */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-700">예약 URL</label>
          {[1, 2, 3, 4, 5].map((num) => (
            <input
              key={num}
              type="url"
              value={formData[`externalUrl${num}` as keyof typeof formData] as string}
              onChange={(e) => setFormData({ ...formData, [`externalUrl${num}`]: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`예약 URL ${num}`}
            />
          ))}
        </div>

        {/* 옵션 */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isRecommended}
              onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })}
              className="mr-2"
            />
            <span className="text-xs text-gray-700">추천 상품</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="mr-2"
            />
            <span className="text-xs text-gray-700">활성화</span>
          </label>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-medium"
          >
            {isEdit ? '수정하기' : '등록하기'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
