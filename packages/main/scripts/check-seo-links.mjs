// 빌드 결과 자가 점검: 사이트맵에 올린 페이지가 전부 "링크로 닿을 수 있는지" 본다.
// 들어오는 링크가 하나도 없는 페이지(고아 페이지)는 사이트맵에 올려도 색인되지 않는다.
// 실제로 목록 페이지 50여 개가 그 상태여서 네이버 색인이 9개에서 멈춰 있었다.
// 실행: node packages/main/scripts/check-seo-links.mjs   (npm run build && seo:generate-shells 이후)
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const buildDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'build');
const read = (f) => fs.readFileSync(f, 'utf8');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : e.name === 'index.html' ? [full] : [];
  });

const pages = walk(buildDir);
assert.ok(pages.length > 50, `셸이 거의 생성되지 않았다 (${pages.length}개)`);

// 템플릿 오염 검사: 빌드 없이 두 번 돌리면 홈 본문이 갱신되지 않고 지난 내용이 남는다
const home = read(path.join(buildDir, 'index.html'));
assert.ok(!/<div id="root"><\/div>/.test(home), '홈 셸에 정적 본문이 들어가지 않았다');

const linked = new Set();
for (const f of pages) for (const m of read(f).matchAll(/href="(\/[^"#?]*)"/g)) linked.add(m[1]);

const sitemap = [...read(path.join(buildDir, 'sitemap.xml')).matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace('https://tourstream.kr', ''))
  .filter((u) => u !== '/');

const orphans = sitemap.filter((u) => !linked.has(u));
assert.strictEqual(orphans.length, 0, `사이트맵에 있지만 아무 데서도 링크되지 않는 페이지:\n  ${orphans.join('\n  ')}`);

// 색인에서 뺀 페이지로는 링크를 걸지 않는다 (크롤링 예산 낭비)
const navLinks = [...(home.match(/<nav\b[\s\S]*?<\/nav>/) || [''])[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
assert.ok(navLinks.length >= 20, `홈 공통 링크가 너무 적다 (${navLinks.length}개)`);
for (const href of navLinks) {
  const f = path.join(buildDir, href.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(f)) continue;
  assert.ok(!/noindex/.test(read(f)), `색인에서 뺀 페이지에 링크가 걸려 있다: ${href}`);
}

console.log(`SEO 링크 점검 통과 (페이지 ${pages.length}개, 사이트맵 ${sitemap.length}개, 고아 0개, 공통 링크 ${navLinks.length}개)`);
