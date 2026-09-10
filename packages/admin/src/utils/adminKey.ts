// 어드민 API 키 보관소.
// 로그인 시 입력한 키를 브라우저에만 저장하고, 쓰기 요청 헤더에 실어 보낸다.
// (빌드 결과물에는 키가 포함되지 않으므로, 로그인한 사람만 쓰기 API를 호출할 수 있다.)
const ADMIN_KEY_STORAGE = 'tourstream_admin_key';

export const getAdminKey = (): string => {
  try {
    return localStorage.getItem(ADMIN_KEY_STORAGE) || '';
  } catch {
    return '';
  }
};

export const saveAdminKey = (key: string) => {
  try {
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
  } catch {
    // 저장 실패해도(프라이빗 모드 등) 현재 세션 동작은 막지 않는다
  }
};

export const clearAdminKey = () => {
  try {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    // noop
  }
};

// 쓰기 요청에 붙일 인증 헤더
export const adminAuthHeaders = (): Record<string, string> => {
  const key = getAdminKey();
  return key ? { 'X-Admin-Key': key } : {};
};
