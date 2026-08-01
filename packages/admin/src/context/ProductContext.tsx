import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Product } from '@tourstream/shared';
import { storage } from '../utils/storage';
import { api } from '../utils/api';
import { seedProducts } from '../seed/products';

const normalizeValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const productSignature = (product: Partial<Product>) => {
  const name = normalizeValue(product.name || '');
  const categories = [...(product.categories || [])].map(normalizeValue).sort().join('|');
  const locations = [...(product.locations || [])].map(normalizeValue).sort().join('|');
  const url = normalizeValue(product.externalUrl1 || '');
  return [name, categories, locations, url].join('::');
};

const cleanProduct = (product: Product): Product => ({
  ...product,
  images: Array.isArray(product.images) ? product.images.filter((img) => img && img.trim() !== '') : [],
  categories: Array.isArray(product.categories) ? product.categories : [],
  locations: Array.isArray(product.locations) ? product.locations : [],
  tags: Array.isArray(product.tags) ? product.tags : [],
});

const mapAndCleanProducts = (products: Product[]) => products.map(cleanProduct);

interface ProductContextType {
  products: Product[];
  refreshProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'views'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  searchProducts: (keyword: string) => Product[];
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  const refreshProducts = useCallback(async () => {
    try {
      const apiProducts = await api.getProducts();
      const cleanedProducts = mapAndCleanProducts(apiProducts);
      setProducts(cleanedProducts);
      storage.saveProducts(cleanedProducts);
    } catch (error) {
      console.error('[ProductContext] refreshProducts 실패:', error);
    }
  }, []);

  useEffect(() => {
    // API에서 상품 불러오기
    const loadProducts = async () => {
      try {
        console.log('[ProductContext] 상품 로드 시작...');
        const apiProducts = await api.getProducts();
        console.log('[ProductContext] API에서 받은 상품:', apiProducts.length, '개');
        const savedProducts = storage.getProducts() as Product[];
        
        // 로컬스토리지에 상품이 있고 API에 없는 경우 마이그레이션
        if (savedProducts.length > 0 && apiProducts.length === 0) {
          console.log(`[ProductContext] 로컬스토리지에서 ${savedProducts.length}개 상품 발견. API로 마이그레이션 시작...`);
          const seen = new Set<string>();

          // 로컬스토리지의 상품을 API로 마이그레이션
          for (const product of savedProducts) {
            try {
              const signature = productSignature(product);
              if (seen.has(signature)) continue;
              seen.add(signature);
              await api.createProduct({
                ...product,
                images: product.images || []
              });
            } catch (error) {
              console.error('상품 마이그레이션 실패:', product.name, error);
            }
          }
          
          // 마이그레이션 후 다시 로드
          const migratedProducts = await api.getProducts();
          const cleanedMigratedProducts = mapAndCleanProducts(migratedProducts);
          setProducts(cleanedMigratedProducts);
          storage.saveProducts(cleanedMigratedProducts);
          console.log(`[ProductContext] 마이그레이션 완료: ${cleanedMigratedProducts.length}개 상품`);
        } else if (apiProducts.length > 0) {
          // API에 상품이 있으면 사용
          const cleanedApiProducts = mapAndCleanProducts(apiProducts);
          setProducts(cleanedApiProducts);
          storage.saveProducts(cleanedApiProducts);
          
          // 로컬스토리지에도 상품이 있지만 API와 다른 경우, 로컬스토리지의 추가 상품 마이그레이션
          if (savedProducts.length > apiProducts.length) {
            const apiIds = new Set(apiProducts.map((p: Product) => p.id));
            const localOnlyProducts = savedProducts.filter((p: Product) => !apiIds.has(p.id));
            const existingSignatures = new Set(apiProducts.map((p: Product) => productSignature(p)));
            
            if (localOnlyProducts.length > 0) {
              console.log(`[ProductContext] 로컬스토리지에 ${localOnlyProducts.length}개 추가 상품 발견. 마이그레이션 시작...`);
              for (const product of localOnlyProducts) {
                try {
                  const signature = productSignature(product);
                  if (existingSignatures.has(signature)) continue;
                  existingSignatures.add(signature);
                  await api.createProduct({
                    ...product,
                    images: product.images || []
                  });
                } catch (error) {
                  console.error('추가 상품 마이그레이션 실패:', product.name, error);
                }
              }
              // 마이그레이션 후 다시 로드
              const updatedProducts = await api.getProducts();
              const cleanedUpdatedProducts = mapAndCleanProducts(updatedProducts);
              setProducts(cleanedUpdatedProducts);
              storage.saveProducts(cleanedUpdatedProducts);
            }
          }
        } else if (seedProducts.length > 0) {
          // Seed 데이터를 API에 저장
          console.log(`[ProductContext] Seed 데이터 ${seedProducts.length}개를 API에 저장...`);
          const seen = new Set<string>();
          for (const product of seedProducts) {
            try {
              const signature = productSignature(product);
              if (seen.has(signature)) continue;
              seen.add(signature);
              await api.createProduct({
                ...product,
                images: product.images || []
              });
            } catch (error) {
              console.error('Seed 데이터 저장 실패:', error);
            }
          }
          // 저장 후 다시 로드
          const loadedProducts = await api.getProducts();
          const cleanedLoadedProducts = mapAndCleanProducts(loadedProducts);
          setProducts(cleanedLoadedProducts);
          storage.saveProducts(cleanedLoadedProducts);
        }
      } catch (error) {
        console.error('[ProductContext] API 오류, 로컬스토리지 사용:', error);
        // API 실패 시 로컬스토리지 사용 (폴백)
        const savedProducts = storage.getProducts() as Product[];
        if (savedProducts.length > 0) {
          setProducts(mapAndCleanProducts(savedProducts));
        }
      }
    };
    
    loadProducts();
  }, []);

