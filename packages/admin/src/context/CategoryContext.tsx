import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MainCategory, SubCategory } from '@tourstream/shared';
import { storage } from '../utils/storage';

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
    const savedMain = storage.getMainCategories();
    const savedSub = storage.getSubCategories();
    if (savedMain.length > 0) setMainCategories(savedMain);
    if (savedSub.length > 0) setSubCategories(savedSub);
  }, []);

  const saveMainToStorage = (newCategories: MainCategory[]) => {
    setMainCategories(newCategories);
    storage.saveMainCategories(newCategories);
  };

  const saveSubToStorage = (newCategories: SubCategory[]) => {
    setSubCategories(newCategories);
    storage.saveSubCategories(newCategories);
  };

  const addMainCategory = (name: string) => {
    const newCategory: MainCategory = {
      id: `main_cat_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveMainToStorage([...mainCategories, newCategory]);
  };

  const addSubCategory = (name: string, mainCategoryId: string) => {
    const newCategory: SubCategory = {
      id: `sub_cat_${Date.now()}`,
      name,
      mainCategoryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSubToStorage([...subCategories, newCategory]);
  };

  const updateMainCategory = (id: string, name: string) => {
    const newCategories = mainCategories.map(cat =>
      cat.id === id ? { ...cat, name, updatedAt: new Date().toISOString() } : cat
    );
    saveMainToStorage(newCategories);
  };

  const updateSubCategory = (id: string, name: string) => {
    const newCategories = subCategories.map(cat =>
      cat.id === id ? { ...cat, name, updatedAt: new Date().toISOString() } : cat
    );
    saveSubToStorage(newCategories);
  };

  const deleteMainCategory = (id: string): boolean => {
    // 소분류가 있으면 삭제 불가
    const hasSubCategories = subCategories.some(sub => sub.mainCategoryId === id);
    if (hasSubCategories) {
      return false;
    }
    const newCategories = mainCategories.filter(cat => cat.id !== id);
    saveMainToStorage(newCategories);
    return true;
  };

  const deleteSubCategory = (id: string) => {
    const newCategories = subCategories.filter(cat => cat.id !== id);
    saveSubToStorage(newCategories);
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
