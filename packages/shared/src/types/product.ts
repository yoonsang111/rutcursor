// 상품 타입 정의
export interface PartnerLink {
  partner: string;
  url: string;
  source: 'api' | 'manual';
  externalId?: string;
  price?: number;
  priceDisplay?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  categories: string[];
  locations: string[];
  tags: string[];
  price?: number;
  minPrice?: number;
  salePrice?: number;
  rating?: number;
  reviewCount?: number;
  isRecommended: boolean;
  isAvailable: boolean;
  views: number;
  partnerLinks: PartnerLink[];
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
  price?: number;
  minPrice?: number;
  salePrice?: number;
  rating?: number;
  reviewCount?: number;
  isRecommended: boolean;
  isAvailable: boolean;
  partnerLinks: PartnerLink[];
}
