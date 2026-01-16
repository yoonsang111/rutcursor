// 지역 타입 정의
export interface Country {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: string;
  name: string;
  countryId: string; // 국가 ID
  createdAt: string;
  updatedAt: string;
}

export interface LocationFormData {
  name: string;
  countryId?: string; // 지역인 경우 국가 ID 필요
  type: 'country' | 'region'; // 국가 또는 지역
}
