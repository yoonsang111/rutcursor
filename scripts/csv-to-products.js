const fs = require('fs');
const path = require('path');

// SEO 메타태그 생성 함수들
function extractKeywords(name) {
  const keywords = name.split(/[\s·\-_]+/).filter(word => 
    word.length > 1 && 
    !['입장권', '티켓', '패스', '체험', '투어', '액티비티'].includes(word)
  );
  return keywords.slice(0, 3);
}

function generateTitle(name, location, category, keywords) {
  let title = '';
  
  if (location) {
    title = `${location} ${name}`;
  } else {
    title = name;
  }
  
  if (category && title.length < 40) {
    title += ` ${category}`;
  }
  
  if (title.length > 55) {
    title = title.substring(0, 55);
  }
  
  title += ' | TourStream';
  return title;
}

function generateDescription(name, description, location, category) {
  let metaDesc = '';
  
  if (description && description.length > 20) {
    metaDesc = description;
  } else {
    metaDesc = `${name} 체험을 TourStream에서 예약하세요!`;
  }
  
  if (location && !metaDesc.includes(location)) {
    metaDesc = metaDesc.replace(/체험|투어|액티비티/, `${location} $&`);
  }
  
  const ctaPhrases = [
    '지금 예약하고 특가 혜택을 받으세요!',
    '가격 비교 후 최저가로 예약하세요!',
    '즉시 확인 가능한 예약으로 편리하게!',
    '무료 취소 가능한 안전한 예약!'
  ];
  
  const randomCTA = ctaPhrases[Math.floor(Math.random() * ctaPhrases.length)];
  let finalDesc = `${metaDesc} ${randomCTA}`;
  
  if (finalDesc.length > 160) {
    finalDesc = finalDesc.substring(0, 157) + '...';
  }
  
  return finalDesc;
}

function generateKeywords(name, location, category, tags) {
  const keywordSet = new Set();
  
  keywordSet.add(name);
  if (location) keywordSet.add(location);
  if (category) keywordSet.add(category);
  
  const usefulTags = tags.filter(tag => 
    tag.length > 1 && 
    !['입장권', '티켓', '패스'].includes(tag) &&
    keywordSet.size < 8
  );
  
  usefulTags.forEach(tag => keywordSet.add(tag));
  
  const commonKeywords = ['예약', '할인', '가격비교', '즉시확정'];
  commonKeywords.forEach(keyword => {
    if (keywordSet.size < 10) {
      keywordSet.add(keyword);
    }
  });
  
  return Array.from(keywordSet).join(', ');
}

function generateSEOMetaTags(product) {
  const { name, description, locations, categories, tags } = product;
  
  const mainLocation = locations[0] || '';
  const mainCategory = categories[0] || '';
  const nameKeywords = extractKeywords(name);
  
  const title = generateTitle(name, mainLocation, mainCategory, nameKeywords);
  const metaDescription = generateDescription(name, description, mainLocation, mainCategory);
  const keywords = generateKeywords(name, mainLocation, mainCategory, tags);
  
  return {
    title,
    description: metaDescription,
    keywords
  };
}

// CSV 파일 경로 (프로젝트 루트에 있는 products.csv 파일)
const csvFilePath = path.join(__dirname, '../products.csv');
const outputFilePath = path.join(__dirname, '../src/mock/products.ts');

// CSV 파일이 존재하는지 확인
if (!fs.existsSync(csvFilePath)) {
  console.error('❌ products.csv 파일을 찾을 수 없습니다.');
  console.log('📁 프로젝트 루트에 products.csv 파일을 넣어주세요.');
  process.exit(1);
}

// CSV 파일 읽기
const csvContent = fs.readFileSync(csvFilePath, 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

if (lines.length < 2) {
  console.error('❌ CSV 파일에 헤더와 데이터가 없습니다.');
  process.exit(1);
}

// 헤더 파싱
const headers = lines[0].split(',').map(header => header.trim()); // 쉼표로 구분

// 데이터 파싱
const products = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',').map(value => value.trim()); // 쉼표로 구분
  
  if (values.length !== headers.length) {
    console.warn(`⚠️  ${i+1}번째 줄의 데이터 개수가 맞지 않습니다. 건너뜁니다.`);
    continue;
  }

  const product = {};
  
  // 이미지 배열 수집
  const images = [];
  const categories = [];
  const locations = [];
  const tags = [];
  
  headers.forEach((header, index) => {
    let value = values[index];
    
    // 이미지 필드 수집
    if (header.startsWith('image') && value) {
      images.push(value);
    }
    
    // 카테고리 필드 수집
    if (header.startsWith('category') && value) {
      categories.push(value);
    }
    
    // 위치 필드 수집
    if (header.startsWith('location') && value) {
      locations.push(value);
    }
    
    // 외부 URL 필드 수집 - 각각의 칼럼으로 분리
    if (header.startsWith('externalUrl')) {
      product[header] = value && value.trim() !== '' ? value : '';
    }
    
    // 태그 필드 수집
    if (header.startsWith('tag') && value) {
      tags.push(value);
    }
    
    // 기본 필드들
    if (['name', 'description'].includes(header)) {
      product[header] = value;
    }
    
    // 숫자 필드 처리
    if (['views'].includes(header)) {
      product[header] = value ? parseInt(value) || 0 : 0;
    }
    
    // 불린 필드 처리
    if (['isRecommended', 'isAvailable'].includes(header)) {
      product[header] = value === 'true' || value === '1';
    }
  });
  
  // 배열 필드들 설정
  product.images = images.length > 0 ? images : ['/images/default.jpg'];
  product.categories = categories;
  product.locations = locations;
  product.tags = tags;

  // 기본값 설정
  product.id = product.id || `product_${i}`;
  product.isRecommended = product.isRecommended || false;
  product.isAvailable = product.isAvailable !== false;
  product.views = product.views || 0;

  // SEO 메타태그 자동 생성
  const seoData = generateSEOMetaTags(product);
  product.seo = seoData;

  products.push(product);
}

// TypeScript 파일 생성
const tsContent = `export const products = ${JSON.stringify(products, null, 2)};
`;

// 파일 쓰기
fs.writeFileSync(outputFilePath, tsContent, 'utf8');

console.log('✅ CSV 변환 완료!');
console.log(`📊 총 ${products.length}개의 상품이 변환되었습니다.`);
console.log(`📁 파일 위치: ${outputFilePath}`);
console.log('🚀 이제 npm start로 확인해보세요!');
