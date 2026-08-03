import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCategories } from '../context/CategoryContext';
import { useLocations } from '../context/LocationContext';
import { Product, PartnerLink } from '@tourstream/shared';
import { api } from '../utils/api';

const KNOWN_PARTNER_NAMES = ['마이리얼트립', 'KLOOK', 'KKday', 'GetYourGuide', '트립닷컴'];

// API 연동으로 검색 가능한 파트너 목록. 나중에 파트너가 늘어나면 여기에만 추가하면 됨.
const PARTNER_API_OPTIONS = [{ key: 'myrealtrip', label: '마이리얼트립' }];

const emptyPartnerLink = (): PartnerLink => ({ partner: '', url: '', source: 'manual' });

interface PartnerSearchResult {
  externalId: string;
  name: string;
  price?: number;
  priceDisplay?: string;
  url: string;
  thumbnail?: string;
  rating?: number;
  reviewCount?: number;
}

interface PartnerSearchState {
  index: number;
  partnerKey: string;
  keyword: string;
  results: PartnerSearchResult[];
  loading: boolean;
  error: string;
}

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function buildFormStateFromProduct(product: Product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const locations = Array.isArray(product.locations) ? product.locations : [];
  const tags = Array.isArray(product.tags) ? product.tags : [];
  return {
    name: product.name || '',
    description: product.description || '',
    price: product.price !== undefined ? String(product.price) : '',
    rating: product.rating !== undefined ? String(product.rating) : '',
    images: images.length > 0 ? images : [''],
    categories,
    locations,
    tags,
    isRecommended: Boolean(product.isRecommended),
    isAvailable: product.isAvailable !== false,
    partnerLinks: Array.isArray(product.partnerLinks) && product.partnerLinks.length > 0
      ? product.partnerLinks
      : [emptyPartnerLink()],
  };
}

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { addProduct, updateProduct, getProduct } = useProducts();
  const { mainCategories, getSubCategoriesByMain } = useCategories();
  const { countries, getRegionsByCountry } = useLocations();

  const isEdit = !!id;
  const product = id ? getProduct(id) : null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    rating: '',
    images: [''],
    categories: [] as string[],
    locations: [] as string[],
    tags: [] as string[],
    isRecommended: false,
    isAvailable: true,
    partnerLinks: [emptyPartnerLink()] as PartnerLink[],
  });

  const [tagInput, setTagInput] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [expandedMainCategories, setExpandedMainCategories] = useState<Set<string>>(new Set());
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [partnerSearch, setPartnerSearch] = useState<PartnerSearchState | null>(null);

  useEffect(() => {
    if (product) {
      setFormData(buildFormStateFromProduct(product));
    }
  }, [product, id]);

  // 목록 로드 전에 상세 URL로 진입한 경우 등: 컨텍스트에 없으면 API에서 직접 로드
  useEffect(() => {
    if (!isEdit || !id || product) return;
    let cancelled = false;
    (async () => {
      try {
        const p = (await api.getProduct(id)) as Product;
        if (!cancelled && p) {
          setFormData(buildFormStateFromProduct(p));
        }
      } catch {
        // 컨텍스트 동기화 후에도 없으면 사용자가 저장 시도 시 서버 메시지로 안내
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.categories.length === 0) {
      alert('카테고리를 최소 1개 이상 선택해주세요.');
      return;
    }

    if (formData.locations.length === 0) {
      alert('지역을 최소 1개 이상 선택해주세요.');
      return;
    }

    const partnerLinks = formData.partnerLinks
      .map((link) => ({ ...link, partner: link.partner.trim(), url: link.url.trim() }))
      .filter((link) => link.url !== '');
    if (partnerLinks.length === 0) {
      alert('예약 URL을 최소 1개 이상 입력해주세요.');
      return;
    }

    const productData: Omit<Product, 'id' | 'views'> = {
      name: formData.name,
      description: formData.description,
      price: parseOptionalNumber(formData.price),
      rating: parseOptionalNumber(formData.rating),
      images: formData.images.filter(img => img.trim() !== ''),
      categories: formData.categories,
      locations: formData.locations,
      tags: formData.tags,
      isRecommended: formData.isRecommended,
      isAvailable: formData.isAvailable,
      partnerLinks,
    };

    try {
      if (isEdit && id) {
        await updateProduct(id, productData);
      } else {
        await addProduct(productData);
      }
      navigate('/products');
    } catch (error: any) {
      console.error('상품 저장 실패:', error);
      const message = typeof error?.message === 'string' && error.message.trim()
        ? error.message
        : '상품 저장에 실패했습니다. 다시 시도해주세요.';
      alert(message);
    }
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

  const addPartnerLink = () => {
    setFormData({ ...formData, partnerLinks: [...formData.partnerLinks, emptyPartnerLink()] });
  };

  const removePartnerLink = (index: number) => {
    setFormData({ ...formData, partnerLinks: formData.partnerLinks.filter((_, i) => i !== index) });
  };

  const updatePartnerLink = (index: number, field: 'partner' | 'url' | 'price', value: string) => {
    const partnerLinks = formData.partnerLinks.map((link, i) => {
      if (i !== index) return link;
      if (field === 'price') {
        const parsed = parseOptionalNumber(value);
        return { ...link, price: parsed };
      }
      return { ...link, [field]: value };
    });
    setFormData({ ...formData, partnerLinks });
  };

  const openPartnerSearch = (index: number, partnerKey: string) => {
    setPartnerSearch({ index, partnerKey, keyword: formData.partnerLinks[index]?.partner || '', results: [], loading: false, error: '' });
  };

  const closePartnerSearch = () => setPartnerSearch(null);

  const runPartnerSearch = async () => {
    if (!partnerSearch || !partnerSearch.keyword.trim()) return;
    setPartnerSearch({ ...partnerSearch, loading: true, error: '' });
    try {
      const results = await api.searchPartnerProducts(partnerSearch.partnerKey, partnerSearch.keyword.trim());
      setPartnerSearch((prev) => (prev ? { ...prev, results, loading: false } : prev));
    } catch (error: any) {
      setPartnerSearch((prev) => (prev ? { ...prev, loading: false, error: error?.message || '검색에 실패했습니다' } : prev));
    }
  };

  const selectPartnerSearchResult = async (result: PartnerSearchResult) => {
    if (!partnerSearch) return;
    const { index, partnerKey } = partnerSearch;
    const partnerLabel = PARTNER_API_OPTIONS.find((option) => option.key === partnerKey)?.label || partnerKey;

    let trackedUrl = result.url;
    try {
      trackedUrl = await api.createPartnerTrackedLink(partnerKey, result.url);
    } catch (error) {
      console.error('[ProductFormPage] 추적 링크 생성 실패, 원본 URL 사용:', error);
    }

    const partnerLinks = formData.partnerLinks.map((link, i) =>
      i === index
        ? {
            partner: partnerLabel,
            url: trackedUrl,
            source: 'api' as const,
            externalId: result.externalId,
            price: result.price,
            priceDisplay: result.priceDisplay,
            updatedAt: new Date().toISOString(),
          }
        : link,
    );

    // 아직 이미지를 하나도 안 넣었으면 검색 결과의 썸네일을 기본값으로 채워줌 (직접 입력한 이미지는 덮어쓰지 않음)
    const hasImage = formData.images.some((img) => img.trim() !== '');
    const images = !hasImage && result.thumbnail ? [result.thumbnail] : formData.images;

    setFormData({ ...formData, partnerLinks, images });
    closePartnerSearch();
  };

  const disconnectPartnerApi = (index: number) => {
    const partnerLinks = formData.partnerLinks.map((link, i) => {
      if (i !== index) return link;
      const { source, externalId, price, priceDisplay, updatedAt, ...rest } = link;
      return { ...rest, source: 'manual' as const };
    });
    setFormData({ ...formData, partnerLinks });
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

  const toggleMainCategory = (mainId: string) => {
    const newExpanded = new Set(expandedMainCategories);
    if (newExpanded.has(mainId)) {
      newExpanded.delete(mainId);
    } else {
      newExpanded.add(mainId);
    }
    setExpandedMainCategories(newExpanded);
  };

  const toggleCountry = (countryId: string) => {
    const newExpanded = new Set(expandedCountries);
    if (newExpanded.has(countryId)) {
      newExpanded.delete(countryId);
    } else {
      newExpanded.add(countryId);
    }
    setExpandedCountries(newExpanded);
  };

  // 검색 필터링된 카테고리
  const filteredMainCategories = useMemo(() => {
    if (!categorySearch.trim()) return mainCategories;
    
    const searchLower = categorySearch.toLowerCase();
    return mainCategories.filter(main => {
      const mainMatch = main.name.toLowerCase().includes(searchLower);
      const subs = getSubCategoriesByMain(main.id);
      const subMatch = subs.some(sub => sub.name.toLowerCase().includes(searchLower));
      return mainMatch || subMatch;
    });
  }, [mainCategories, categorySearch, getSubCategoriesByMain]);

  // 검색 필터링된 국가
  const filteredCountries = useMemo(() => {
    if (!locationSearch.trim()) return countries;
    
    const searchLower = locationSearch.toLowerCase();
    return countries.filter(country => {
      const countryMatch = country.name.toLowerCase().includes(searchLower);
      const regs = getRegionsByCountry(country.id);
      const regionMatch = regs.some(region => region.name.toLowerCase().includes(searchLower));
      return countryMatch || regionMatch;
    });
  }, [countries, locationSearch, getRegionsByCountry]);

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

        {/* 가격/평점 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              대표 가격 (원)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="예: 55000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              평점 (선택)
            </label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="예: 4.8"
            />
          </div>
        </div>

        {/* 이미지 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            이미지
          </label>
          <div className="space-y-3">
            {formData.images.map((image, index) => (
              <div key={index} className="border border-gray-300 rounded-lg p-4">
                <div className="flex gap-2 mb-2">
                  {/* 파일 업로드 */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = reader.result as string;
                          const newImages = [...formData.images];
                          newImages[index] = base64String;
                          setFormData({ ...formData, images: newImages });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  />
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = formData.images.filter((_, i) => i !== index);
                        setFormData({ ...formData, images: newImages });
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs"
                    >
                      삭제
                    </button>
                  )}
                </div>
                {/* 이미지 미리보기 */}
                {image && (
                  <div className="mt-2">
                    <img
                      src={image}
                      alt={`미리보기 ${index + 1}`}
                      className="max-w-xs max-h-32 object-cover rounded border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {/* URL 입력 (선택사항) */}
                <div className="mt-2">
                  <input
                    type="text"
                    value={image.startsWith('data:') ? '' : image}
                    onChange={(e) => {
                      const newImages = [...formData.images];
                      newImages[index] = e.target.value;
                      setFormData({ ...formData, images: newImages });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    placeholder="또는 이미지 URL 입력"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, images: [...formData.images, ''] })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
            >
              이미지 추가
            </button>
          </div>
        </div>

        {/* 카테고리 - 검색 + 아코디언 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            카테고리
          </label>
          <div className="mb-3">
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="카테고리 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
            {filteredMainCategories.length > 0 ? (
              <div className="space-y-2">
                {filteredMainCategories.map((main) => {
                  const subs = getSubCategoriesByMain(main.id);
                  const isExpanded = expandedMainCategories.has(main.id);
                  const searchLower = categorySearch.toLowerCase();
                  const filteredSubs = subs.filter(sub =>
                    !categorySearch || sub.name.toLowerCase().includes(searchLower)
                  );
                  const mainSelected = formData.categories.includes(main.name);

                  return (
                    <div key={main.id} className="border-b border-gray-200 last:border-b-0 pb-2 last:pb-0">
                      {/* 대분류 */}
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => toggleMainCategory(main.id)}
                          className="flex items-center gap-2 flex-1 text-left hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <label className="flex items-center gap-2 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mainSelected}
                              onChange={() => toggleCategory(main.name)}
                              onClick={(e) => e.stopPropagation()}
                              className="mr-1"
                            />
                            <span className="text-sm font-medium text-gray-900">{main.name}</span>
                            {filteredSubs.length > 0 && (
                              <span className="text-xs text-gray-500">({filteredSubs.length}개 소분류)</span>
                            )}
                          </label>
                        </button>
                      </div>
                      {/* 소분류 */}
                      {isExpanded && filteredSubs.length > 0 && (
                        <div className="ml-6 space-y-1 mt-1">
                          {filteredSubs.map((sub) => (
                            <label key={sub.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                              <input
                                type="checkbox"
                                checked={formData.categories.includes(sub.name)}
                                onChange={() => toggleCategory(sub.name)}
                                className="mr-1"
                              />
                              <span className="text-xs text-gray-700">{sub.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500">등록된 카테고리가 없습니다.</p>
            )}
          </div>
          {/* 선택된 카테고리 표시 */}
          {formData.categories.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-600 mb-2">선택된 카테고리:</div>
              <div className="flex flex-wrap gap-2">
                {formData.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 지역 - 검색 + 아코디언 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            지역
          </label>
          <div className="mb-3">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="지역 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              <div className="space-y-2">
                {filteredCountries.map((country) => {
                  const regs = getRegionsByCountry(country.id);
                  const isExpanded = expandedCountries.has(country.id);
                  const searchLower = locationSearch.toLowerCase();
                  const filteredRegs = regs.filter(region =>
                    !locationSearch || region.name.toLowerCase().includes(searchLower)
                  );
                  const countrySelected = formData.locations.includes(country.name);

                  return (
                    <div key={country.id} className="border-b border-gray-200 last:border-b-0 pb-2 last:pb-0">
                      {/* 국가 */}
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => toggleCountry(country.id)}
                          className="flex items-center gap-2 flex-1 text-left hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <label className="flex items-center gap-2 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={countrySelected}
                              onChange={() => toggleLocation(country.name)}
                              onClick={(e) => e.stopPropagation()}
                              className="mr-1"
                            />
                            <span className="text-sm font-medium text-gray-900">{country.name}</span>
                            {filteredRegs.length > 0 && (
                              <span className="text-xs text-gray-500">({filteredRegs.length}개 지역)</span>
                            )}
                          </label>
                        </button>
                      </div>
                      {/* 지역 */}
                      {isExpanded && filteredRegs.length > 0 && (
                        <div className="ml-6 space-y-1 mt-1">
                          {filteredRegs.map((region) => (
                            <label key={region.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                              <input
                                type="checkbox"
                                checked={formData.locations.includes(region.name)}
                                onChange={() => toggleLocation(region.name)}
                                className="mr-1"
                              />
                              <span className="text-xs text-gray-700">{region.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500">등록된 지역이 없습니다.</p>
            )}
          </div>
          {/* 선택된 지역 표시 */}
          {formData.locations.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-600 mb-2">선택된 지역:</div>
              <div className="flex flex-wrap gap-2">
                {formData.locations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                  >
                    {loc}
                    <button
                      type="button"
                      onClick={() => toggleLocation(loc)}
                      className="text-green-700 hover:text-green-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
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

        {/* 예약 URL (파트너 링크) */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-700">예약 URL</label>
          <datalist id="known-partner-names">
            {KNOWN_PARTNER_NAMES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="space-y-3">
            {formData.partnerLinks.map((link, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                {link.source === 'api' ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900">{link.partner}</span>
                        <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-sm font-bold">API 연동됨</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {link.priceDisplay || (link.price !== undefined ? `${link.price.toLocaleString()}원` : '가격 정보 없음')}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => disconnectPartnerApi(index)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                      >
                        연동 해제
                      </button>
                      <button
                        type="button"
                        onClick={() => removePartnerLink(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        list="known-partner-names"
                        value={link.partner}
                        onChange={(e) => updatePartnerLink(index, 'partner', e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="파트너명"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updatePartnerLink(index, 'url', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="예약 URL"
                      />
                      <button
                        type="button"
                        onClick={() => removePartnerLink(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs shrink-0"
                      >
                        삭제
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={link.price !== undefined ? String(link.price) : ''}
                      onChange={(e) => updatePartnerLink(index, 'price', e.target.value)}
                      className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      placeholder="가격(원, 선택) - 알고 있으면 입력"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {PARTNER_API_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => openPartnerSearch(index, option.key)}
                          className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 text-xs font-medium"
                        >
                          {option.label} API로 검색해서 연결
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {partnerSearch?.index === index && (
                  <div className="mt-2 border border-cyan-200 bg-cyan-50/50 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={partnerSearch.keyword}
                        onChange={(e) => setPartnerSearch({ ...partnerSearch, keyword: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runPartnerSearch())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs"
                        placeholder="검색 키워드 (예: 오사카 유니버설 스튜디오)"
                      />
                      <button
                        type="button"
                        onClick={runPartnerSearch}
                        disabled={partnerSearch.loading}
                        className="px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-xs disabled:opacity-50"
                      >
                        {partnerSearch.loading ? '검색 중...' : '검색'}
                      </button>
                      <button
                        type="button"
                        onClick={closePartnerSearch}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                      >
                        닫기
                      </button>
                    </div>
                    {partnerSearch.error && <p className="text-xs text-red-600">{partnerSearch.error}</p>}
                    {partnerSearch.results.length > 0 && (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {partnerSearch.results.map((result) => (
                          <button
                            key={result.externalId}
                            type="button"
                            onClick={() => selectPartnerSearchResult(result)}
                            className="w-full flex items-center justify-between gap-2 p-2 bg-white border border-gray-200 rounded-lg hover:border-cyan-300 text-left"
                          >
                            <span className="text-xs text-gray-800 truncate">{result.name}</span>
                            <span className="text-xs font-semibold text-gray-900 shrink-0">
                              {result.priceDisplay || (result.price !== undefined ? `${result.price.toLocaleString()}원` : '-')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPartnerLink}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
          >
            파트너 추가
          </button>
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
