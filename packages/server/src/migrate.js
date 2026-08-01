// 로컬스토리지 데이터를 API 서버로 마이그레이션하는 스크립트
// 브라우저 콘솔에서 실행하거나, Node.js로 실행

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const COUNTER_FILE = path.join(DATA_DIR, 'counter.json');

// 로컬스토리지에서 데이터를 읽어서 API 서버로 마이그레이션
// 이 스크립트는 브라우저에서 실행해야 합니다 (로컬스토리지 접근을 위해)

console.log(`
=== 로컬스토리지 → API 서버 마이그레이션 스크립트 ===

브라우저 콘솔에서 다음 코드를 실행하세요:

(async () => {
  const products = JSON.parse(localStorage.getItem('tourstream_products') || '[]');
  console.log('마이그레이션할 상품 수:', products.length);
  
  for (const product of products) {
    try {
      const response = await fetch('http://localhost:3002/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          images: [] // 이미지 제거
        })
      });
      
      if (response.ok) {
        const saved = await response.json();
        console.log('✅ 마이그레이션 성공:', product.name, '→ ID:', saved.id);
      } else {
        console.error('❌ 마이그레이션 실패:', product.name, await response.text());
      }
    } catch (error) {
      console.error('❌ 오류:', product.name, error);
    }
  }
  
  console.log('마이그레이션 완료!');
})();
`);
