import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api/axios';

/**
 * AuthContext - 전역 인증 상태 관리
 * 
 * 왜 Context API를 사용하는가?
 * - 로그인 정보를 여러 컴포넌트에서 공유해야 함
 * - Props drilling을 피하고 깔끔하게 관리
 * - Redux는 이 프로젝트 규모에는 과함
 * 
 * 관리하는 상태:
 * - user: 현재 로그인한 사용자 정보
 * - isAuthenticated: 로그인 여부
 * - loading: 초기 로딩 상태
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkingRef = useRef(false); // 중복 호출 방지

  /**
   * 로그인 상태 확인
   * 서버에 세션이 있는지 확인하는 API 호출
   */
  const checkAuthStatus = useCallback(async () => {
    // 이미 확인 중이면 중복 호출 방지
    if (checkingRef.current) {
      return;
    }
    
    checkingRef.current = true;
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.data);
    } catch (error) {
      // 로그인되어 있지 않으면 user는 null 유지
      setUser(null);
    } finally {
      setLoading(false);
      checkingRef.current = false;
    }
  }, []);

  // 앱 시작 시 로그인 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  /**
   * 로그인 함수
   */
  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      
      // 로그인 성공 시 사용자 정보 저장
      setUser(response.data.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '로그인에 실패했습니다.'
      };
    }
  }, []);

  /**
   * 회원가입 함수
   * 서버 DTO: SignupRequest(email, nickName, password)
   */
  const signup = useCallback(async (email, nickname, password) => {
    try {
      // 디버깅: 전송할 데이터 확인
      console.log('회원가입 API 요청 데이터:', { email, nickName: nickname, password });
      
      const response = await api.post('/api/auth/signup', {
        email,
        nickName: nickname,
        password
      });
      
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '회원가입에 실패했습니다.'
      };
    }
  }, []);

  /**
   * 로그아웃 함수
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('로그아웃 에러:', error);
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    loading,
    login,
    signup,
    logout,
    checkAuthStatus
  }), [user, loading, login, signup, logout, checkAuthStatus]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * 컴포넌트에서 인증 상태를 쉽게 사용하기 위한 커스텀 훅
 * 
 * 사용 예시:
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
