import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Country, Region } from '@tourstream/shared';
import { storage } from '../utils/storage';
import { seedCountries, seedRegions } from '../seed/locations';
import { api } from '../utils/api';
import englishNameTable from '../data/locationEnglishNames.json';

export interface FillResult {
  ok: boolean;
  /** 채운 항목 설명 */
  filled: string[];
  /** 표에 없어서 못 채운 항목 */
  noMap: string[];
  error?: string;
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/*
  주소에 바로 들어갈 모양으로 다듬는다. 대소문자·띄어쓰기를 어떻게 치든 같은 주소가 나오게.
  "San Francisco" → "san-francisco",  "Hong Kong " → "hong-kong"
*/
const normalizeEnglishName = (value?: string) => {
  const cleaned = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || undefined;
};

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
  addCountry: (name: string, image?: string, englishName?: string) => void;
  addRegion: (name: string, countryId: string, image?: string, englishName?: string) => void;
  updateCountry: (id: string, name: string, image?: string, englishName?: string) => void;
  updateRegion: (id: string, name: string, image?: string, englishName?: string) => void;
  /** 비어 있는 영어 이름을 한 번에 채운다 (옮기기용, 한 번만 쓰면 된다) */
  fillMissingEnglishNames: (opts?: { dryRun?: boolean }) => Promise<FillResult>;
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

  const addCountry = (name: string, image?: string, englishName?: string) => {
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
      englishName: normalizeEnglishName(englishName),
      image: image?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistLocations([...countries, newCountry], regions);
  };

  const addRegion = (name: string, countryId: string, image?: string, englishName?: string) => {
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
      englishName: normalizeEnglishName(englishName),
      image: image?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistLocations(countries, [...regions, newRegion]);
  };

  const updateCountry = (id: string, name: string, image?: string, englishName?: string) => {
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
            englishName: englishName === undefined ? country.englishName : normalizeEnglishName(englishName),
            // 이름만 수정할 때 기존 이미지를 유지한다.
            image: image === undefined ? country.image : image.trim() || undefined,
            updatedAt: new Date().toISOString(),
          }
        : country
    );
    persistLocations(newCountries, regions);
  };

  const updateRegion = (id: string, name: string, image?: string, englishName?: string) => {
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
            englishName: englishName === undefined ? region.englishName : normalizeEnglishName(englishName),
            // 이름만 수정할 때 기존 이미지를 유지한다.
            image: image === undefined ? region.image : image.trim() || undefined,
            updatedAt: new Date().toISOString(),
          }
        : region
    );
    persistLocations(countries, newRegions);
  };

  /*
    영어 이름 일괄 채우기 — 한 번만 쓰는 기능.

    나라·지역에 영어 이름 칸이 없던 시절, 주소는 코드가 한글을 소리나는 대로 옮겨 만들었다
    (/country/dokil = 독일). 그 값을 임시로 적어 둔 표(locationEnglishNames.json)를
    데이터로 옮긴다. 옮기고 나면 이 버튼은 할 일이 없어지고, 새 지역은 등록할 때 직접 입력한다.

    비어 있는 칸만 채운다. 이미 입력된 값은 건드리지 않는다.
  */
  const fillMissingEnglishNames = async ({ dryRun = false } = {}): Promise<FillResult> => {
    const filled: string[] = [];
    const noMap: string[] = [];

    const fill = <T extends { name: string; englishName?: string }>(list: T[], map: Record<string, string>, kind: string) =>
      list.map((item) => {
        const name = (item.name || '').trim();
        if (!name || String(item.englishName || '').trim()) return item;
        const english = normalizeEnglishName(map[name]);
        if (!english) {
          noMap.push(`${kind} ${name}`);
          return item;
        }
        filled.push(`${kind} ${name} → ${english}`);
        return { ...item, englishName: english, updatedAt: new Date().toISOString() };
      });

    const nextCountries = fill(countries, englishNameTable.countries, '국가');
    const nextRegions = fill(regions, englishNameTable.regions, '지역');

    // 두 곳이 같은 주소를 갖게 되면 한쪽 페이지가 사라진다. 그런 경우엔 저장하지 않는다.
    const clash = (list: Array<{ name: string; englishName?: string }>, kind: string) => {
      const seen = new Map<string, string>();
      for (const it of list) {
        const slug = normalizeEnglishName(it.englishName);
        if (!slug) continue;
        const owner = seen.get(slug);
        if (owner && owner !== it.name) return `${kind} 주소가 겹칩니다: "${owner}" 와 "${it.name}" 둘 다 /${slug}`;
        seen.set(slug, it.name);
      }
      return null;
    };
    const conflict = clash(nextCountries, '국가') || clash(nextRegions, '지역');
    if (conflict) return { ok: false, filled, noMap, error: conflict };

    if (dryRun || filled.length === 0) return { ok: true, filled, noMap };

    try {
      // 서버 저장이 끝난 걸 확인한 뒤에 화면 값을 바꾼다 (실패를 조용히 넘기지 않는다)
      await api.saveLocations({ countries: nextCountries, regions: nextRegions });
    } catch (error) {
      return { ok: false, filled, noMap, error: error instanceof Error ? error.message : '저장에 실패했습니다' };
    }

    setCountries(nextCountries);
    setRegions(nextRegions);
    storage.saveCountries(nextCountries);
    storage.saveRegions(nextRegions);
    return { ok: true, filled, noMap };
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
      fillMissingEnglishNames,
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
