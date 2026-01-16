import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../context/LocationContext';

export default function LocationListPage() {
  const navigate = useNavigate();
  const {
    countries,
    regions,
    deleteCountry,
    deleteRegion,
    updateCountry,
    updateRegion,
    getRegionsByCountry,
  } = useLocations();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );
  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const handleEdit = (id: string, name: string, isCountry: boolean) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = (id: string, isCountry: boolean) => {
    if (isCountry) {
      updateCountry(id, editName);
    } else {
      updateRegion(id, editName);
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string, isCountry: boolean) => {
    if (isCountry) {
      const success = deleteCountry(id);
      if (!success) {
        alert('지역이 등록된 국가는 삭제할 수 없습니다.');
      }
    } else {
      if (window.confirm('정말 삭제하시겠습니까?')) {
        deleteRegion(id);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">지역 목록</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/locations/new?type=country')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            국가 등록
          </button>
          <button
            onClick={() => navigate('/locations/new?type=region')}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
          >
            지역 등록
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="지역명으로 검색..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 국가 목록 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">국가</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredCountries.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">지역 수</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCountries.map((country) => {
                  const regionCount = getRegionsByCountry(country.id).length;
                  const isEditing = editingId === country.id;
                  return (
                    <tr key={country.id} className="hover:bg-gray-50">
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
                          <div className="text-xs font-medium text-gray-900">{country.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{regionCount}개</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(country.id, true)}
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
                              onClick={() => handleEdit(country.id, country.name, true)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(country.id, true)}
                              className="text-red-600 hover:text-red-900"
                              disabled={regionCount > 0}
                              title={regionCount > 0 ? '지역이 있어 삭제할 수 없습니다' : ''}
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
              <p className="text-gray-500">등록된 국가가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 지역 목록 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">지역</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredRegions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">국가</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegions.map((region) => {
                  const country = countries.find(c => c.id === region.countryId);
                  const isEditing = editingId === region.id;
                  return (
                    <tr key={region.id} className="hover:bg-gray-50">
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
                          <div className="text-xs font-medium text-gray-900">{region.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{country?.name || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(region.id, false)}
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
                              onClick={() => handleEdit(region.id, region.name, false)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(region.id, false)}
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
              <p className="text-gray-500">등록된 지역이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
