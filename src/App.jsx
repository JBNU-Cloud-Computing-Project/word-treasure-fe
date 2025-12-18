import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Main from './pages/Main/Main';
import Game from './pages/Game/Game';
import Leaderboard from './pages/Leaderboard/Leaderboard';
import Profile from './pages/Profile/Profile';
import ResultSuccess from './pages/Result/ResultSuccess';
import ResultFail from './pages/Result/ResultFail';

import './App.module.css';

/**
 * App 컴포넌트 - 전체 라우팅 및 앱 구조
 * 
 * 라우팅 구조:
 * - / : 메인 페이지로 리다이렉트
 * - /login : 로그인 페이지
 * - /signup : 회원가입 페이지
 * - /main : 메인 대시보드 (로그인 필요)
 * - /game : 게임 페이지 (로그인 필요)
 * - /leaderboard : 리더보드 (로그인 필요)
 * - /profile : 프로필 (로그인 필요)
 * - /result/success : 성공 결과 (로그인 필요)
 * - /result/fail : 실패 결과 (로그인 필요)
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 루트 경로 - 메인으로 리다이렉트 */}
          <Route path="/" element={<Navigate to="/main" replace />} />
          
          {/* 공개 페이지 */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* 보호된 페이지 - 로그인 필요 */}
          <Route 
            path="/main" 
            element={
              <PrivateRoute>
                <Main />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/game" 
            element={
              <PrivateRoute>
                <Game />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <PrivateRoute>
                <Leaderboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/result/success" 
            element={
              <PrivateRoute>
                <ResultSuccess />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/result/fail" 
            element={
              <PrivateRoute>
                <ResultFail />
              </PrivateRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
