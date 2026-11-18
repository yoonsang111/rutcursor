import React from "react";

/**
 * 목록 화면이 데이터를 기다리는 동안 보여 주는 회색 자리맡기.
 * 이게 없으면 나라·종류를 아직 모르는 사이에 "찾을 수 없습니다"가 먼저 떠서,
 * 느린 인터넷에서는 멀쩡한 화면인데도 없는 줄 알고 손님이 나가 버린다.
 */
export function ListPageSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col w-full max-w-[1200px] mx-auto bg-white pb-16">
      <p role="status" className="sr-only">상품을 불러오는 중…</p>

      <section className="px-5 md:px-6 pt-5 pb-4">
        <div className="h-4 w-24 rounded bg-slate-100" />
        <div className="mt-2.5 h-8 w-40 rounded bg-slate-100" />
        <div className="mt-4 flex gap-2">
          {[64, 52, 52, 60, 56].map((w, i) => (
            <div key={i} style={{ width: w }} className="h-8 rounded-full bg-slate-100" />
          ))}
        </div>
      </section>

      <div className="border-y border-slate-100">
        <div className="px-5 md:px-6 py-3 flex items-center justify-between">
          <div className="h-5 w-20 rounded bg-slate-100" />
          <div className="h-5 w-40 rounded bg-slate-100" />
        </div>
        <div className="px-5 md:px-6 pb-3">
          <div className="h-10 rounded-[10px] bg-slate-100" />
        </div>
      </div>

      <div className="px-5 md:px-6 pt-5 grid grid-cols-2 md:grid-cols-3 gap-x-[11px] gap-y-6 md:gap-x-5 md:gap-y-[34px]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <div className="w-full aspect-[16/11] rounded-lg bg-slate-100" />
            <div className="mt-2 h-[21px] w-[72px] rounded bg-slate-100" />
            <div className="mt-1.5 h-[38px] md:h-[43px] rounded bg-slate-100" />
            <div className="mt-1.5 h-[17px] w-2/5 rounded bg-slate-100" />
            <div className="mt-1.5 h-[25px] w-1/2 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
