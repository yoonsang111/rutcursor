export interface Country {
  id: string;
  name: string;
  englishName: string;
  image: string;
  regionCount: number;
  productCount: number;
  regions: string[];
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  countryId: string;
  region: string;
  categoryId: string;
  price: number;
  views: number;
  recentViews7d: number;
  recentViews30d: number;
  popularityScore: number;
  rating: number;
  reviews: number;
  image: string;
  url: string;
  partnerLinks: Array<{ name: string; url: string; price?: number; priceDisplay?: string }>;
  tags: string[];
  isPopular: boolean;
  isRecommended: boolean;
}
