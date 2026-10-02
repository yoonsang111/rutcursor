// 조회수 집계에서 제외해야 하는 접근을 제대로 걸러내는지 점검.
// 실행: node packages/server/scripts/check-bot-filter.mjs
import assert from 'assert';

// index.js 와 같은 목록 (서버를 띄우지 않고 검사하려고 여기에 복제한다. 바꿀 땐 양쪽 모두 수정)
const BOT_UA_PATTERN = new RegExp(
  [
    'bot', 'crawler', 'spider', 'crawl',
    'bingpreview', 'slurp', 'mediapartners-google', 'adsbot',
    'yeti', 'daumoa', 'yandex', 'baidu', 'duckduck', 'applebot', 'petalbot', 'seznam',
    'facebookexternalhit', 'discordbot', 'telegrambot', 'twitterbot', 'kakaotalk-scrap', 'slackbot',
    'curl', 'wget', 'python-requests', 'node-fetch', 'axios', 'go-http-client', 'headlesschrome', 'lighthouse',
  ].join('|'),
);
const isBot = (ua = '') => {
  const n = String(ua || '').toLowerCase();
  if (!n) return true;
  return BOT_UA_PATTERN.test(n);
};

// 걸러야 하는 것
const BOTS = [
  ['네이버 Yeti', 'Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)'],
  ['다음 Daumoa', 'Mozilla/5.0 (compatible; Daumoa/4.1; +http://cs.daum.net/faq/15/4118.html)'],
  ['구글', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  ['빙', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
  ['애플', 'Mozilla/5.0 (compatible; Applebot/0.1)'],
  ['카카오톡 미리보기', 'Mozilla/5.0 (compatible; kakaotalk-scrap/1.0)'],
  ['페이스북 미리보기', 'facebookexternalhit/1.1'],
  ['curl', 'curl/8.4.0'],
  ['빈 UA', ''],
];
for (const [name, ua] of BOTS) {
  assert.strictEqual(isBot(ua), true, `걸러야 하는데 사람으로 셈: ${name}`);
}

// 세야 하는 것 (실제 사용자)
const HUMANS = [
  ['아이폰 사파리', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'],
  ['안드로이드 크롬', 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'],
  ['맥 크롬', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'],
  ['윈도우 엣지', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0'],
  ['네이버 앱 인앱브라우저', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.4.5)'],
];
for (const [name, ua] of HUMANS) {
  // 네이버 앱 인앱브라우저는 UA에 NAVER가 들어가지만 실제 사용자다.
  // 크롤러 이름(yeti)만 거르므로 사람으로 집계되어야 한다.
  assert.strictEqual(isBot(ua), false, `사람인데 봇으로 셈: ${name}`);
}

console.log('봇 필터 점검 통과 (봇 9종 제외, 사람 5종 집계 - 네이버 인앱 포함)');
