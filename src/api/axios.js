import axios from 'axios';

/**
 * Axios 인스턴스 생성
 * 
 * 왜 이렇게 설정하는가?
 * 1. baseURL: 모든 API 요청의 기본 URL 설정
 * 2. withCredentials: 쿠키 기반 세션 인증을 위해 필수!
 *    - 이 옵션이 없으면 서버에서 Set-Cookie 해도 브라우저가 저장 안함
 *    - 이후 요청에 쿠키가 자동으로 포함되어야 세션 유지 가능
 * 3. timeout: 요청 타임아웃 설정 (10초)
 */
const api = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true, // 쿠키를 포함한 요청 허용 (세션 인증 필수!)
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

/**
 * 요청 인터셉터
 * 모든 요청 전에 실행됨 (로깅, 토큰 추가 등)
 */
api.interceptors.request.use(
  (config) => {
    // 개발 환경에서 요청 로깅
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 * 모든 응답 후에 실행됨 (에러 처리, 로깅 등)
 */
api.interceptors.response.use(
  (response) => {
    // 개발 환경에서 응답 로깅
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // 401 에러 (인증 실패) 처리
    if (error.response?.status === 401) {
      // 이미 로그인 페이지에 있으면 리다이렉트하지 않음 (무한 루프 방지)
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
      }
    }
    
    // 개발 환경에서 에러 로깅
    if (import.meta.env.DEV) {
      console.error('[API Error]', error.response?.data || error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
