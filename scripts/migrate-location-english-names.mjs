#!/usr/bin/env node
/*
  slugMap.json 에 손으로 적어 둔 영어 이름을, 운영 데이터의 나라·지역에 englishName 으로 옮긴다.

  왜 필요한가
    나라·지역 데이터에 이름이 한글 하나뿐이라, 주소를 만들 때 코드가 한글을 소리나는 대로
    옮기고 있었다 (/country/dokil = 독일). 그 빈칸을 코드 파일(slugMap.json)로 메워 뒀는데,
    원래 데이터에 있어야 할 값이다. 이 스크립트가 한 번만 옮기면 그 뒤로는 관리자에서 입력한다.

  안전장치
    - 먼저 읽어서 바뀌는 내용을 전부 보여 준다. --apply 를 붙여야 실제로 저장한다.
    - 이미 englishName 이 있으면 건드리지 않는다.
    - 저장 전 원본을 파일로 남긴다.
    - 이름·id·countryId·image 등 기존 값은 그대로 두고 englishName 만 더한다.
    - 두 지역이 같은 주소를 갖게 되면 멈춘다.

  쓰는 법
    node scripts/migrate-location-english-names.mjs            # 미리 보기만
    node scripts/migrate-location-english-names.mjs --apply    # 실제 저장 (ADMIN_API_KEY 필요)
*/

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.API_BASE_URL || "https://api.tourstream.kr";
const APPLY = process.argv.includes("--apply");

const slugMap = JSON.parse(
  await fs.readFile(path.join(__dirname, "..", "packages", "main", "src", "v2", "data", "slugMap.json"), "utf8"),
);

const clean = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const res = await fetch(`${API}/api/locations`);
if (!res.ok) throw new Error(`지역 자료를 못 받았습니다: HTTP ${res.status}`);
const data = await res.json();

const countries = Array.isArray(data.countries) ? data.countries : [];
const regions = Array.isArray(data.regions) ? data.regions : [];
if (countries.length === 0 || regions.length === 0) throw new Error("지역 자료가 비어 있습니다. 중단합니다.");

const plan = { filled: [], already: [], noMap: [] };

const apply = (list, map, kind) =>
  list.map((item) => {
    const name = String(item?.name || "").trim();
    if (!name) return item;
    if (String(item.englishName || "").trim()) {
      plan.already.push(`${kind} ${name} = ${item.englishName}`);
      return item;
    }
    const english = clean(map[name]);
    if (!english) {
      plan.noMap.push(`${kind} ${name}`);
      return item;
    }
    plan.filled.push(`${kind} ${name} → ${english}`);
    return { ...item, englishName: english };
  });

const nextCountries = apply(countries, slugMap.countries || {}, "국가");
const nextRegions = apply(regions, slugMap.regions || {}, "지역");

// 같은 주소를 두 곳이 갖게 되면 멈춘다 (한쪽 페이지가 사라진다)
const clash = (list, kind) => {
  const seen = new Map();
  for (const it of list) {
    const s = clean(it.englishName);
    if (!s) continue;
    if (seen.has(s) && seen.get(s) !== it.name) {
      throw new Error(`${kind} 주소가 겹칩니다: "${seen.get(s)}" 와 "${it.name}" 둘 다 /${s}`);
    }
    seen.set(s, it.name);
  }
};
clash(nextCountries, "국가");
clash(nextRegions, "지역");

console.log(`\n나라 ${countries.length}곳 · 지역 ${regions.length}곳을 읽었습니다.\n`);
console.log(`채울 것        ${plan.filled.length}건`);
console.log(`이미 있음      ${plan.already.length}건`);
console.log(`지도에 없음    ${plan.noMap.length}건  ← 관리자에서 직접 넣어야 합니다`);
if (plan.noMap.length) console.log("   " + plan.noMap.slice(0, 15).join("\n   "));
console.log("\n--- 채울 내용 (앞 20건) ---");
plan.filled.slice(0, 20).forEach((l) => console.log("   " + l));
if (plan.filled.length > 20) console.log(`   … 외 ${plan.filled.length - 20}건`);

if (!APPLY) {
  console.log("\n미리 보기만 했습니다. 실제로 저장하려면 --apply 를 붙이세요.\n");
  process.exit(0);
}

const key = process.env.ADMIN_API_KEY;
if (!key) throw new Error("ADMIN_API_KEY 가 없습니다. 저장하지 않았습니다.");

const backup = path.join(__dirname, "..", `locations-backup-${Date.now()}.json`);
await fs.writeFile(backup, JSON.stringify(data, null, 2), "utf8");
console.log(`\n원본을 남겼습니다: ${backup}`);

const save = await fetch(`${API}/api/locations`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-admin-key": key },
  body: JSON.stringify({ countries: nextCountries, regions: nextRegions }),
});
if (!save.ok) throw new Error(`저장 실패: HTTP ${save.status} ${await save.text()}`);

// 저장된 결과를 다시 읽어 확인한다
const after = await (await fetch(`${API}/api/locations`)).json();
const ok = (after.regions || []).filter((r) => String(r.englishName || "").trim()).length;
const okC = (after.countries || []).filter((c) => String(c.englishName || "").trim()).length;
console.log(`\n저장 완료. 확인: 나라 ${okC}곳 · 지역 ${ok}곳에 영어 이름이 들어갔습니다.\n`);
