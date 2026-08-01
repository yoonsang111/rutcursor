import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Country, Region } from '@tourstream/shared';
import { storage } from '../utils/storage';
import { seedCountries, seedRegions } from '../seed/locations';
import { api } from '../utils/api';

const normalizeName = (name: string) => name.trim().toLowerCase();

// 알려진 국가명 목록 (이 외의 이름을 국가로 등록할 때 경고 표시)
const KNOWN_COUNTRY_NAMES = new Set([
  '한국', '일본', '중국', '홍콩', '마카오', '대만', '싱가포르', '태국',
  '베트남', '말레이시아', '미국', '프랑스', '이탈리아', '스페인', '독일',
  '영국', '호주', '캐나다', '인도', '인도네시아', '필리핀', '터키', '그리스',
  '포르투갈', '스위스', '오스트리아', '네덜란드', '벨기에', '체코', '헝가리',
  '폴란드', '스웨덴', '노르웨이', '덴마크', '핀란드', '아이슬란드', '멕시코',
  '페루', '브라질', '아르헨티나', '이집트', '모로코', '남아프리카', '두바이',
  '뉴질랜드', '크로아티아', '조지아', '몽골', '캄보디아', '미얀마', '스리랑카',
]);

interface LocationContextType {
  countries: Country[];
  regions: Region[];
  addCountry: (name: string, image?: string) => void;
  addRegion: (name: string, countryId: string, image?: string) => void;
  updateCountry: (id: string, name: string, image?: string) => void;
  updateRegion: (id: string, name: string, image?: string) => void;
  deleteCountry: (id: string) => boolean; // 삭제 가능 여부 반환
  deleteRegion: (id: string) => void;
  getCountry: (id: string) => Country | undefined;
  getRegionsByCountry: (countryId: string) => Region[];
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const remote = await api.getLocations();
        const remoteCountries = Array.isArray(remote.countries) ? remote.countries : [];
        const remoteRegions = Array.isArray(remote.regions) ? remote.regions : [];

        if (remoteCountries.length > 0 || remoteRegions.length > 0) {
          setCountries(remoteCountries);
          setRegions(remoteRegions);
          storage.saveCountries(remoteCountries);
          storage.saveRegions(remoteRegions);
          return;
        }
      } catch (error) {
        console.warn('[LocationContext] 원격 지역 로드 실패, 로컬 데이터 사용:', error);
      }

      const savedCountries = storage.getCountries();
      const savedRegions = storage.getRegions();
      const fallbackCountries = savedCountries.length > 0 ? savedCountries : seedCountries;
      const fallbackRegions = savedRegions.length > 0 ? savedRegions : seedRegions;

      setCountries(fallbackCountries);
      setRegions(fallbackRegions);
      storage.saveCountries(fallbackCountries);
      storage.saveRegions(fallbackRegions);

      try {
        await api.saveLocations({ countries: fallbackCountries, regions: fallbackRegions });
      } catch (error) {
        console.warn('[LocationContext] 지역 초기 동기화 실패:', error);
      }
    };

    loadLocations();
  }, []);

  const persistLocations = (nextCountries: Country[], nextRegions: Region[]) => {
    setCountries(nextCountries);
    setRegions(nextRegions);
    storage.saveCountries(nextCountries);
    storage.saveRegions(nextRegions);
    api.saveLocations({ countries: nextCountries, regions: nextRegions }).catch((error) => {
      console.warn('[LocationContext] 지역 저장 동기화 실패:', error);
    });
  };

  const addCountry = (name: string, image?: string) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      alert('국가명을 입력해주세요.');
      return;
    }
    const exists = countries.some(c => normalizeName(c.name) === normalized);
    if (exists) {
      alert('이미 존재하는 국가입니다.');
      return;
    }
    // 이미 지역으로 등록된 이름이거나, 알려진 국가명 목록에 없는 경우 경고
    const isExistingRegion = regions.some(r => normalizeName(r.name) === normalized);
    if (isExistingRegion) {
      const proceed = window.confirm(`'${name.trim()}'은(는) 현재 지역(시/도)으로 등록된 이름입니다.\n국가로 등록하시겠습니까?\n(예: 오사카는 일본의 지역입니다)`);
      if (!proceed) return;
    } else if (!KNOWN_COUNTRY_NAMES.has(name.trim())) {
      const proceed = window.confirm(`'${name.trim()}'은(는) 알려진 국가명 목록에 없습니다.\n도시나 지역 이름이 아닌지 확인해주세요.\n계속 국가로 등록하시겠습니까?`);
      if (!proceed) return;
    }
    const newCountry: Country = {
      id: `country_${Date.now()}`,
      name: name.trim(),
      image: image?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistLocations([...countries, newCountry], regions);
  };

  const addRegion = (name: string, countryId: string, image?: string) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      alert('지역명을 입력해주세요.');
      return;
    }
    const exists = regions.some(r => r.countryId === countryId && normalizeName(r.name) === normalized);
    if (exists) {
      alert('이미 존재하는 지역입니다. (같은 국가 내 중복 불가)');
      return;
    }
    const newRegion: Region = {
      id: `region_${Date.now()}`,
      name: name.trim(),
      countryId,
      image: image?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistLocations(countries, [...regions, newRegion]);
  };

  const updateCountry = (id: string, name: string, image?: string) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      alert('국가명을 입력해주세요.');
      return;
    }
    const exists = countries.some(c => c.id !== id && normalizeName(c.name) === normalized);
    if (exists) {
      alert('이미 존재하는 국가입니다.');
      return;
    }
    const newCountries = countries.map(country =>
      country.id === id
        ? {
            ...country,
            name: name.trim(),
            // 이름만 수정할 때 기존 이미지를 유지한다.
            image: image === undefined ? country.image : image.trim() || undefined,
            updatedAt: new Date().toISOString(),
          }
        : country
    );
    persistLocations(newCountries, regions);
  };

  const updateRegion = (id: string, name: string, image?: string) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      alert('지역명을 입력해주세요.');
      return;
    }
    const current = regions.find(r => r.id === id);
    if (!current) return;
    const exists = regions.some(
      r => r.id !== id && r.countryId === current.countryId && normalizeName(r.name) === normalized
    );
    if (exists) {
      alert('이미 존재하는 지역입니다. (같은 국가 내 중복 불가)');
      return;
    }
    const newRegions = regions.map(region =>
      region.id === id
        ? {
            ...region,
            name: name.trim(),
            // 이름만 수정할 때 기존 이미지를 유지한다.
            image: image === undefined ? region.image : image.trim() || undefined,
            updatedAt: new Date().toISOString(),
          }
        : region
    );
    persistLocations(countries, newRegions);
  };

  const deleteCountry = (id: string): boolean => {
    // 지역이 있으면 삭제 불가
    const hasRegions = regions.some(region => region.countryId === id);
    if (hasRegions) {
      return false;
    }
    const newCountries = countries.filter(country => country.id !== id);
    persistLocations(newCountries, regions);
    return true;
  };

  const deleteRegion = (id: string) => {
    const newRegions = regions.filter(region => region.id !== id);
    persistLocations(countries, newRegions);
  };

  const getCountry = (id: string) => {
    return countries.find(country => country.id === id);
  };

  const getRegionsByCountry = (countryId: string) => {
    return regions.filter(region => region.countryId === countryId);
  };

  return (
    <LocationContext.Provider value={{
      countries,
      regions,
      addCountry,
      addRegion,
      updateCountry,
      updateRegion,
      deleteCountry,
      deleteRegion,
      getCountry,
      getRegionsByCountry,
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocations = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocations must be used within a LocationProvider');
  }
  return context;
};
