#!/bin/bash

# 서버 터미널에서 실행하세요
# src/index.js 파일을 생성합니다

cd /var/www/api

# index.js 파일 생성
cat > src/index.js << 'INDEXEOF'
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// CORS 설정 (환경 변수에서 가져오거나 기본값 사용)
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

console.log(`[서버] CORS 허용 오리진:`, corsOrigins);
console.log(`[서버] 환경: ${process.env.NODE_ENV || 'development'}`);
console.log(`[서버] 포트: ${PORT}`);

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json());

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: 'TourStream API Server',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      categories: '/api/categories',
      locations: '/api/locations',
      counter: '/api/counter'
    },
    documentation: 'See packages/server/API.md for detailed API documentation'
  });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('[서버 에러]', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다', message: err.message });
});

// 데이터 파일 경로 (환경 변수에서 가져오거나 기본값 사용)
const DATA_DIR = process.env.DATA_DIR 
  ? path.isAbsolute(process.env.DATA_DIR) 
    ? process.env.DATA_DIR 
    : path.join(__dirname, '..', process.env.DATA_DIR)
  : path.join(__dirname, '../data');

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const COUNTER_FILE = path.join(DATA_DIR, 'counter.json');

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 파일에서 데이터 읽기
const readProducts = () => {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('상품 데이터 읽기 오류:', error);
  }
  return [];
};

const readCounter = () => {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = fs.readFileSync(COUNTER_FILE, 'utf8');
      return parseInt(data, 10) || 100000;
    }
  } catch (error) {
    console.error('카운터 읽기 오류:', error);
  }
  return 100000;
};

// 파일에 데이터 쓰기
const writeProducts = (products) => {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
  } catch (error) {
    console.error('상품 데이터 쓰기 오류:', error);
  }
};

const writeCounter = (counter) => {
  try {
    fs.writeFileSync(COUNTER_FILE, counter.toString(), 'utf8');
  } catch (error) {
    console.error('카운터 쓰기 오류:', error);
  }
};

// 상품 목록 조회
app.get('/api/products', (req, res) => {
  const products = readProducts();
  console.log(`[API] GET /api/products 요청 - ${products.length}개 상품 반환`);
  // placeholder 이미지 URL 제거
  const cleanedProducts = products.map(product => ({
    ...product,
    images: (product.images || []).filter((img) => 
      img && 
      img.trim() !== '' && 
      !img.includes('via.placeholder.com') && 
      !img.includes('placeholder.com')
    )
  }));
  res.json(cleanedProducts);
});

// 상품 상세 조회
app.get('/api/products/:id', (req, res) => {
  const products = readProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }
  // placeholder 이미지 URL 제거
  const cleanedProduct = {
    ...product,
    images: (product.images || []).filter((img) => 
      img && 
      img.trim() !== '' && 
      !img.includes('via.placeholder.com') && 
      !img.includes('placeholder.com')
    )
  };
  res.json(cleanedProduct);
});

// 상품 등록
app.post('/api/products', (req, res) => {
  const products = readProducts();
  let counter = readCounter();
  
  // 다음 상품 번호 생성
  counter++;
  const productId = counter.toString();
  
  // placeholder 이미지 URL 필터링
  const cleanedImages = (req.body.images || []).filter((img) => 
    img && 
    img.trim() !== '' && 
    !img.includes('via.placeholder.com') && 
    !img.includes('placeholder.com')
  );
  
  const newProduct = {
    ...req.body,
    id: productId,
    views: 0,
    images: cleanedImages
  };
  
  products.push(newProduct);
  writeProducts(products);
  writeCounter(counter);
  
  console.log(`[API] POST /api/products - 상품 등록 성공: ${newProduct.id} ${newProduct.name}`);
  res.status(201).json(newProduct);
});

// 상품 수정
app.put('/api/products/:id', (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }
  
  // placeholder 이미지 URL 필터링
  const cleanedImages = (req.body.images || products[index].images || []).filter((img) => 
    img && 
    img.trim() !== '' && 
    !img.includes('via.placeholder.com') && 
    !img.includes('placeholder.com')
  );
  
  products[index] = {
    ...products[index],
    ...req.body,
    id: req.params.id, // ID는 변경 불가
    images: cleanedImages
  };
  
  writeProducts(products);
  res.json(products[index]);
});

