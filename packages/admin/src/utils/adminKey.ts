// 어드민 인증.
//
// 예전에는 관리자 키를 localStorage에 보관하고 요청 헤더에 실어 보냈다.
// 그 방식은 XSS가 한 번만 생겨도 키가 통째로 털린다(키 하나로 모든 쓰기 API가 열린다).
// 지금은 로그인할 때만 키를 서버로 보내고, 서버가 내려준 HttpOnly 쿠키로 인증한다.
// 쿠키는 자바스크립트가 읽을 수 없어 XSS로도 꺼내갈 수 없다.
//
// 그래서 여기에는 보관할 키가 없다. 모든 요청에 credentials: 'include' 만 붙이면 된다.

// 쓰기 요청에 붙일 공통 옵션 (쿠키를 함께 보낸다)
export const adminRequestInit = (): RequestInit => ({ credentials: 'include' });

// 과거 코드 호환용. 더 이상 헤더로 키를 보내지 않는다.
export const adminAuthHeaders = (): Record<string, string> => ({});

// 로그인 흔적이 남아 있던 브라우저에서 예전 키를 지운다 (한 번만 실행되면 된다)
export const clearLegacyAdminKey = () => {
  try {
    localStorage.removeItem('tourstream_admin_key');
  } catch {
    // 프라이빗 모드 등에서 실패해도 동작에는 영향 없음
  }
};
