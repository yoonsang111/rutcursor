import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MainCategory, SubCategory } from '@tourstream/shared';
import { storage } from '../utils/storage';
import { seedCategories } from '../seed/categories';
import { api } from '../utils/api';

const normalizeName = (name: string) => name.trim().toLowerCase();

interface CategoryContextType {
  mainCategories: MainCategory[];
  subCategories: SubCategory[];
  addMainCategory: (name: string) => void;
  addSubCategory: (name: string, mainCategoryId: string) => void;
  updateMainCategory: (id: string, name: string) => void;
  updateSubCategory: (id: string, name: string) => void;
  deleteMainCategory: (id: string) => boolean; // 삭제 가능 여부 반환
  deleteSubCategory: (id: string) => void;
  getMainCategory: (id: string) => MainCategory | undefined;
  getSubCategoriesByMain: (mainCategoryId: string) => SubCategory[];
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const remote = await api.getCategories();
        const remoteMain = Array.isArray(remote.mainCategories) ? remote.mainCategories : [];
        const remoteSub = Array.isArray(remote.subCategories) ? remote.subCategories : [];

        if (remoteMain.length > 0 || remoteSub.length > 0) {
          setMainCategories(remoteMain);
          setSubCategories(remoteSub);
          storage.saveMainCategories(remoteMain);
          storage.saveSubCategories(remoteSub);
          return;
        }
      } catch (error) {
        console.warn('[CategoryContext] 원격 카테고리 로드 실패, 로컬 데이터 사용:', error);
      }

      const savedMain = storage.getMainCategories();
      const savedSub = storage.getSubCategories();
      const fallbackMain = savedMain.length > 0 ? savedMain : seedCategories;
      const fallbackSub = savedSub.length > 0 ? savedSub : [];

      setMainCategories(fallbackMain);
      setSubCategories(fallbackSub);
      storage.saveMainCategories(fallbackMain);
      storage.saveSubCategories(fallbackSub);

      try {
        await api.saveCategories({ mainCategories: fallbackMain, subCategories: fallbackSub });
      } catch (error) {
        console.warn('[CategoryContext] 카테고리 초기 동기화 실패:', error);
      }
    };

    loadCategories();
  }, []);

  const persistCategories = (nextMain: MainCategory[], nextSub: SubCategory[]) => {
    setMainCategories(nextMain);
    setSubCategories(nextSub);
    storage.saveMainCategories(nextMain);
    storage.saveSubCategories(nextSub);
    api.saveCategories({ mainCategories: nextMain, subCategories: nextSub }).catch((error) => {
      console.warn('[CategoryContext] 카테고리 저장 동기화 실패:', error);
    });
  };

  const addMainCategory = (name: string) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      alert('카테고리명을 입력해주세요.');
      return;
    }
    const exists = mainCategories.some(c => normalizeName(c.name) === normalized);
    if (exists) {
      alert('이미 존재하는 대분류입니다.');
      return;
    }
    const newCategory: MainCategory = {
      id: `main_cat_${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistCategories([...mainCategories, newCategory], subCategories);
  };

  const addSubCategory = (name: string, mainCategoryId: string) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      alert('카테고리명을 입력해주세요.');
      return;
    }
    const exists = subCategories.some(
      c => c.mainCategoryId === mainCategoryId && normalizeName(c.name) === normalized
    );
    if (exists) {
      alert('이미 존재하는 소분류입니다. (같은 대분류 내 중복 불가)');
      return;
    }
    const newCategory: SubCategory = {
      id: `sub_cat_${Date.now()}`,
      name: name.trim(),
      mainCategoryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistCategories(mainCategories, [...subCategories, newCategory]);
  };

  const updateMainCategory = (id: string, name: string) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      alert('카테고리명을 입력해주세요.');
      return;
    }
    const exists = mainCategories.some(c => c.id !== id && normalizeName(c.name) === normalized);
    if (exists) {
      alert('이미 존재하는 대분류입니다.');
      return;
    }
    const newCategories = mainCategories.map(cat =>
      cat.id === id ? { ...cat, name: name.trim(), updatedAt: new Date().toISOString() } : cat
    );
    persistCategories(newCategories, subCategories);
  };

  const updateSubCategory = (id: string, name: string) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      alert('카테고리명을 입력해주세요.');
      return;
    }
    const current = subCategories.find(c => c.id === id);
    if (!current) return;
    const exists = subCategories.some(
      c =>
        c.id !== id &&
        c.mainCategoryId === current.mainCategoryId &&
        normalizeName(c.name) === normalized
    );
    if (exists) {
      alert('이미 존재하는 소분류입니다. (같은 대분류 내 중복 불가)');
      return;
    }
    const newCategories = subCategories.map(cat =>
      cat.id === id ? { ...cat, name: name.trim(), updatedAt: new Date().toISOString() } : cat
    );
    persistCategories(mainCategories, newCategories);
  };

  const deleteMainCategory = (id: string): boolean => {
    // 소분류가 있으면 삭제 불가
    const hasSubCategories = subCategories.some(sub => sub.mainCategoryId === id);
    if (hasSubCategories) {
      return false;
    }
    const newCategories = mainCategories.filter(cat => cat.id !== id);
    persistCategories(newCategories, subCategories);
    return true;
  };

  const deleteSubCategory = (id: string) => {
    const newCategories = subCategories.filter(cat => cat.id !== id);
    persistCategories(mainCategories, newCategories);
  };

  const getMainCategory = (id: string) => {
    return mainCategories.find(cat => cat.id === id);
  };

  const getSubCategoriesByMain = (mainCategoryId: string) => {
    return subCategories.filter(sub => sub.mainCategoryId === mainCategoryId);
  };

  return (
    <CategoryContext.Provider value={{
      mainCategories,
      subCategories,
      addMainCategory,
      addSubCategory,
      updateMainCategory,
      updateSubCategory,
      deleteMainCategory,
      deleteSubCategory,
      getMainCategory,
      getSubCategoriesByMain,
    }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};
