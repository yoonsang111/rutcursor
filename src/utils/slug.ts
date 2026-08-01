// URL slug 생성 유틸리티

/**
 * 문자열을 URL-friendly slug로 변환
 * 한글은 영문과 숫자로 변환하여 URL-safe하게 처리
 * @param text - 변환할 텍스트
 * @returns slug 문자열 (영문, 숫자, 하이픈만 포함)
 */
export const createSlug = (text: string): string => {
  // 한글을 영문으로 변환하는 간단한 매핑 (주요 키워드)
  const koreanToEnglish: { [key: string]: string } = {
    '오사카': 'osaka',
    '도쿄': 'tokyo',
    '유니버설': 'universal',
    '스튜디오': 'studio',
    '재팬': 'japan',
    '입장권': 'ticket',
    '스카이트리': 'skytree',
    '디즈니': 'disney',
    '랜드': 'land',
    '시': 'sea',
    '테마파크': 'themepark',
    '티켓': 'ticket',
    '관광': 'tour',
    '투어': 'tour',
  };

  let result = text
    .trim()
    .toLowerCase()
    // 기본 정리: 영문, 숫자, 공백, 하이픈만 유지
    .replace(/[^\w\s-]/g, '')
    // 공백을 하이픈으로 변환
    .replace(/\s+/g, '-')
    // 연속된 하이픈을 하나로
    .replace(/-+/g, '-')
    // 앞뒤 하이픈 제거
    .replace(/^-+|-+$/g, '');

  // 한글이 남아있으면 기본 slug 생성 (한글 제거하고 영문/숫자만)
  // 또는 ID 기반으로만 사용
  if (!result || result.length === 0) {
    // 한글이 많으면 빈 문자열이 될 수 있으므로, 기본값 반환
    return 'product';
  }

  return result;
};

/**
 * 상품 ID를 slug로 변환 (6자리 번호 사용)
 * @param id - 상품 ID (6자리 번호 문자열 또는 product_X 형식)
 * @returns slug 문자열 (예: "100001")
 */
export const createProductSlug = (id: string, name?: string): string => {
  // ID가 이미 6자리 숫자면 그대로 사용
  if (/^\d{6}$/.test(id)) {
    return id;
  }
  
  // 기존 product_X 형식에서 숫자 추출
  const idNumber = id.replace(/[^0-9]/g, '');
  if (idNumber) {
    // product_1 -> 100001, product_2 -> 100002 형식으로 변환
    const num = parseInt(idNumber, 10);
    if (num > 0) {
      return (100000 + num).toString();
    }
  }
  
  // 기본값
  return '100001';
};

/**
 * slug에서 상품 ID 추출 (6자리 번호)
 * @param slug - slug 문자열 (6자리 번호)
 * @returns 상품 ID (6자리 번호 문자열)
 */
export const extractProductIdFromSlug = (slug: string): string | null => {
  // URL 디코딩 먼저 시도
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (e) {
    // 디코딩 실패 시 원본 사용
  }
  
  // slug가 6자리 숫자인지 확인
  if (/^\d{6}$/.test(decodedSlug)) {
    return decodedSlug;
  }
  
  // 하위 호환성: product_X 형식 지원 (product_1 -> 100001)
  if (decodedSlug.startsWith('product_')) {
    const num = decodedSlug.replace(/[^0-9]/g, '');
    if (num) {
      const numValue = parseInt(num, 10);
      if (numValue > 0) {
        return (100000 + numValue).toString();
      }
    }
  }
  
  // 숫자만 추출해서 6자리로 변환 시도
  const numbers = decodedSlug.replace(/[^0-9]/g, '');
  if (numbers) {
    const numValue = parseInt(numbers, 10);
    if (numValue > 0 && numValue < 1000000) {
      // 100000 미만이면 100000을 더함
      if (numValue < 100000) {
        return (100000 + numValue).toString();
      }
      // 이미 6자리 범위면 그대로 사용
      return numValue.toString();
    }
  }
  
  return null;
};

/**
 * slug에서 상품명 추출 (대략적인 추정)
 * @param slug - slug 문자열
 * @returns 상품명 추정값
 */
export const extractProductNameFromSlug = (slug: string): string => {
  // 마지막 숫자 부분 제거하고 하이픈을 공백으로
  return slug.replace(/-\d+$/, '').replace(/-/g, ' ');
};