  const addProduct = async (productData: Omit<Product, 'id' | 'views'>) => {
    try {
      console.log('[ProductContext] 상품 등록 시작:', productData.name);
      const currentProducts = await api.getProducts();
      const incomingSignature = productSignature(productData);
      const isDuplicate = currentProducts.some((item: Product) => productSignature(item) === incomingSignature);
      if (isDuplicate) {
        throw new Error('동일한 상품(이름/카테고리/지역/대표링크)이 이미 존재합니다.');
      }

      // API를 통해 상품 등록 (서버에서 ID 자동 생성)
      const newProduct = await api.createProduct({
        ...productData,
        images: productData.images || []
      });
      console.log('[ProductContext] 상품 등록 성공:', newProduct.id, newProduct.name);
      
      // API에서 최신 목록 다시 불러오기 (서버 상태와 동기화)
      const updatedProducts = await api.getProducts();
      const cleanedProducts = mapAndCleanProducts(updatedProducts);
      setProducts(cleanedProducts);
      storage.saveProducts(cleanedProducts);
      console.log('[ProductContext] 상품 목록 동기화 완료:', cleanedProducts.length, '개');
    } catch (error) {
      console.error('[ProductContext] 상품 등록 실패:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      console.log('[ProductContext] 상품 수정 시작:', id);
      // API를 통해 상품 수정
      await api.updateProduct(id, {
        ...productData,
        images: productData.images || []
      });
      console.log('[ProductContext] 상품 수정 성공:', id);
      
      // API에서 최신 목록 다시 불러오기
      const updatedProducts = await api.getProducts();
      const cleanedProducts = mapAndCleanProducts(updatedProducts);
      setProducts(cleanedProducts);
      storage.saveProducts(cleanedProducts);
    } catch (error) {
      console.error('[ProductContext] 상품 수정 실패:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      console.log('[ProductContext] 상품 삭제 시작:', id);
      // API를 통해 상품 삭제
      await api.deleteProduct(id);
      console.log('[ProductContext] 상품 삭제 성공:', id);
      
      // 삭제할 상품 찾기
      const productToDelete = products.find(product => product.id === id);
      if (productToDelete) {
        // 삭제된 상품을 별도로 저장 (번호 재사용 방지)
        storage.saveDeletedProduct(productToDelete);
      }
      
      // API에서 최신 목록 다시 불러오기
      const updatedProducts = await api.getProducts();
      const cleanedProducts = mapAndCleanProducts(updatedProducts);
      setProducts(cleanedProducts);
      storage.saveProducts(cleanedProducts);
    } catch (error) {
      console.error('[ProductContext] 상품 삭제 실패:', error);
      throw error;
    }
  };

  const getProduct = (id: string) => {
    return products.find((product) => String(product.id) === String(id));
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
      refreshProducts,
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
