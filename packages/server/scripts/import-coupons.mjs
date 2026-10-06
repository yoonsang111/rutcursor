// 클룩 제휴 파트너 센터에서 받은 쿠폰 CSV를 운영 API에 등록한다.
//
// 적용 대상은 상품 id를 박아두지 않고 "조건(match)"으로 저장한다.
// 그래야 나중에 상품이 늘어나도 쿠폰이 자동으로 붙는다.
//   match.type: 'product'  해당 이름 조각을 가진 상품
//               'category' 해당 카테고리
//               'location' 해당 지역/국가
//               'none'     우리가 취급하지 않는 분류 (호텔 등) - 판매처로 바로 보냄
//
// 사용법:
//   ADMIN_API_KEY=... node packages/server/scripts/import-coupons.mjs <csv경로>
//   DRY_RUN=1 ADMIN_API_KEY=... node ... <csv경로>

import fs from 'fs';
import path from 'path';

const API_BASE_URL = (process.env.API_BASE_URL || 'https://api.tourstream.kr/api').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const DRY_RUN = process.env.DRY_RUN === '1';
const CSV_PATH = process.argv[2];

if (!ADMIN_API_KEY) {
  console.error('[쿠폰] ADMIN_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}
if (!CSV_PATH || !fs.existsSync(CSV_PATH)) {
  console.error(`[쿠폰] CSV 파일을 찾을 수 없습니다: ${CSV_PATH}`);
  process.exit(1);
}

// 쿠폰 코드별 적용 조건과 한글 표기. 새 쿠폰이 생기면 여기에 추가한다.
// (CSV의 설명문만으로는 우리 상품과 연결할 수 없어 사람이 한 번 정해주는 부분)
const RULES = {
  VNATT5AU: { label: '베트남 관광지', match: { type: 'location', values: ['베트남'] } },
  BUSLAUNCH5: { label: '일본 버스 승차권', match: { type: 'category', values: ['버스/이동', '공항 리무진'], locations: ['일본'] } },
  JPTST5AU: { label: '도쿄 지하철 승차권', match: { type: 'product', values: ['메트로 패스', '메트로패스'] } },
  KLIA5AUTUMN: { label: '쿠알라룸푸르 공항철도', match: { type: 'location', values: ['쿠알라룸푸르'] } },
  '일본어트랙션5%': { label: '일본 어트랙션 전체', match: { type: 'location', values: ['일본'] } },
  TAKAYAMA2800: { label: 'JR 다카야마-호쿠리쿠 패스', match: { type: 'product', values: ['다카야마'] } },
  'KLKEUTOUR20%': { label: '유럽 투어', match: { type: 'location', values: ['프랑스', '이탈리아', '스페인', '체코', '영국', '그리스', '네덜란드', '스위스'] } },
  '일본호텔7%할인_2610W2': { label: '일본 호텔', match: { type: 'none' }, landingUrl: 'https://www.klook.com/ko/hotels/' },
  HOTELONAPP: { label: '숙소 (앱 전용)', match: { type: 'none' }, landingUrl: 'https://www.klook.com/ko/hotels/' },
};

const KLOOK_AID = '65706';
const withAid = (url) => {
  try {
    const u = new URL(url);
    u.searchParams.set('aid', KLOOK_AID);
    return u.toString();
  } catch {
    return url;
  }
};

// 따옴표 안의 줄바꿈·콤마를 지키는 최소 CSV 파서
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const header = rows.shift().map((h) => h.replace(/^﻿/, '').trim());
  return rows
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])));
};

// CSV의 날짜에는 시간대 표기가 없고 별도 컬럼(시간대: GMT +08:00)에 적혀 있다.
// 그대로 두면 서버가 자기 지역시(KST)로 읽어 실제보다 1시간 늦게 만료된다. ISO로 붙여 저장한다.
const toIso = (value, tzLabel) => {
  const v = String(value || '').trim();
  if (!v) return '';
  const m = String(tzLabel || '').match(/GMT\s*([+-])\s*(\d{2}):(\d{2})/i);
  const offset = m ? `${m[1]}${m[2]}:${m[3]}` : '+09:00';
  return `${v.replace(' ', 'T')}${offset}`;
};

// 이용약관이 수십 줄이라 그대로 싣지 않고 핵심 한 줄만 남긴다
const summarizeTerms = (terms) => {
  const text = String(terms || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const limit = text.match(/최대[^/.]{0,20}할인[^/.]{0,12}/) || text.match(/최대 할인[^/.]{0,20}/);
  const once = /계정당 1회|한 번만 사용|1회만 사용/.test(text) ? '계정당 1회' : '';
  const parts = [limit ? limit[0].trim() : '', once].filter(Boolean);
  return parts.join(' · ');
};

const main = async () => {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const coupons = [];
  const unknown = [];

  for (const r of rows) {
    const code = r['쿠폰 코드'];
    if (!code) continue;
    const rule = RULES[code];
    if (!rule) {
      unknown.push(code);
      continue;
    }
    coupons.push({
      id: code,
      partner: 'KLOOK',
      code,
      discount: r['할인 정보'] || '',
      label: rule.label,
      description: r['쿠폰 코드 정보'] || '',
      terms: summarizeTerms(r['이용약관']),
      startsAt: toIso(r['교환 시작일'], r['시간대']),
      registerBy: toIso(r['전까지 등록'], r['시간대']),
      validUntil: toIso(r['까지 유효'], r['시간대']),
      destinations: (r['적용 가능 국가/지역'] || '').split(';').map((s) => s.trim()).filter(Boolean),
      platform: r['적용 가능한 플랫폼'] || '',
      match: rule.match,
      landingUrl: withAid(rule.landingUrl || 'https://www.klook.com/ko/'),
      excludedListUrl: r['적용 불가 상품'] || '',
    });
  }

  console.log(`[쿠폰] CSV ${rows.length}행 -> 등록 대상 ${coupons.length}건${DRY_RUN ? ' (DRY RUN)' : ''}`);
  if (unknown.length > 0) {
    console.warn(`[쿠폰] 적용 조건이 정의되지 않아 건너뜀: ${unknown.join(', ')}`);
    console.warn('       import-coupons.mjs 의 RULES 에 추가하세요.');
  }
  coupons.forEach((c) => {
    console.log(`  ${c.code.padEnd(22)} ${c.discount.padEnd(10)} ${c.match.type.padEnd(9)} ~${(c.registerBy || '').slice(0, 10)}  ${c.label}`);
  });

  if (DRY_RUN) return;
  const res = await fetch(`${API_BASE_URL}/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_API_KEY },
    body: JSON.stringify(coupons),
  });
  if (!res.ok) {
    console.error(`[쿠폰] 저장 실패 (${res.status})`, (await res.text()).slice(0, 200));
    process.exit(1);
  }
  console.log(`[쿠폰] 저장 완료:`, await res.json());
};

main().catch((e) => {
  console.error('[쿠폰] 오류:', e.message);
  process.exit(1);
});
