// SEO 메타태그 자동 생성 유틸리티

interface ProductData {
  name: string;
  description: string;
  locations: string[];
  categories: string[];
  tags: string[];
}

interface SEOMetaTags {
  title: string;
  description: string;
  keywords: string;
}

export function generateSEOMetaTags(product: ProductData): SEOMetaTags {
  const { name, description, locations, categories, tags } = product;
  
  // 주요 지역 추출 (첫 번째 지역 우선)
  const mainLocation = locations[0] || '';
  
  // 주요 카테고리 추출
  const mainCategory = categories[0] || '';
  
  // 핵심 키워드 추출 (상품명에서 중요한 단어들)
  const nameKeywords = extractKeywords(name);
  
  // 1️⃣ Title 생성 (50-60자)
  const title = generateTitle(name, mainLocation, mainCategory, nameKeywords);
  
  // 2️⃣ Description 생성 (140-160자)
  const metaDescription = generateDescription(name, description, mainLocation, mainCategory);
  
  // 3️⃣ Keywords 생성 (5-10개)
  const keywords = generateKeywords(name, mainLocation, mainCategory, tags);
  
  return {
    title,
    description: metaDescription,
    keywords
  };
}

function extractKeywords(name: string): string[] {
  // 상품명에서 핵심 키워드 추출
  const keywords = name.split(/[\s·\-_]+/).filter(word => 
    word.length > 1 && 
    !['입장권', '티켓', '패스', '체험', '투어', '액티비티'].includes(word)
  );
  return keywords.slice(0, 3); // 최대 3개
}

function generateTitle(name: string, location: string, category: string, keywords: string[]): string {
  let title = '';
  
  // 지역이 있으면 지역 + 상품명 구조
  if (location) {
    title = `${location} ${name}`;
  } else {
    title = name;
  }
  
  // 카테고리 추가 (공간이 있을 때만)
  if (category && title.length < 40) {
    title += ` ${category}`;
  }
  
  // 길이 조정 (50-60자)
  if (title.length > 55) {
    title = title.substring(0, 55);
  }
  
  // TourStream 추가
  title += ' | TourStream';
  
  return title;
}

function generateDescription(name: string, description: string, location: string, category: string): string {
  let metaDesc = '';
  
  // 상품명과 설명을 자연스럽게 결합
  if (description && description.length > 20) {
    metaDesc = description;
  } else {
    metaDesc = `${name} 체험을 TourStream에서 예약하세요!`;
  }
  
  // 지역 정보 추가
  if (location && !metaDesc.includes(location)) {
    metaDesc = metaDesc.replace(/체험|투어|액티비티/, `${location} $&`);
  }
  
  // CTA 추가
  const ctaPhrases = [
    '지금 예약하고 특가 혜택을 받으세요!',
    '가격 비교 후 최저가로 예약하세요!',
    '즉시 확인 가능한 예약으로 편리하게!',
    '무료 취소 가능한 안전한 예약!'
  ];
  
  const randomCTA = ctaPhrases[Math.floor(Math.random() * ctaPhrases.length)];
  
  // 길이 조정 (140-160자)
  let finalDesc = `${metaDesc} ${randomCTA}`;
  
  if (finalDesc.length > 160) {
    finalDesc = finalDesc.substring(0, 157) + '...';
  }
  
  return finalDesc;
}

function generateKeywords(name: string, location: string, category: string, tags: string[]): string {
  const keywordSet = new Set<string>();
  
  // 기본 키워드들
  keywordSet.add(name);
  if (location) keywordSet.add(location);
  if (category) keywordSet.add(category);
  
  // 태그에서 유용한 키워드 추출
  const usefulTags = tags.filter(tag => 
    tag.length > 1 && 
    !['입장권', '티켓', '패스'].includes(tag) &&
    keywordSet.size < 8
  );
  
  usefulTags.forEach(tag => keywordSet.add(tag));
  
  // 공통 키워드 추가
  const commonKeywords = ['예약', '할인', '가격비교', '즉시확정'];
  commonKeywords.forEach(keyword => {
    if (keywordSet.size < 10) {
      keywordSet.add(keyword);
    }
  });
  
  return Array.from(keywordSet).join(', ');
}

// 상품 데이터를 SEO 메타태그로 변환하는 헬퍼 함수
export function addSEOMetaTagsToProduct(product: any): any {
  const seoData = generateSEOMetaTags({
    name: product.name,
    description: product.description,
    locations: product.locations,
    categories: product.categories,
    tags: product.tags
  });
  
  return {
    ...product,
    seo: seoData
  };
}
