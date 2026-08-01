import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLocations } from '../context/LocationContext';
import { Country, Region } from '@tourstream/shared';

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const MIN_IMAGE_WIDTH = 1200;
const MIN_IMAGE_HEIGHT = 675;
const RECOMMENDED_RATIO = 16 / 9;
const RATIO_TOLERANCE = 0.12;

const readImageMeta = (file: File): Promise<{ dataUrl: string; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) {
        reject(new Error('이미지를 읽을 수 없습니다.'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          width: Number(img.width || 0),
          height: Number(img.height || 0),
        });
      };
      img.onerror = () => reject(new Error('유효한 이미지 파일이 아닙니다.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('이미지 파일 읽기에 실패했습니다.'));
    reader.readAsDataURL(file);
  });

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
    image: '',
  });
  const [imageGuideMessage, setImageGuideMessage] = useState('');

  useEffect(() => {
    if (location) {
      if (isRegion) {
        const region = location as Region;
        setFormData({ name: region.name, countryId: region.countryId, image: region.image || '' });
      } else {
        const country = location as Country;
        setFormData({ name: country.name, countryId: '', image: country.image || '' });
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
        updateRegion(id, formData.name, formData.image);
      } else {
        updateCountry(id, formData.name, formData.image);
      }
    } else {
      if (isRegion) {
        addRegion(formData.name, formData.countryId, formData.image);
      } else {
        addCountry(formData.name, formData.image);
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

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            {isRegion ? '지역 대표 이미지' : '국가 대표 이미지'}
          </label>
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_IMAGE_SIZE_BYTES) {
                  alert('이미지 용량은 3MB 이하만 업로드할 수 있습니다.');
                  return;
                }
                try {
                  const { dataUrl, width, height } = await readImageMeta(file);
                  if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
                    alert(`이미지 해상도는 최소 ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} 이상이어야 합니다.`);
                    return;
                  }
                  const ratio = width / height;
                  const ratioDiff = Math.abs(ratio - RECOMMENDED_RATIO);
                  if (ratioDiff > RATIO_TOLERANCE) {
                    setImageGuideMessage(`권장 비율(16:9)과 다릅니다. 현재 비율: ${ratio.toFixed(2)}:1`);
                  } else {
                    setImageGuideMessage('권장 비율(16:9)에 맞는 이미지입니다.');
                  }
                  setFormData((prev) => ({ ...prev, image: dataUrl }));
                } catch (error: any) {
                  alert(error?.message || '이미지 검증 중 오류가 발생했습니다.');
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
            <input
              type="url"
              value={formData.image}
              onChange={(e) => {
                setFormData({ ...formData, image: e.target.value });
                setImageGuideMessage('URL 입력 이미지는 용량/해상도 자동 검증 대상이 아닙니다.');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="또는 이미지 URL 입력"
            />
            <div className="text-xs text-gray-500">
              업로드 기준: 3MB 이하 / 최소 {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT} / 권장 비율 16:9
            </div>
            {imageGuideMessage && (
              <div className="text-xs text-blue-600">{imageGuideMessage}</div>
            )}
            {formData.image && (
              <img
                src={formData.image}
                alt={`${isRegion ? '지역' : '국가'} 대표 이미지 미리보기`}
                className="w-full max-w-xs h-32 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
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