// 상품 삭제
app.delete('/api/products/:id', (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }
  
  const deletedProduct = products[index];
  products.splice(index, 1);
  writeProducts(products);
  
  res.json({ message: '상품이 삭제되었습니다', product: deletedProduct });
});

// 카운터 조회
app.get('/api/counter', (req, res) => {
  const counter = readCounter();
  res.json({ counter });
});

// 동적 Sitemap 생성
app.get('/sitemap.xml', (req, res) => {
  try {
    const products = readProducts();
    const categoriesFile = path.join(DATA_DIR, 'categories.json');
    const locationsFile = path.join(DATA_DIR, 'locations.json');
    
    const baseUrl = 'https://tourstream.kr';
    const now = new Date().toISOString().split('T')[0];
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // 홈페이지
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';
    
    // 상품 목록 페이지
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/products</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
    
    // 모든 상품 페이지
    products.forEach(product => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/product/${product.id}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });
    
    // 카테고리 페이지
    if (fs.existsSync(categoriesFile)) {
      const categoriesData = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
      const allCategories = [
        ...(categoriesData.mainCategories || []),
        ...(categoriesData.subCategories || [])
      ];
      
      allCategories.forEach(category => {
        const encodedCategory = encodeURIComponent(category);
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/category/${encodedCategory}</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      });
    }
    
    // 지역 페이지
    if (fs.existsSync(locationsFile)) {
      const locationsData = JSON.parse(fs.readFileSync(locationsFile, 'utf8'));
      const allLocations = [
        ...(locationsData.countries || []),
        ...(locationsData.regions || [])
      ];
      
      allLocations.forEach(location => {
        const encodedLocation = encodeURIComponent(location);
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/location/${encodedLocation}</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      });
    }
    
    xml += '</urlset>';
    
    res.set('Content-Type', 'application/xml');
    res.send(xml);
    
    console.log(`[Sitemap] 생성 완료: ${products.length}개 상품, ${now}`);
  } catch (error) {
    console.error('[Sitemap] 생성 오류:', error);
    res.status(500).send('Sitemap 생성 중 오류가 발생했습니다');
  }
});

// 카테고리 목록 조회
app.get('/api/categories', (req, res) => {
  const categoriesFile = path.join(DATA_DIR, 'categories.json');
  try {
    if (fs.existsSync(categoriesFile)) {
      const data = fs.readFileSync(categoriesFile, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json({ mainCategories: [], subCategories: [] });
    }
  } catch (error) {
    res.json({ mainCategories: [], subCategories: [] });
  }
});

// 카테고리 저장
app.post('/api/categories', (req, res) => {
  const categoriesFile = path.join(DATA_DIR, 'categories.json');
  fs.writeFileSync(categoriesFile, JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ message: '카테고리가 저장되었습니다' });
});

// 지역 목록 조회
app.get('/api/locations', (req, res) => {
  const locationsFile = path.join(DATA_DIR, 'locations.json');
  try {
    if (fs.existsSync(locationsFile)) {
      const data = fs.readFileSync(locationsFile, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json({ countries: [], regions: [] });
    }
  } catch (error) {
    res.json({ countries: [], regions: [] });
  }
});

// 지역 저장
app.post('/api/locations', (req, res) => {
  const locationsFile = path.join(DATA_DIR, 'locations.json');
  fs.writeFileSync(locationsFile, JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ message: '지역이 저장되었습니다' });
});

// 404 핸들러 (알 수 없는 경로)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /api/products',
      'GET /api/products/:id',
      'POST /api/products',
      'PUT /api/products/:id',
      'DELETE /api/products/:id',
      'GET /api/categories',
      'POST /api/categories',
      'GET /api/locations',
      'POST /api/locations',
      'GET /api/counter',
      'GET /sitemap.xml'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`✅ 서버가 http://localhost:${PORT}에서 실행 중입니다`);
  console.log(`📚 API 문서: packages/server/API.md`);
  console.log(`🔗 테스트: curl http://localhost:${PORT}/api/products`);
  console.log(`🌐 루트: http://localhost:${PORT}/`);
});
INDEXEOF

echo "✅ src/index.js 파일이 생성되었습니다!"
