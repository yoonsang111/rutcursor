#!/bin/bash

# API 서버 전체 배포 스크립트
# 서버 터미널에서 이 스크립트 전체를 복사해서 실행하세요

set -e

echo "🚀 API 서버 배포를 시작합니다..."

# 1단계: 시스템 업데이트
echo "📦 1단계: 시스템 업데이트 중..."
sudo apt update -y

# 2단계: Node.js 설치
echo "📦 2단계: Node.js 설치 중..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "✅ Node.js: $(node --version)"

# 3단계: PM2 설치
echo "📦 3단계: PM2 설치 중..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
echo "✅ PM2: $(pm2 --version)"

# 4단계: Nginx 설치
echo "📦 4단계: Nginx 설치 중..."
if ! command -v nginx &> /dev/null; then
    sudo apt install nginx -y
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi
echo "✅ Nginx 설치 완료"

# 5단계: 디렉토리 생성
echo "📦 5단계: 디렉토리 생성 중..."
sudo mkdir -p /var/www/api
sudo mkdir -p /var/www/api/data/production
sudo mkdir -p /var/www/api/logs
sudo mkdir -p /var/www/api/src
sudo chown -R ubuntu:ubuntu /var/www/api
cd /var/www/api

# 6단계: package.json 생성
echo "📦 6단계: package.json 생성 중..."
cat > package.json << 'PKGEOF'
{
  "name": "@tourstream/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
PKGEOF

# 7단계: 환경 변수 파일 생성
echo "📦 7단계: 환경 변수 파일 생성 중..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3002
CORS_ORIGIN=https://tourstream.kr,https://admin.tourstream.kr
DATA_DIR=/var/www/api/data/production
ENVEOF

# 8단계: PM2 설정 파일 생성
echo "📦 8단계: PM2 설정 파일 생성 중..."
cat > ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'tourstream-api',
    script: './src/index.js',
    cwd: '/var/www/api',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      CORS_ORIGIN: 'https://tourstream.kr,https://admin.tourstream.kr',
      DATA_DIR: '/var/www/api/data/production'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true
  }]
};
PM2EOF

# 9단계: src/index.js 파일 생성
echo "📦 9단계: src/index.js 파일 생성 중..."
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

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    message: 'TourStream API Server',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      categories: '/api/categories',
      locations: '/api/locations',
      counter: '/api/counter'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('[서버 에러]', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다', message: err.message });
});

const DATA_DIR = process.env.DATA_DIR 
  ? path.isAbsolute(process.env.DATA_DIR) 
    ? process.env.DATA_DIR 
    : path.join(__dirname, '..', process.env.DATA_DIR)
  : path.join(__dirname, '../data');

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const COUNTER_FILE = path.join(DATA_DIR, 'counter.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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

app.get('/api/products', (req, res) => {
  const products = readProducts();
  console.log(`[API] GET /api/products 요청 - ${products.length}개 상품 반환`);
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

app.get('/api/products/:id', (req, res) => {
  const products = readProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }
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

app.post('/api/products', (req, res) => {
  const products = readProducts();
  let counter = readCounter();
  counter++;
  const productId = counter.toString();
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

app.put('/api/products/:id', (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  }
  const cleanedImages = (req.body.images || products[index].images || []).filter((img) => 
    img && 
    img.trim() !== '' && 
    !img.includes('via.placeholder.com') && 
    !img.includes('placeholder.com')
  );
  products[index] = {
    ...products[index],
    ...req.body,
    id: req.params.id,
    images: cleanedImages
  };
  writeProducts(products);
  res.json(products[index]);
});

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

app.get('/api/counter', (req, res) => {
  const counter = readCounter();
  res.json({ counter });
});

app.get('/sitemap.xml', (req, res) => {
  try {
    const products = readProducts();
    const categoriesFile = path.join(DATA_DIR, 'categories.json');
    const locationsFile = path.join(DATA_DIR, 'locations.json');
    const baseUrl = 'https://tourstream.kr';
    const now = new Date().toISOString().split('T')[0];
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/products</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
    products.forEach(product => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/product/${product.id}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });
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

app.post('/api/categories', (req, res) => {
  const categoriesFile = path.join(DATA_DIR, 'categories.json');
  fs.writeFileSync(categoriesFile, JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ message: '카테고리가 저장되었습니다' });
});

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

app.post('/api/locations', (req, res) => {
  const locationsFile = path.join(DATA_DIR, 'locations.json');
  fs.writeFileSync(locationsFile, JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ message: '지역이 저장되었습니다' });
});

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
  console.log(`🔗 테스트: curl http://localhost:${PORT}/api/products`);
  console.log(`🌐 루트: http://localhost:${PORT}/`);
});
INDEXEOF

# 10단계: 의존성 설치
echo "📦 10단계: 의존성 설치 중..."
npm install --production

# 11단계: PM2로 서버 시작
echo "📦 11단계: PM2로 서버 시작 중..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 12단계: 서버 테스트
echo "📦 12단계: 서버 테스트 중..."
sleep 2
curl -s http://localhost:3002/ | head -5

echo ""
echo "✅ API 서버 배포가 완료되었습니다!"
echo ""
echo "서버 상태 확인:"
pm2 status
echo ""
echo "서버 로그 확인:"
echo "  pm2 logs tourstream-api"
echo ""
echo "서버 테스트:"
echo "  curl http://localhost:3002/"
