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
  const [currentGameData, setCurrentGameData] = useState(null);
  const [tokenPoolData, setTokenPoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchCurrentGameData();
    fetchTokenPoolData();
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
        isFailed: game.status === 'FAIL',
        attemptCount: game.attemptCount,
        highestSimilarity: game.highestSimilarity
      }));

      // 가장 최근 게임이 오늘 완료되었는지 확인 (성공 또는 실패)
      const latestGame = recentGames.length > 0 ? recentGames[0] : null;
      const isCompletedToday = latestGame && (latestGame.isSuccess || latestGame.isFailed);
      const isFailedToday = latestGame && latestGame.isFailed;

      setDashboardData({
        totalGames: stats.totalGames,
        winRate: Math.round(stats.successRate || 0),
        bestRank: stats.bestRank,
        currentStreak: stats.currentStreak,
        recentGames,
        hasPlayedToday: isCompletedToday,
        isFailedToday: isFailedToday,
        recentGames,
        currentTokens: stats.currentTokens
      });
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentGameData = async () => {
    try {
      const res = await api.get('/api/game/current');
      const gameInfo = res.data.data;

      const isGameCompleted = gameInfo.status === 'SUCCESS' || gameInfo.status === 'FAIL';
      
      setCurrentGameData({
        hasSession: gameInfo.sessionId != null,
        status: gameInfo.status,
        isCompleted: isGameCompleted
      });

      console.log('현재 게임 상태:', {
        status: gameInfo.status,
        sessionId: gameInfo.sessionId,
        isCompleted: isGameCompleted
      }); // 디버깅용
    } catch (error) {
      console.error('현재 게임 데이터 로드 실패:', error);
      setCurrentGameData({
        hasSession: false,
        status: null,
        isCompleted: false
      });
    }
  };


  // 토큰 풀 데이터 가져오기
  const fetchTokenPoolData = async () => {
    try {
      const res = await api.get('/api/token-pool/today');
      setTokenPoolData(res.data.data);
    } catch (error) {
      console.error('토큰 풀 데이터 로드 실패:', error);
    }
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 게임 시작 핸들러
  const handleStartGame = async () => {
    if (isStarting || dashboardData?.hasPlayedToday) return;
    
    setIsStarting(true);
    try {
      navigate('/game');
    } finally {
      // navigate 후에도 컴포넌트가 마운트되어 있을 수 있으므로
      setTimeout(() => setIsStarting(false), 1000);
    }
  };

 // 게임 시작 가능 여부 - 더 명확하게 체크
 const canStartGame = () => {
  if (isStarting) return false;
  if (!currentGameData) return false; // 아직 로딩 중
  return !currentGameData.isCompleted; // 완료되지 않았으면 시작 가능
};

// loading 체크 수정
if (loading || !currentGameData) {
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
                <span>{dashboardData?.currentTokens ?? (user?.tokens || 0)} 토큰</span>
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
          {tokenPoolData && (
            <div className={styles.tokenPoolInfo}>
              <div className={styles.tokenPoolTitle}>💰 오늘의 토큰 풀</div>
              <div className={styles.tokenPoolAmount}>
                {tokenPoolData.totalPool?.toLocaleString() || 0} 토큰
              </div>
              <p className={styles.tokenPoolDescription}>
                {tokenPoolData.totalPool > 0 
                  ? (
                    <>
                      오늘 정답을 맞추면 이 토큰을 획득할 수 있어요!
                      <br />
                      다음 게임 시작 전에 순위별로 배분됩니다.
                    </>
                  )
                  : (
                    <>
                      아직 토큰이 모이지 않았어요. 게임에 참여하고 순위를 올려보세요!
                      <br />
                      다음 게임 시작 전에 순위별로 배분됩니다.
                    </>
                  )}
              </p>
            </div>
          )}
          {currentGameData?.isCompleted && (
            <p className={styles.heroSubtitle}>
              {currentGameData.status === 'FAIL'
                ? '오늘 최대 시도 횟수에 도달하셨어요 😢 내일 다시 도전해보세요!'
                : '오늘 정답을 이미 맞추셨어요 🎉 내일 다시 만나요~!'}
            </p>
          )}
          <button 
            onClick={handleStartGame}
            className={styles.btnPrimary}
            disabled={!canStartGame()} // 함수 호출로 변경
          >
            {canStartGame()
              ? '내일 만나요~!'
              : (isStarting ? '게임 준비 중...' : '게임 시작하기')}
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
                    {game.isSuccess ? '✅ 성공' : game.isFailed ? '❌ 실패' : '⏳ 진행중'}
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
