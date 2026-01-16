// 상품 타입 정의
export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  categories: string[];
  locations: string[];
  tags: string[];
  isRecommended: boolean;
  isAvailable: boolean;
  views: number;
  externalUrl1?: string;
  externalUrl2?: string;
  externalUrl3?: string;
  externalUrl4?: string;
  externalUrl5?: string;
  seo?: {
    title: string;
    description: string;
    keywords: string;
  };
}

export interface ProductFormData {
  name: string;
  description: string;
  images: string[];
  categories: string[];
  locations: string[];
  tags: string[];
  isRecommended: boolean;
  isAvailable: boolean;
  externalUrl1?: string;
  externalUrl2?: string;
  externalUrl3?: string;
  externalUrl4?: string;
  externalUrl5?: string;
}
