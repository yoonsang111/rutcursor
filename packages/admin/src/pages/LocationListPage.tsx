import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocations } from '../context/LocationContext';

export default function LocationListPage() {
  const navigate = useNavigate();
  const { countries, regions, deleteCountry, deleteRegion, getRegionsByCountry, fillMissingEnglishNames } = useLocations();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [filling, setFilling] = useState(false);

  // 영어 이름이 비어 있는 곳. 이 숫자가 0이 되면 아래 안내가 사라진다.
  const missingCount =
    countries.filter((c) => !String(c.englishName || '').trim()).length +
    regions.filter((r) => !String(r.englishName || '').trim()).length;

  /*
    영어 이름은 주소가 된다 (/region/osaka). 전에는 이 칸이 없어서 코드가 한글을
    소리나는 대로 옮겼고 /country/dokil 같은 주소가 나왔다. 임시로 적어 둔 표를
    데이터로 한 번만 옮긴다. 옮기고 나면 이 버튼은 사라진다.
  */
  const handleFill = async () => {
    const preview = await fillMissingEnglishNames({ dryRun: true });
    if (!preview.ok) {
      alert(`채울 수 없습니다.\n\n${preview.error}`);
      return;
    }
    if (preview.filled.length === 0) {
      alert(
        preview.noMap.length > 0
          ? `자동으로 채울 수 있는 곳이 없습니다.\n아래는 직접 입력해 주세요.\n\n${preview.noMap.slice(0, 20).join('\n')}`
          : '모두 채워져 있습니다.',
      );
      return;
    }

    const sample = preview.filled.slice(0, 12).join('\n');
    const more = preview.filled.length > 12 ? `\n… 외 ${preview.filled.length - 12}건` : '';
    const warn = preview.noMap.length > 0 ? `\n\n표에 없어 못 채우는 곳 ${preview.noMap.length}건은 직접 입력해야 합니다.` : '';
    if (!window.confirm(`${preview.filled.length}곳의 영어 이름을 채웁니다.\n이미 입력된 곳은 건드리지 않습니다.\n\n${sample}${more}${warn}\n\n저장할까요?`)) return;

    setFilling(true);
    const result = await fillMissingEnglishNames();
    setFilling(false);
    alert(result.ok ? `${result.filled.length}곳을 채웠습니다.` : `저장하지 못했습니다.\n\n${result.error}`);
  };

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
      {missingCount > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <p className="text-sm font-bold text-amber-900">영어 이름이 비어 있는 곳 {missingCount}곳</p>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              영어 이름이 주소가 됩니다. 비어 있으면 한글 발음으로 주소가 만들어지고(<code className="font-mono">/country/dokil</code>),
              그런 주소는 검색엔진에 올라가지 않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFill}
            disabled={filling}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-60"
          >
            {filling ? '채우는 중…' : '영어 이름 자동 채우기'}
          </button>
        </div>
      )}

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
