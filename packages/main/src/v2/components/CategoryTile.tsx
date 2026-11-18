import React from "react";
import { Link } from "react-router-dom";

/**
 * 카테고리 칸에 들어가는 그림.
 * 상품 사진을 재탕하면 아래 카드와 겹쳐 보여서, 종류별로 알아볼 수 있는 도형을 직접 그린다.
 */
const ART: Record<string, React.ReactNode> = {
  ferris: (
    <>
      <rect width="100" height="100" fill="#FFF1E6" />
      <circle cx="50" cy="44" r="24" fill="none" stroke="#FF8A3D" strokeWidth="3" />
      <path
        d="M50 44 74 44M50 44 67 27M50 44 50 20M50 44 33 27M50 44 26 44M50 44 33 61M50 44 50 68M50 44 67 61"
        stroke="#FF8A3D"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <g fill="#FF8A3D">
        <circle cx="74" cy="44" r="4.4" /><circle cx="67" cy="27" r="4.4" /><circle cx="50" cy="20" r="4.4" /><circle cx="33" cy="27" r="4.4" />
        <circle cx="26" cy="44" r="4.4" /><circle cx="33" cy="61" r="4.4" /><circle cx="50" cy="68" r="4.4" /><circle cx="67" cy="61" r="4.4" />
      </g>
      <circle cx="50" cy="44" r="5" fill="#C2511A" />
      <path d="M50 44 37 82M50 44 63 82" stroke="#C2511A" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="31" y="81" width="38" height="5" rx="2.5" fill="#C2511A" />
    </>
  ),
  tower: (
    <>
      <rect width="100" height="100" fill="#E9F0FF" />
      <path d="M36 84 46 46h8l10 38z" fill="#3B6FE0" />
      <rect x="46" y="18" width="8" height="26" rx="2" fill="#2A54B8" />
      <circle cx="50" cy="15" r="4.2" fill="#2A54B8" />
      <ellipse cx="50" cy="45" rx="23" ry="7" fill="#2A54B8" />
      <ellipse cx="50" cy="42" rx="23" ry="6" fill="#5D8CF0" />
      <rect x="28" y="83" width="44" height="5" rx="2.5" fill="#2A54B8" />
    </>
  ),
  train: (
    <>
      <rect width="100" height="100" fill="#E6F6EE" />
      <rect x="28" y="22" width="44" height="54" rx="15" fill="#16996B" />
      <rect x="35" y="33" width="30" height="17" rx="6" fill="#EAFBF3" />
      <rect x="28" y="57" width="44" height="6" fill="#0E7050" />
      <circle cx="39" cy="69" r="3.6" fill="#FFE27A" /><circle cx="61" cy="69" r="3.6" fill="#FFE27A" />
      <path d="M22 83h56M30 90h40" stroke="#0E7050" strokeWidth="3.2" strokeLinecap="round" />
    </>
  ),
  bus: (
    <>
      <rect width="100" height="100" fill="#E2F6F4" />
      <rect x="20" y="26" width="60" height="44" rx="9" fill="#0FA396" />
      <rect x="26" y="34" width="22" height="15" rx="4" fill="#E8FBF9" />
      <rect x="52" y="34" width="22" height="15" rx="4" fill="#E8FBF9" />
      <rect x="20" y="55" width="60" height="5" fill="#0A7A70" />
      <circle cx="33" cy="74" r="7" fill="#0A7A70" /><circle cx="67" cy="74" r="7" fill="#0A7A70" />
      <circle cx="33" cy="74" r="2.6" fill="#E2F6F4" /><circle cx="67" cy="74" r="2.6" fill="#E2F6F4" />
    </>
  ),
  museum: (
    <>
      <rect width="100" height="100" fill="#F2EFE6" />
      <path d="M50 16 84 36H16z" fill="#8A7B5C" />
      <g fill="#A3946F">
        <rect x="24" y="42" width="9" height="32" rx="2" /><rect x="40" y="42" width="9" height="32" rx="2" />
        <rect x="56" y="42" width="9" height="32" rx="2" /><rect x="72" y="42" width="5" height="32" rx="2" />
      </g>
      <rect x="18" y="37" width="64" height="6" rx="2" fill="#6F6247" />
      <rect x="16" y="76" width="68" height="7" rx="3" fill="#6F6247" />
    </>
  ),
  fish: (
    <>
      <rect width="100" height="100" fill="#E2F2FD" />
      <path d="M58 32c13 0 24 9 24 20s-11 20-24 20c-10 0-18-5-22-12l-14 11 5-19-5-19 14 11c4-7 12-12 22-12z" fill="#2E9BD6" />
      <circle cx="68" cy="47" r="4" fill="#fff" /><circle cx="69" cy="47" r="1.9" fill="#13527A" />
      <path d="M52 44c4 4 4 12 0 16" stroke="#1C7CB0" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="80" cy="26" r="3.6" fill="#8FCCEC" /><circle cx="70" cy="18" r="2.4" fill="#8FCCEC" />
    </>
  ),
  gate: (
    <>
      <rect width="100" height="100" fill="#FFEDE8" />
      <rect x="14" y="24" width="72" height="8" rx="3" fill="#D9452F" />
      <rect x="18" y="36" width="64" height="7" rx="3" fill="#B8341F" />
      <rect x="27" y="43" width="10" height="42" rx="3" fill="#D9452F" />
      <rect x="63" y="43" width="10" height="42" rx="3" fill="#D9452F" />
      <rect x="37" y="52" width="26" height="6" rx="2.5" fill="#B8341F" />
    </>
  ),
  pin: (
    <>
      <rect width="100" height="100" fill="#FFF5DC" />
      <path
        d="M22 76c12 0 14-16 26-16s14-14 26-14"
        fill="none"
        stroke="#E0A010"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray="1.5 8"
      />
      <circle cx="22" cy="76" r="5.4" fill="#B37B00" />
      <path d="M72 24c7.7 0 14 6.3 14 14 0 10.5-14 22-14 22S58 48.5 58 38c0-7.7 6.3-14 14-14z" fill="#E0A010" />
      <circle cx="72" cy="38" r="5.6" fill="#FFF5DC" />
    </>
  ),
  show: (
    <>
      <rect width="100" height="100" fill="#F3EBFF" />
      <path d="M50 20 26 82h48z" fill="#D8C4FF" opacity=".85" />
      <path d="M18 22h20c0 26-6 38-20 44z" fill="#7B4DE0" />
      <path d="M82 22H62c0 26 6 38 20 44z" fill="#7B4DE0" />
      <rect x="14" y="17" width="72" height="8" rx="4" fill="#5A2FC2" />
      <path d="m50 44 3.4 7 7.6 1-5.5 5.3 1.3 7.5-6.8-3.6-6.8 3.6 1.3-7.5-5.5-5.3 7.6-1z" fill="#FFD84D" />
      <rect x="22" y="80" width="56" height="6" rx="3" fill="#5A2FC2" />
    </>
  ),
  onsen: (
    <>
      <rect width="100" height="100" fill="#FFECEF" />
      <path
        d="M37 48c5-5-5-9 0-15M50 46c5-5-5-9 0-15M63 48c5-5-5-9 0-15"
        fill="none"
        stroke="#E8536B"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path d="M22 60h56v6c0 9.4-7.6 17-17 17H39c-9.4 0-17-7.6-17-17z" fill="#E8536B" />
      <path d="M22 60h56v5H22z" fill="#F98CA0" />
      <path d="M18 88h64" stroke="#C03552" strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  ticket: (
    <>
      <rect width="100" height="100" fill="#EEF1F6" />
      <path
        d="M20 32h60a4 4 0 0 1 4 4v10a7 7 0 0 0 0 14v10a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V64a7 7 0 0 0 0-14V36a4 4 0 0 1 4-4z"
        fill="#5A6B86"
      />
      <path d="M50 36v8M50 50v8M50 64v8" stroke="#EEF1F6" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 5" />
      <rect x="24" y="44" width="18" height="4" rx="2" fill="#AFBACB" />
      <rect x="24" y="53" width="12" height="4" rx="2" fill="#AFBACB" />
    </>
  ),
};

/** 카테고리 이름에서 어떤 그림을 쓸지 고른다 (처음 걸리는 것) */
const RULES: Array<[RegExp, string]> = [
  [/테마파크|놀이공원/, "ferris"],
  [/전망대/, "tower"],
  [/철도|기차|지하철|공항열차|특급|교통|패스/, "train"],
  [/버스|리무진|시티투어|이동/, "bus"],
  [/뮤지엄|전시|미술|박물관/, "museum"],
  [/수족관|동물원/, "fish"],
  [/명소|유적|공원|사원|궁/, "gate"],
  [/온천|스파/, "onsen"],
  [/공연|쇼|뷔페|식사/, "show"],
  [/투어|체험|액티비티/, "pin"],
];

export function categoryArtKey(name: string): string {
  const hit = RULES.find(([re]) => re.test(name));
  return hit ? hit[1] : "ticket";
}

interface CategoryTileProps {
  to: string;
  name: string;
  count?: number;
}

export function CategoryTile({ to, name, count }: CategoryTileProps) {
  return (
    <Link to={to} className="block">
      {/* PC 2칸에서는 정사각이 너무 커져서 가로로 눕힌다. slice = 위아래 10%만 잘라 채우기(그림은 y 10~90 안에 있다) */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={name}
        className="w-full aspect-square lg:aspect-[5/4] rounded-[10px] md:rounded-xl"
      >
        {ART[categoryArtKey(name)]}
      </svg>
      <div className="mt-[7px] text-[13px] md:text-[14.5px] font-medium tracking-[-0.03em] text-slate-900 text-center md:text-left">
        {name}
        {/* 좁은 화면에서는 개수를 아랫줄로 내린다. 같은 줄에 두면 긴 이름만 두 줄이 되어 칸 높이가 들쭉날쭉해진다 */}
        {count !== undefined && (
          <span className="block md:inline md:ml-1 text-[11.5px] md:text-xs font-normal text-slate-300">{count}</span>
        )}
      </div>
    </Link>
  );
}
