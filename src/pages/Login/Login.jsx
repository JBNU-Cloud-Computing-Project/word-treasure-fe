import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Login.module.css';

/**
 * Login 컴포넌트 - 완전한 로그인 페이지
 * 
 * 주요 기능:
 * 1. 이메일/비밀번호 입력 및 유효성 검사
 * 2. 로그인 API 호출 (세션 기반)
 * 3. 성공 시 메인 페이지로 이동
 * 4. 실패 시 에러 메시지 표시
 * 5. Enter 키로 폼 제출
 * 6. 로딩 상태 표시
 * 7. 이메일 저장 (Remember me - 선택)
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 이미 로그인되어 있으면 메인으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/main', { replace: true });
    }
    
    // 저장된 이메일 불러오기
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, [isAuthenticated, navigate]);

  // 입력값 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 에러 메시지 초기화
    setError('');
  };

  // Remember Me 체크박스 핸들러
  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  // 폼 유효성 검사
  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    
    // 간단한 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return false;
    }
    
    if (!formData.password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return false;
    }
    
    if (formData.password.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다.');
      return false;
    }
    
    return true;
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Remember Me 처리
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // 로그인 성공 - 메인 페이지로 이동
        navigate('/main', { replace: true });
      } else {
        // 로그인 실패 - 에러 메시지 표시
        setError(result.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      console.error('로그인 에러:', err);
      setError(err.response?.data?.message || '로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* 로고 섹션 */}
        <div className={styles.authLogo}>
          <div className={styles.logoIcon}>🎯</div>
          <h1>WordTreasure</h1>
          <p>AI 단어 추측 게임</p>
        </div>
        
        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} onKeyPress={handleKeyPress}>
          {/* 에러 메시지 */}
          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}
          
          {/* 이메일 입력 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="email">
              이메일
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>📧</span>
              <input
                type="email"
                className={styles.formInput}
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>
          
          {/* 비밀번호 입력 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="password">
              비밀번호
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>🔒</span>
              <input
                type="password"
                className={styles.formInput}
                id="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Remember Me */}
          <div className={styles.rememberMe}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={handleRememberMeChange}
                disabled={loading}
              />
              <span>이메일 기억하기</span>
            </label>
          </div>
          
          {/* 로그인 버튼 */}
          <button 
            type="submit" 
            className={styles.btnSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                로그인 중...
              </>
            ) : (
              <>
                로그인 🚀
              </>
            )}
          </button>
        </form>
        
        {/* 회원가입 링크 */}
        <div className={styles.authFooter}>
          <p>
            계정이 없으신가요? 
            <Link to="/signup" className={styles.signupLink}>
              회원가입
            </Link>
          </p>
        </div>

        {/* 추가 정보 */}
        <div className={styles.authInfo}>
          <p>🎮 매일 새로운 단어 도전</p>
          <p>🏆 실시간 순위 경쟁</p>
          <p>🤖 AI 힌트 시스템</p>
        </div>
      </div>
    </div>
  );
};

export default Login;