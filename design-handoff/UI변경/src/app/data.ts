export interface Country {
  id: string;
  name: string;
  englishName: string;
  image: string;
  regionCount: number;
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
  rating: number;
  reviews: number;
  image: string;
  url: string;
  isPopular: boolean;
  isRecommended: boolean;
}

export const COUNTRIES: Country[] = [
  {
    id: 'jp',
    name: '일본',
    englishName: 'Japan',
    image: 'https://images.unsplash.com/photo-1591194233688-dca69d406068?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbiUyMHRva3lvJTIwY2l0eXxlbnwxfHx8fDE3NzY5OTQ2OTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    regionCount: 12,
    regions: ['도쿄', '오사카', '교토', '후쿠오카', '삿포로']
  },
  {
    id: 'fr',
    name: '프랑스',
    englishName: 'France',
    image: 'https://images.unsplash.com/photo-1642947392578-b37fbd9a4d45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmFuY2UlMjBwYXJpcyUyMGVpZmZlbCUyMHRvd2VyfGVufDF8fHx8MTc3Njk5NDY5Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    regionCount: 8,
    regions: ['파리', '니스', '마르세유', '리옹']
  },
  {
    id: 'th',
    name: '태국',
    englishName: 'Thailand',
    image: 'https://images.unsplash.com/photo-1691488822390-0fd80c389953?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGFpbGFuZCUyMGJhbmdrb2slMjB0ZW1wbGV8ZW58MXx8fHwxNzc2OTk0Njk3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    regionCount: 6,
    regions: ['방콕', '푸껫', '치앙마이', '파타야']
  },
  {
    id: 'vn',
    name: '베트남',
    englishName: 'Vietnam',
    image: 'https://images.unsplash.com/photo-1588964258213-a8e2baf18a10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwZGElMjBuYW5nfGVufDF8fHx8MTc3Njk5NTcyNnww&ixlib=rb-4.1.0&q=80&w=1080',
    regionCount: 7,
    regions: ['다낭', '나트랑', '호찌민', '하노이']
  },
  {
    id: 'us',
    name: '미국',
    englishName: 'USA',
    image: 'https://images.unsplash.com/photo-1734900715044-ef86383fd704?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2ElMjBuZXclMjB5b3JrJTIwY2l0eXxlbnwxfHx8fDE3NzY5OTU3MjZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    regionCount: 15,
    regions: ['뉴욕', '하와이', '로스앤젤레스', '라스베이거스']
  },
  {
    id: 'it',
    name: '이탈리아',
    englishName: 'Italy',
    image: 'https://images.unsplash.com/photo-1738335268476-a24ac9950abe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpdGFseSUyMHJvbWUlMjBjb2xvc3NldW18ZW58MXx8fHwxNzc2OTk1NzI2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    regionCount: 9,
    regions: ['로마', '베네치아', '피렌체', '밀라노']
  }
];

