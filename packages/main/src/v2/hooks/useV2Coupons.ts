import { useEffect, useState } from "react";
import { api } from "../../utils/api";
import type { Coupon } from "../utils/coupons";

// 서버가 만료된 쿠폰을 이미 제외하고 내려주므로 여기서는 형태만 정리한다.
export function useV2Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getCoupons()
      .then((data: unknown) => {
        if (!alive) return;
        setCoupons(Array.isArray(data) ? (data as Coupon[]).filter((c) => c && c.code) : []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { coupons, loading };
}
