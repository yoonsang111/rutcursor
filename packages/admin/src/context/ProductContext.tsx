import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@tourstream/shared';
import { storage } from '../utils/storage';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'views'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  searchProducts: (keyword: string) => Product[];
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // 로컬스토리지에서 상품 불러오기
    const savedProducts = storage.getProducts();
    if (savedProducts.length > 0) {
      setProducts(savedProducts);
    }
  }, []);

  const saveToStorage = (newProducts: Product[]) => {
    setProducts(newProducts);
    storage.saveProducts(newProducts);
  };

  const addProduct = (productData: Omit<Product, 'id' | 'views'>) => {
    const newProduct: Product = {
      ...productData,
      id: `product_${Date.now()}`,
      views: 0,
    };
    const newProducts = [...products, newProduct];
    saveToStorage(newProducts);
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    const newProducts = products.map(product =>
      product.id === id ? { ...product, ...productData } : product
    );
    saveToStorage(newProducts);
  };

  const deleteProduct = (id: string) => {
    const newProducts = products.filter(product => product.id !== id);
    saveToStorage(newProducts);
  };

  const getProduct = (id: string) => {
    return products.find(product => product.id === id);
  };

  const searchProducts = (keyword: string) => {
    if (!keyword.trim()) return products;
    const lowerKeyword = keyword.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowerKeyword) ||
      product.description.toLowerCase().includes(lowerKeyword) ||
      product.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    );
  };

  return (
    <ProductContext.Provider value={{
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      getProduct,
      searchProducts,
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