export const CATEGORIES: Category[] = [
  { id: 'ticket', name: '티켓/패스', iconName: 'Ticket' },
  { id: 'tour', name: '투어', iconName: 'Map' },
  { id: 'activity', name: '액티비티', iconName: 'PersonStanding' },
  { id: 'water', name: '해양/수중', iconName: 'Waves' },
  { id: 'class', name: '클래스', iconName: 'BookOpen' },
  { id: 'spa', name: '스파/마사지', iconName: 'Flower2' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: '도쿄 디즈니랜드 / 디즈니씨 1일 스튜디오 패스',
    description: '환상적인 디즈니의 세계로 떠나보세요! 원하는 테마파크를 선택해 하루 종일 즐길 수 있는 패스입니다.',
    countryId: 'jp',
    region: '도쿄',
    categoryId: 'ticket',
    price: 85000,
    rating: 4.8,
    reviews: 12450,
    image: 'https://images.unsplash.com/photo-1718965909148-564c62389f54?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzYWwlMjBzdHVkaW9zJTIwdGhlbWUlMjBwYXJrfGVufDF8fHx8MTc3Njk5NDcwMXww&ixlib=rb-4.1.0&q=80&w=1080',
    url: 'https://example.com/p1',
    isPopular: true,
    isRecommended: true
  },
  {
    id: 'p2',
    name: '오사카 유니버설 스튜디오 재팬 입장권',
    description: '슈퍼 닌텐도 월드부터 해리포터까지! 오사카 최고의 테마파크를 즐겨보세요.',
    countryId: 'jp',
    region: '오사카',
    categoryId: 'ticket',
    price: 89000,
    rating: 4.9,
    reviews: 21000,
    image: 'https://images.unsplash.com/photo-1718965909148-564c62389f54?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzYWwlMjBzdHVkaW9zJTIwdGhlbWUlMjBwYXJrfGVufDF8fHx8MTc3Njk5NDcwMXww&ixlib=rb-4.1.0&q=80&w=1080',
    url: 'https://example.com/p2',
    isPopular: true,
    isRecommended: false
  },
  {
    id: 'p3',
    name: '파리 에펠탑 & 센 강 야간 크루즈 투어',
    description: '낭만의 도시 파리, 로맨틱한 센 강에서 아름다운 야경과 반짝이는 에펠탑을 감상하세요.',
    countryId: 'fr',
    region: '파리',
    categoryId: 'tour',
    price: 45000,
    rating: 4.7,
    reviews: 8300,
    image: 'https://images.unsplash.com/photo-1763263148120-c007ba681182?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuaWdodCUyMHRvdXIlMjBjaXR5JTIwbGlnaHRzfGVufDF8fHx8MTc3Njk5NDcwMXww&ixlib=rb-4.1.0&q=80&w=1080',
    url: 'https://example.com/p3',
    isPopular: true,
    isRecommended: true
  },
  {
    id: 'p4',
    name: '방콕 바와 스파 프리미엄 타이 마사지',
    description: '여행의 피로를 완벽하게 풀어줄 최고급 타이 마사지 체험. 럭셔리한 휴식을 즐겨보세요.',
    countryId: 'th',
    region: '방콕',
    categoryId: 'spa',
    price: 75000,
    rating: 4.9,
    reviews: 4200,
    image: 'https://images.unsplash.com/photo-1745327883508-b6cd32e5dde5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGElMjBtYXNzYWdlJTIwcmVsYXh8ZW58MXx8fHwxNzc2OTA4ODc0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    url: 'https://example.com/p4',
    isPopular: false,
    isRecommended: true
  },
  {
    id: 'p5',
    name: '푸껫 피피섬 스노클링 풀데이 투어',
    description: '에메랄드빛 바다에서 즐기는 열대어와의 만남! 점심 식사가 포함된 풀데이 호핑투어입니다.',
    countryId: 'th',
    region: '푸껫',
    categoryId: 'water',
    price: 68000,
    rating: 4.6,
    reviews: 5120,
    image: 'https://images.unsplash.com/photo-1582395880240-8a89060981de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbm9ya2VsaW5nJTIwY29yYWwlMjByZWVmfGVufDF8fHx8MTc3Njk5NDcwMnww&ixlib=rb-4.1.0&q=80&w=1080',
    url: 'https://example.com/p5',
    isPopular: true,
    isRecommended: true
  },
  {
    id: 'p6',
    name: '오사카 정통 라멘 쿠킹 클래스',
    description: '현지 셰프와 함께 일본 정통 라멘의 비법 육수부터 차슈까지 직접 만들어보는 특별한 경험!',
    countryId: 'jp',
    region: '오사카',
    categoryId: 'class',
    price: 52000,
    rating: 4.9,
    reviews: 890,
    image: 'https://images.unsplash.com/photo-1634151739970-bba3910d0d36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb29raW5nJTIwY2xhc3MlMjBmb29kfGVufDF8fHx8MTc3Njk5NDcwMnww&ixlib=rb-4.1.0&q=80&w=1080',
    url: 'https://example.com/p6',
    isPopular: false,
    isRecommended: true
  },
  {
    id: 'p7',
    name: '뉴욕 모마 (MoMA) 현대미술관 입장권',
    description: '세계 최고의 현대미술관에서 고흐, 피카소 등 거장들의 작품을 감상하세요.',
    countryId: 'us',
    region: '뉴욕',
    categoryId: 'ticket',
    price: 35000,
    rating: 4.8,
    reviews: 15300,
    image: 'https://images.unsplash.com/photo-1611501768223-65061dd288c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBhcnQlMjBnYWxsZXJ5fGVufDF8fHx8MTc3Njk5NDY5N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    url: 'https://example.com/p7',
    isPopular: true,
    isRecommended: true
  },
  {
    id: 'p8',
    name: '다낭 바나힐 국립공원 일일 투어',
    description: '세계에서 가장 긴 케이블카를 타고 프랑스 마을과 골든 브릿지를 즐겨보세요.',
    countryId: 'vn',
    region: '다낭',
    categoryId: 'tour',
    price: 48000,
    rating: 4.7,
    reviews: 9200,
    image: 'https://images.unsplash.com/photo-1588964258213-a8e2baf18a10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwZGElMjBuYW5nfGVufDF8fHx8MTc3Njk5NTcyNnww&ixlib=rb-4.1.0&q=80&w=1080',
    url: 'https://example.com/p8',
    isPopular: true,
    isRecommended: true
  }
];