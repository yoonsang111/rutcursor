// 마이리얼트립 API 키가 실제로 동작하는지 확인하는 로컬 테스트 스크립트
// 사용법: cd packages/server && node --env-file=.env.local scripts/test-myrealtrip.mjs

import { searchTourTickets } from '../src/integrations/myrealtrip.js';

const keyword = process.argv[2] || '오사카 유니버설 스튜디오';

console.log(`[테스트] "${keyword}" 검색 중...`);

const data = await searchTourTickets({ keyword, page: 1, size: 5 });

console.log(`총 ${data.totalCount}개 결과 중 ${data.items.length}개 표시\n`);
data.items.forEach((item, i) => {
  console.log(`${i + 1}. ${item.itemName}`);
  console.log(`   가격: ${item.priceDisplay} | 평점: ${item.reviewScore} (${item.reviewCount}건)`);
  console.log(`   URL: ${item.productUrl}`);
  console.log('');
});
