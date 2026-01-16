// 카테고리 타입 정의
export interface MainCategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubCategory {
  id: string;
  name: string;
  mainCategoryId: string; // 대분류 ID
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormData {
  name: string;
  mainCategoryId?: string; // 소분류인 경우 대분류 ID 필요
  type: 'main' | 'sub'; // 대분류 또는 소분류
}
