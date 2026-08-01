import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../context/LocationContext';

export default function LocationListPage() {
  const navigate = useNavigate();
  const { countries, deleteCountry, deleteRegion, getRegionsByCountry } = useLocations();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    getRegionsByCountry(country.id).some(region =>
      region.name.toLowerCase().includes(searchKeyword.toLowerCase())
    )
  );

  const toggleCountry = (countryId: string) => {
    const newExpanded = new Set(expandedCountries);
    if (newExpanded.has(countryId)) newExpanded.delete(countryId);
    else newExpanded.add(countryId);
    setExpandedCountries(newExpanded);
  };

  const handleDeleteCountry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = deleteCountry(id);
    if (!success) alert('지역이 등록된 국가는 삭제할 수 없습니다.');
  };

  const handleDeleteRegion = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) deleteRegion(id);
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

      <div className="mb-6">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="지역명으로 검색..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredCountries.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredCountries.map((country) => {
              const regionsList = getRegionsByCountry(country.id);
              const isExpanded = expandedCountries.has(country.id);
              const filteredRegs = regionsList.filter(region =>
                !searchKeyword || region.name.toLowerCase().includes(searchKeyword.toLowerCase())
              );

              return (
                <div key={country.id} className="border-b border-gray-200 last:border-b-0">
                  {/* 국가 행 */}
                  <div
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleCountry(country.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <svg
                        className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {country.image ? (
                        <img
                          src={country.image}
                          alt={`${country.name} 이미지`}
                          className="w-8 h-8 rounded-md object-cover border border-gray-200 flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
                          없음
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">{country.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">({regionsList.length}개 지역)</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/locations/${country.id}?type=country`); }}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
                      >
                        수정
                      </button>
                      <button
                        onClick={(e) => handleDeleteCountry(country.id, e)}
                        disabled={regionsList.length > 0}
                        className="px-3 py-1 text-xs text-red-600 hover:text-red-900 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={regionsList.length > 0 ? '지역이 있어 삭제할 수 없습니다' : ''}
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* 지역 목록 (아코디언) */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-200">
                      {filteredRegs.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {filteredRegs.map((region) => (
                            <div key={region.id} className="px-6 py-3 pl-14 hover:bg-gray-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  {region.image ? (
                                    <img
                                      src={region.image}
                                      alt={`${region.name} 이미지`}
                                      className="w-6 h-6 rounded object-cover border border-gray-200 flex-shrink-0"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex-shrink-0" />
                                  )}
                                  <span className="text-sm text-gray-700 truncate">{region.name}</span>
                                </div>
                                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                  <button
                                    onClick={() => navigate(`/locations/${region.id}?type=region`)}
                                    className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRegion(region.id)}
                                    className="px-3 py-1 text-xs text-red-600 hover:text-red-900"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-6 py-4 pl-14 text-sm text-gray-500">
                          {searchKeyword ? '검색 결과가 없습니다.' : '등록된 지역이 없습니다.'}
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
            <p className="text-gray-500">등록된 국가가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
