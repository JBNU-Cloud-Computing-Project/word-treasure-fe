import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * PrivateRoute - 인증이 필요한 페이지를 보호하는 컴포넌트
 * 
 * 동작 원리:
 * 1. loading 중이면 로딩 표시
 * 2. 로그인 안되어 있으면 로그인 페이지로 리다이렉트
 * 3. 로그인 되어 있으면 자식 컴포넌트 렌더링
 * 
 * 사용 예시:
 * <Route path="/game" element={<PrivateRoute><Game /></PrivateRoute>} />
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // 로딩 중일 때
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        로딩 중...
      </div>
    );
  }

  // 로그인 안되어 있으면 로그인 페이지로
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 로그인 되어 있으면 자식 컴포넌트 렌더링
  return children;
};

export default PrivateRoute;
