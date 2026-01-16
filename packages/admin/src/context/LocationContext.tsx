import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Country, Region } from '@tourstream/shared';
import { storage } from '../utils/storage';

interface LocationContextType {
  countries: Country[];
  regions: Region[];
  addCountry: (name: string) => void;
  addRegion: (name: string, countryId: string) => void;
  updateCountry: (id: string, name: string) => void;
  updateRegion: (id: string, name: string) => void;
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
    const savedCountries = storage.getCountries();
    const savedRegions = storage.getRegions();
    if (savedCountries.length > 0) setCountries(savedCountries);
    if (savedRegions.length > 0) setRegions(savedRegions);
  }, []);

  const saveCountriesToStorage = (newCountries: Country[]) => {
    setCountries(newCountries);
    storage.saveCountries(newCountries);
  };

  const saveRegionsToStorage = (newRegions: Region[]) => {
    setRegions(newRegions);
    storage.saveRegions(newRegions);
  };

  const addCountry = (name: string) => {
    const newCountry: Country = {
      id: `country_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCountriesToStorage([...countries, newCountry]);
  };

  const addRegion = (name: string, countryId: string) => {
    const newRegion: Region = {
      id: `region_${Date.now()}`,
      name,
      countryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveRegionsToStorage([...regions, newRegion]);
  };

  const updateCountry = (id: string, name: string) => {
    const newCountries = countries.map(country =>
      country.id === id ? { ...country, name, updatedAt: new Date().toISOString() } : country
    );
    saveCountriesToStorage(newCountries);
  };

  const updateRegion = (id: string, name: string) => {
    const newRegions = regions.map(region =>
      region.id === id ? { ...region, name, updatedAt: new Date().toISOString() } : region
    );
    saveRegionsToStorage(newRegions);
  };

  const deleteCountry = (id: string): boolean => {
    // 지역이 있으면 삭제 불가
    const hasRegions = regions.some(region => region.countryId === id);
    if (hasRegions) {
      return false;
    }
    const newCountries = countries.filter(country => country.id !== id);
    saveCountriesToStorage(newCountries);
    return true;
  };

  const deleteRegion = (id: string) => {
    const newRegions = regions.filter(region => region.id !== id);
    saveRegionsToStorage(newRegions);
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
