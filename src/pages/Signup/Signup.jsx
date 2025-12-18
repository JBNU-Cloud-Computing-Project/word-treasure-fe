import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Signup.module.css';

/**
 * Signup 컴포넌트 - 완전한 회원가입 페이지
 * 
 * 주요 기능:
 * 1. 닉네임/이메일/비밀번호 입력 및 유효성 검사
 * 2. 비밀번호 확인 매칭 검증
 * 3. 실시간 유효성 피드백
 * 4. 회원가입 API 호출
 * 5. 성공 시 로그인 페이지로 이동
 */
const Signup = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateStatus, setDuplicateStatus] = useState({
    nickname: null, // { isDuplicate, message }
    email: null
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // 이미 로그인되어 있으면 메인으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/main', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 비밀번호 강도 계산
  useEffect(() => {
    if (formData.password) {
      let strength = 0;
      if (formData.password.length >= 8) strength++;
      if (/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password)) strength++;
      if (/\d/.test(formData.password)) strength++;
      if (/[^a-zA-Z\d]/.test(formData.password)) strength++;
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [formData.password]);

  // 입력값 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 에러 메시지 초기화
    setError('');
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
    // 중복 상태 초기화
    if (name === 'nickname' || name === 'email') {
      setDuplicateStatus(prev => ({ ...prev, [name]: null }));
    }
  };

  // 필드별 실시간 유효성 검사
  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = '';

    switch (name) {
      case 'nickname':
        if (!value.trim()) {
          error = '닉네임을 입력해주세요.';
        } else if (value.length < 2) {
          error = '닉네임은 2자 이상이어야 합니다.';
        } else if (value.length > 10) {
          error = '닉네임은 10자 이하여야 합니다.';
        } else {
          // 닉네임 중복 확인
          checkNicknameDuplicate(value);
        }
        break;
      
      case 'email':
        if (!value.trim()) {
          error = '이메일을 입력해주세요.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = '올바른 이메일 형식이 아닙니다.';
        } else {
          // 이메일 중복 확인
          checkEmailDuplicate(value);
        }
        break;
      
      case 'password':
        if (!value) {
          error = '비밀번호를 입력해주세요.';
        } else if (value.length < 8) {
          error = '비밀번호는 8자 이상이어야 합니다.';
        }
        break;
      
      case 'passwordConfirm':
        if (!value) {
          error = '비밀번호를 다시 입력해주세요.';
        } else if (value !== formData.password) {
          error = '비밀번호가 일치하지 않습니다.';
        }
        break;
    }

    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  // 닉네임 중복 확인 (/api/auth/check/nickname?nickName=...)
  const checkNicknameDuplicate = async (nickname) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/auth/check/nickname?nickName=${encodeURIComponent(nickname)}`,
        { credentials: 'include' }
      );
      const body = await res.json();
      const data = body.data;

      setDuplicateStatus(prev => ({
        ...prev,
        nickname: { isDuplicate: data.isDuplicate, message: data.message }
      }));
    } catch (err) {
      console.error('닉네임 중복 확인 실패:', err);
    }
  };

  // 이메일 중복 확인 (/api/auth/check/email?email=...)
  const checkEmailDuplicate = async (email) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/auth/check/email?email=${encodeURIComponent(email)}`,
        { credentials: 'include' }
      );
      const body = await res.json();
      const data = body.data;

      setDuplicateStatus(prev => ({
        ...prev,
        email: { isDuplicate: data.isDuplicate, message: data.message }
      }));
    } catch (err) {
      console.error('이메일 중복 확인 실패:', err);
    }
  };

  // 폼 검증
  const validateForm = () => {
    // 닉네임 검증
    if (!formData.nickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return false;
    }
    if (formData.nickname.length < 2 || formData.nickname.length > 10) {
      setError('닉네임은 2~10자 사이여야 합니다.');
      return false;
    }

    // 이메일 검증
    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return false;
    }

    // 비밀번호 검증
    if (!formData.password) {
      setError('비밀번호를 입력해주세요.');
      return false;
    }
    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return false;
    }

    // 비밀번호 확인 검증
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
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
      const result = await signup(
        formData.email,
        formData.nickname,
        formData.password
      );
      
      if (result.success) {
        // 회원가입 성공 - 로그인 페이지로 이동
        alert('🎉 회원가입이 완료되었습니다! 로그인해주세요.');
        navigate('/login');
      } else {
        // 회원가입 실패 - 에러 메시지 표시
        setError(result.message || '회원가입에 실패했습니다.');
      }
    } catch (err) {
      console.error('회원가입 에러:', err);
      setError(err.response?.data?.message || '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 강도 표시
  const getPasswordStrengthLabel = () => {
    const labels = ['', '약함', '보통', '강함', '매우 강함'];
    return labels[passwordStrength];
  };

  const getPasswordStrengthColor = () => {
    const colors = ['', '#EC4C64', '#FFC857', '#4AD98F', '#3EC7C2'];
    return colors[passwordStrength];
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* 로고 섹션 */}
        <div className={styles.authLogo}>
          <div className={styles.logoIcon}>🎯</div>
          <h1>WordTreasure</h1>
          <p>회원가입</p>
        </div>
        
        {/* 회원가입 폼 */}
        <form onSubmit={handleSubmit}>
          {/* 전역 에러 메시지 */}
          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}
          
          {/* 닉네임 입력 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="nickname">
              닉네임
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>👤</span>
              <input
                type="text"
                className={`${styles.formInput} ${fieldErrors.nickname ? styles.inputError : ''}`}
                id="nickname"
                name="nickname"
                placeholder="게임에서 사용할 이름 (2-10자)"
                value={formData.nickname}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="username"
                autoFocus
              />
            </div>
            {fieldErrors.nickname && (
              <div className={styles.fieldError}>{fieldErrors.nickname}</div>
            )}
            {!fieldErrors.nickname && duplicateStatus.nickname && (
              <div
                className={
                  duplicateStatus.nickname.isDuplicate
                    ? styles.fieldError
                    : styles.successMessage
                }
              >
                {duplicateStatus.nickname.message}
              </div>
            )}
          </div>
          
          {/* 이메일 입력 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="email">
              이메일
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>📧</span>
              <input
                type="email"
                className={`${styles.formInput} ${fieldErrors.email ? styles.inputError : ''}`}
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && (
              <div className={styles.fieldError}>{fieldErrors.email}</div>
            )}
            {!fieldErrors.email && duplicateStatus.email && (
              <div
                className={
                  duplicateStatus.email.isDuplicate
                    ? styles.fieldError
                    : styles.successMessage
                }
              >
                {duplicateStatus.email.message}
              </div>
            )}
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
                className={`${styles.formInput} ${fieldErrors.password ? styles.inputError : ''}`}
                id="password"
                name="password"
                placeholder="8자 이상 입력"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            {fieldErrors.password && (
              <div className={styles.fieldError}>{fieldErrors.password}</div>
            )}
            {/* 비밀번호 강도 표시 */}
            {formData.password && (
              <div className={styles.passwordStrength}>
                <div className={styles.strengthBar}>
                  <div 
                    className={styles.strengthFill}
                    style={{ 
                      width: `${passwordStrength * 25}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }}
                  />
                </div>
                <span style={{ color: getPasswordStrengthColor() }}>
                  {getPasswordStrengthLabel()}
                </span>
              </div>
            )}
          </div>
          
          {/* 비밀번호 확인 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="passwordConfirm">
              비밀번호 확인
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>🔒</span>
              <input
                type="password"
                className={`${styles.formInput} ${fieldErrors.passwordConfirm ? styles.inputError : ''}`}
                id="passwordConfirm"
                name="passwordConfirm"
                placeholder="비밀번호를 다시 입력"
                value={formData.passwordConfirm}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            {fieldErrors.passwordConfirm && (
              <div className={styles.fieldError}>{fieldErrors.passwordConfirm}</div>
            )}
            {formData.passwordConfirm && formData.password === formData.passwordConfirm && (
              <div className={styles.successMessage}>✓ 비밀번호가 일치합니다</div>
            )}
          </div>
          
          {/* 회원가입 버튼 */}
          <button 
            type="submit" 
            className={styles.btnSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                가입 중...
              </>
            ) : (
              <>
                회원가입 🚀
              </>
            )}
          </button>
        </form>
        
        {/* 로그인 링크 */}
        <div className={styles.authFooter}>
          <p>
            이미 계정이 있으신가요? 
            <Link to="/login" className={styles.loginLink}>
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;