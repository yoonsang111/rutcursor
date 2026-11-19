// 지역 타입 정의

/*
  englishName 은 주소(/country/japan, /region/osaka)를 만드는 데 쓴다.
  전에는 이 칸이 없어서 코드가 한글을 소리나는 대로 옮겼고,
  그 결과 /region/sseuchwan(쓰촨), /country/dokil(독일) 같은 주소가 나왔다.
  비어 있으면 그 지역은 사이트맵에 올리지 않는다 (쓰레기 주소를 검색엔진에 넘기지 않으려고).
*/

export interface Country {
  id: string;
  name: string;
  /** 주소에 쓰는 영어 이름. 예: japan, united-states */
  englishName?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: string;
  name: string;
  countryId: string; // 국가 ID
  /** 주소에 쓰는 영어 이름. 예: osaka, san-francisco */
  englishName?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationFormData {
  name: string;
  countryId?: string; // 지역인 경우 국가 ID 필요
  type: 'country' | 'region'; // 국가 또는 지역
}
