import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import styles from './Main.module.css';

/**
 * Main 컴포넌트 - 대시보드
 * 
 * 표시 내용:
 * 1. 사용자 토큰 정보
 * 2. 오늘의 게임 정보
 * 3. 통계 (전체 게임 수, 승률, 최고 순위 등)
 * 4. 최근 게임 기록
 */
const Main = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 대시보드 데이터 가져오기
  const fetchDashboardData = async () => {
    try {
      // 회원 통계 (/api/member/statistics)
      const statsRes = await api.get('/api/member/statistics');
      const stats = statsRes.data.data;

      // 최근 게임 기록 (/api/member/recent-games)
      const recentRes = await api.get('/api/member/recent-games', {
        params: { limit: 4 }
      });

      const recentGamesRaw = recentRes.data.data || [];
      const recentGames = recentGamesRaw.map(game => ({
        gameDate: game.gameDate,
        word: game.word,
        status: game.status,
        isSuccess: game.status === 'SUCCESS',
        attemptCount: game.attemptCount,
        highestSimilarity: game.highestSimilarity
      }));

      setDashboardData({
        totalGames: stats.totalGames,
        winRate: Math.round((stats.successRate || 0) * 100),
        bestRank: stats.bestRank,
        currentStreak: stats.currentStreak,
        recentGames
      });
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 게임 시작 핸들러
  const handleStartGame = async () => {
    if (isStarting) return;
    
    setIsStarting(true);
    try {
      navigate('/game');
    } finally {
      // navigate 후에도 컴포넌트가 마운트되어 있을 수 있으므로
      setTimeout(() => setIsStarting(false), 1000);
    }
  };

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  return (
    <div>
      {/* Header */}
      <header className={styles.header}>
        <nav className={styles.nav}>
          <div className={styles.container}>
            <Link to="/main" className={styles.logo}>
              WordTreasure
            </Link>
            <ul className={styles.navLinks}>
              <li><Link to="/main" className={styles.navLink}>홈</Link></li>
              <li><Link to="/leaderboard" className={styles.navLink}>리더보드</Link></li>
              <li><Link to="/profile" className={styles.navLink}>프로필</Link></li>
            </ul>
            <div className={styles.navRight}>
              <div className={styles.tokenDisplay}>
                <span className={styles.tokenIcon}>🪙</span>
                <span>{user?.tokens || 0} 토큰</span>
              </div>
              <button onClick={handleLogout} className={styles.btnSecondary}>
                로그아웃
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>
            안녕하세요, {user?.nickname || '유저'}님! 👋
          </h1>
          <p className={styles.heroSubtitle}>
            오늘의 단어를 추측하고 순위를 올려보세요
          </p>
          <button 
            onClick={handleStartGame}
            className={styles.btnPrimary}
            disabled={isStarting}
          >
            {isStarting ? '게임 준비 중...' : '게임 시작하기'}
          </button>
        </div>
      </section>

      {/* Quick Stats */}
      <div className={styles.container}>
        <div className={styles.quickStats}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {dashboardData?.totalGames || 0}
            </div>
            <div className={styles.statLabel}>총 게임 수</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {dashboardData?.winRate || 0}%
            </div>
            <div className={styles.statLabel}>승률</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {dashboardData?.bestRank || '-'}
            </div>
            <div className={styles.statLabel}>최고 순위</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {dashboardData?.currentStreak || 0}
            </div>
            <div className={styles.statLabel}>연속 성공</div>
          </div>
        </div>

        {/* Recent Games */}
        <div className={styles.recentGames}>
          <h2 className={styles.sectionTitle}>최근 게임 기록</h2>
          <div className={styles.gamesGrid}>
            {dashboardData?.recentGames?.length > 0 ? (
              dashboardData.recentGames.map((game, index) => (
                <div key={index} className={styles.gameCard}>
                  <div className={styles.gameDate}>
                    {new Date(game.gameDate).toLocaleDateString()}
                  </div>
                  <div className={styles.gameResult}>
                    {game.isSuccess ? '✅ 성공' : '❌ 실패'}
                  </div>
                  <div className={styles.gameDetails}>
                    단어: {game.word}
                  </div>
                  <div className={styles.gameDetails}>
                    시도: {game.attemptCount}회 | 최고 유사도: {game.highestSimilarity}%
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                아직 플레이한 게임이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;
