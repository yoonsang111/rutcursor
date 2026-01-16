import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLocations } from '../context/LocationContext';
import { Country, Region } from '@tourstream/shared';

export default function LocationFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') as 'country' | 'region' | null;
  const navigate = useNavigate();
  const {
    countries,
    regions,
    addCountry,
    addRegion,
    updateCountry,
    updateRegion,
    getCountry,
  } = useLocations();

  const isEdit = !!id;
  const locationType = type || (isEdit ? (regions.find(r => r.id === id) ? 'region' : 'country') : 'country');
  const isRegion = locationType === 'region';

  const location = isEdit && isRegion
    ? regions.find(r => r.id === id)
    : isEdit
    ? countries.find(c => c.id === id)
    : null;

  const [formData, setFormData] = useState({
    name: '',
    countryId: '',
  });

  useEffect(() => {
    if (location) {
      if (isRegion) {
        const region = location as Region;
        setFormData({ name: region.name, countryId: region.countryId });
      } else {
        const country = location as Country;
        setFormData({ name: country.name, countryId: '' });
      }
    }
  }, [location, isRegion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegion && !formData.countryId) {
      alert('국가를 선택해주세요.');
      return;
    }

    if (isEdit && id) {
      if (isRegion) {
        updateRegion(id, formData.name);
      } else {
        updateCountry(id, formData.name);
      }
    } else {
      if (isRegion) {
        addRegion(formData.name, formData.countryId);
      } else {
        addCountry(formData.name);
      }
    }

    navigate('/locations');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? '지역 수정' : '지역 등록'} ({isRegion ? '지역' : '국가'})
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6 max-w-2xl">
        {/* 국가 선택 (지역인 경우) */}
        {isRegion && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              국가 선택 *
            </label>
            {countries.length > 0 ? (
              <select
                value={formData.countryId}
                onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isEdit}
              >
                <option value="">국가를 선택하세요</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  국가가 등록되어 있지 않습니다. 먼저 국가를 등록해주세요.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/locations/new?type=country')}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-xs"
                >
                  국가 등록하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* 이름 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            {isRegion ? '지역명' : '국가명'} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={isRegion ? '지역명을 입력하세요' : '국가명을 입력하세요'}
            required
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isRegion && !formData.countryId}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? '수정하기' : '등록하기'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/locations')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
