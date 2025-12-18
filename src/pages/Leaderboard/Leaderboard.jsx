import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import styles from './Leaderboard.module.css';

/**
 * Leaderboard 컴포넌트 - 완전한 순위 페이지
 * 
 * 주요 기능:
 * 1. 기간별 필터 (오늘/이번 주/이번 달/전체)
 * 2. 확장된 순위 정보 (아바타, 시도 횟수, 소요 시간, 획득 토큰)
 * 3. 내 순위 강조 표시
 * 4. 사이드바 통계 (오늘의 단어, 참여자 수, 난이도별 통계)
 * 5. 페이지네이션
 */
const Leaderboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [period, setPeriod] = useState('today'); // today, week, month, all
  const [rankings, setRankings] = useState([]);
  const [myRanking, setMyRanking] = useState(null);
  const [wordInfo, setWordInfo] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLeaderboard();
  }, [period, currentPage]);

  useEffect(() => {
    fetchWordInfo();
    fetchStatistics();
    fetchMemberStats();
  }, []);

  // 리더보드 데이터 가져오기
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let response;

      // 스펙 기준 엔드포인트 분기
      if (period === 'today') {
        // 일간: /api/rankings/daily
        response = await api.get('/api/rankings/daily', {
          params: {
            page: currentPage,
            size: 20
          }
        });
      } else if (period === 'week') {
        // 주간: /api/rankings/weekly
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6); // 최근 7일

        const toDateStr = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD

        response = await api.get('/api/rankings/weekly', {
          params: {
            startDate: toDateStr(start),
            endDate: toDateStr(end),
            page: currentPage,
            size: 20
          }
        });
      } else if (period === 'month') {
        // 월간: /api/rankings/monthly
        const now = new Date();
        response = await api.get('/api/rankings/monthly', {
          params: {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            page: currentPage,
            size: 20
          }
        });
      } else {
        // 전체: /api/rankings/all-time
        response = await api.get('/api/rankings/all-time', {
          params: {
            page: currentPage,
            size: 20
          }
        });
      }

      const data = response.data.data;
      setRankings(data.rankings || []);
      setMyRanking(data.myRanking || null);
      // LeaderboardResponse.pagination.totalPages 를 우선 사용
      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
    } catch (error) {
      console.error('리더보드 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 오늘의 단어 & 오늘 통계 가져오기 (/api/game/stats/today)
  const fetchWordInfo = async () => {
    try {
      const response = await api.get('/api/game/stats/today');
      setWordInfo(response.data.data);
    } catch (error) {
      console.error('단어 정보 로드 실패:', error);
    }
  };

  // 난이도별 통계 정보 가져오기 (/api/game/stats/difficulty)
  const fetchStatistics = async () => {
    try {
      const response = await api.get('/api/game/stats/difficulty');
      // DifficultyStatsResponse 그대로 저장
      setStatistics(response.data.data);
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  };

  // 회원 통계(토큰 포함) 가져오기 (/api/member/statistics)
  const fetchMemberStats = async () => {
    try {
      const response = await api.get('/api/member/statistics');
      setMemberStats(response.data.data);
    } catch (error) {
      console.error('회원 통계 로드 실패:', error);
    }
  };

  // 기간 변경 핸들러
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setCurrentPage(1); // 페이지 초기화
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 아바타 생성 (닉네임 첫 글자)
  const getAvatar = (nickname) => {
    return nickname ? nickname.charAt(0).toUpperCase() : '?';
  };

  // 아바타 색상 생성 (해시 기반)
  const getAvatarColor = (nickname) => {
    const colors = [
      'var(--primary-color)',
      'var(--secondary-color)',
      'var(--accent-color)',
      'var(--success-color)',
      'var(--warning-color)'
    ];
    const hash = nickname?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return colors[hash % colors.length];
  };

  // 난이도 배지 스타일
  const getDifficultyStyle = (difficulty) => {
    const styles = {
      'EASY': { background: '#D4EDDA', color: '#155724', label: '쉬움' },
      'MEDIUM': { background: '#FFF3CD', color: '#856404', label: '중급' },
      'HARD': { background: '#F8D7DA', color: '#721C24', label: '어려움' }
    };
    return styles[difficulty] || styles['MEDIUM'];
  };

  // 기간별 제목
  const getPeriodTitle = () => {
    const titles = {
      today: '오늘의 순위',
      week: '이번 주의 순위',
      month: '이번 달의 순위',
      all: '전체 기간 순위'
    };
    return titles[period];
  };

  // 기간별 날짜 표시
  const getPeriodDate = () => {
    const now = new Date();
    const dates = {
      today: now.toLocaleDateString('ko-KR'),
      week: `${new Date(now.setDate(now.getDate() - now.getDay())).toLocaleDateString('ko-KR')} ~ ${new Date().toLocaleDateString('ko-KR')}`,
      month: `${now.getFullYear()}년 ${now.getMonth() + 1}월`,
      all: '전체 기간'
    };
    return dates[period];
  };

  return (
    <div className={styles.wrapper}>
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
                <span>{memberStats?.currentTokens ?? (user?.tokens || 0)} 토큰</span>
              </div>
              <button onClick={handleLogout} className={styles.btnSecondary}>
                로그아웃
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className={styles.container}>
        {/* 필터 섹션 */}
        <div className={styles.leaderboardFilters}>
          <div className={styles.filterTabs}>
            <button
              className={`${styles.filterTab} ${period === 'today' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('today')}
            >
              오늘
            </button>
            <button
              className={`${styles.filterTab} ${period === 'week' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('week')}
            >
              이번 주
            </button>
            <button
              className={`${styles.filterTab} ${period === 'month' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('month')}
            >
              이번 달
            </button>
            <button
              className={`${styles.filterTab} ${period === 'all' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('all')}
            >
              전체
            </button>
          </div>
        </div>

        {/* 메인 레이아웃 */}
        <div className={styles.leaderboardMain}>
          {/* 순위 목록 */}
          <div className={styles.leaderboard}>
            <div className={styles.leaderboardHeader}>
              <h2>{getPeriodTitle()}</h2>
              <p>{getPeriodDate()}</p>
            </div>

            {loading ? (
              <div className={styles.loading}>로딩 중...</div>
            ) : rankings.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏆</div>
                <h3>아직 순위 정보가 없습니다</h3>
                <p>첫 게임에 도전해보세요!</p>
              </div>
            ) : (
              <>
                {/* 순위 리스트: 스크롤 영역 */}
                <div className={styles.leaderboardList}>
                  {rankings.map((player) => (
                    <div
                      key={player.memberId}
                      className={`${styles.extendedLeaderboardItem} ${
                        player.memberId === user?.memberId ? styles.currentUser : ''
                      }`}
                    >
                      {/* 순위 */}
                      <div className={`${styles.rank} ${styles[`rank${player.rank}`]}`}>
                        #{player.rank}
                      </div>

                      {/* 유저 정보 */}
                      <div className={styles.userInfo}>
                        <div
                          className={styles.userAvatar}
                          style={{ backgroundColor: getAvatarColor(player.nickname) }}
                        >
                          {getAvatar(player.nickname)}
                        </div>
                        <div>
                          <div className={styles.playerName}>
                            {player.nickname}
                            {player.memberId === user?.memberId && ' (나)'}
                          </div>
                        <div className={styles.playerScore}>
                          {player.description ??
                            (player.attemptCount != null
                              ? (player.tokensEarned != null && player.tokensEarned > 0
                                  ? `${player.attemptCount}번 만에 성공`
                                  : `${player.attemptCount}번 진행중`)
                              : '기록 없음')}
                        </div>
                        </div>
                      </div>

                      {/* 소요 시간 */}
                      <div className={styles.statValue}>
                        <div>{player.completionTime || '-'}</div>
                        <div className={styles.statLabel}>소요 시간</div>
                      </div>

                      {/* 최종/현재 점수 */}
                      <div className={styles.statValue}>
                        <div>
                          {period === 'today'
                            ? player.tokensEarned != null &&
                              player.tokensEarned > 0 &&
                              player.finalScore != null
                              ? `${player.finalScore.toFixed(0)}%`
                              : '-'
                            : player.finalScore != null
                            ? `${player.finalScore.toFixed(0)}%`
                            : '-'}
                        </div>
                        <div className={styles.statLabel}>
                          {period === 'today'
                            ? player.tokensEarned != null && player.tokensEarned > 0
                              ? '최종 점수'
                              : '현재 점수'
                            : '최종 점수'}
                        </div>
                      </div>

                      {/* 획득 토큰 */}
                      <div className={styles.statValue}>
                        <div>+{player.tokensEarned || 0}</div>
                        <div className={styles.statLabel}>획득 토큰</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 나의 랭킹 - 오늘의 순위 박스 하단에 별도 섹션으로 고정 */}
                {myRanking && (
                  <div className={styles.myRankingSection}>
                    <h3 className={styles.myRankingTitle}>나의 랭킹</h3>
                    <div
                      className={`${styles.extendedLeaderboardItem} ${styles.myRankingItem}`}
                    >
                      {/* 순위 */}
                      <div className={styles.rank}>
                        {myRanking.rank ? `#${myRanking.rank}` : '-'}
                      </div>

                      {/* 유저 정보 */}
                      <div className={styles.userInfo}>
                        <div
                          className={styles.userAvatar}
                          style={{
                            backgroundColor: getAvatarColor(
                              myRanking.nickname || user?.nickname || '나'
                            )
                          }}
                        >
                          {getAvatar(myRanking.nickname || user?.nickname || '나')}
                        </div>
                        <div>
                          <div className={styles.playerName}>
                            {myRanking.nickname || user?.nickname || '나'} (나)
                          </div>
                        <div className={styles.playerScore}>
                          {period === 'today'
                            ? myRanking.attemptCount != null
                              ? (myRanking.tokensEarned != null && myRanking.tokensEarned > 0
                                  ? `${myRanking.attemptCount}번 만에 성공`
                                  : `${myRanking.attemptCount}번 진행중`)
                              : '기록 없음'
                            : myRanking.totalGames != null
                            ? `총 ${myRanking.totalGames}게임, ${
                                myRanking.successfulGames ?? 0
                              }게임 성공`
                            : '기록 없음'}
                        </div>
                        </div>
                      </div>

                      {/* 소요/평균 시간 */}
                      <div className={styles.statValue}>
                        <div>
                          {period === 'today'
                            ? myRanking.completionTime || '-'
                            : myRanking.averageCompletionTime || '-'}
                        </div>
                        <div className={styles.statLabel}>
                          {period === 'today' ? '소요 시간' : '평균 시간'}
                        </div>
                      </div>

                      {/* 최종/평균/현재 점수 */}
                      <div className={styles.statValue}>
                        <div>
                          {period === 'today'
                            ? myRanking.tokensEarned != null &&
                              myRanking.tokensEarned > 0 &&
                              myRanking.finalScore != null
                              ? `${myRanking.finalScore.toFixed(0)}%`
                              : '-'
                            : myRanking.averageScore != null
                            ? `${myRanking.averageScore.toFixed(0)}점`
                            : '-'}
                        </div>
                        <div className={styles.statLabel}>
                          {period === 'today'
                            ? myRanking.tokensEarned != null && myRanking.tokensEarned > 0
                              ? '최종 점수'
                              : '현재 점수'
                            : '평균 점수'}
                        </div>
                      </div>

                      {/* 획득 토큰 */}
                      <div className={styles.statValue}>
                        <div>
                          {myRanking.tokensEarned != null
                            ? `+${myRanking.tokensEarned}`
                            : '+0'}
                        </div>
                        <div className={styles.statLabel}>획득 토큰</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.pageBtn}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      이전
                    </button>
                    
                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index + 1}
                        className={`${styles.pageBtn} ${
                          currentPage === index + 1 ? styles.active : ''
                        }`}
                        onClick={() => handlePageChange(index + 1)}
                      >
                        {index + 1}
                      </button>
                    ))}
                    
                    <button
                      className={styles.pageBtn}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 사이드바 통계 */}
          <aside className={styles.sidebarStats}>
            {/* 오늘의 단어 */}
            {wordInfo && (
              <div className={styles.wordInfoCard}>
                <h3>오늘의 단어</h3>
                <div className={styles.wordOfDay}>
                  {wordInfo.isRevealed ? wordInfo.word : '???'}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span
                    className={styles.difficultyBadge}
                    style={getDifficultyStyle(wordInfo.difficulty)}
                  >
                    {getDifficultyStyle(wordInfo.difficulty).label}
                  </span>
                </div>
                
                {/* 참여 통계 - TodayWordStatsResponse 사용 */}
                <div className={styles.participationStats}>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>
                      {wordInfo?.totalParticipants || 0}명
                    </div>
                    <div className={styles.statLabel}>참여자</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>
                      {wordInfo?.successfulParticipants || 0}명
                    </div>
                    <div className={styles.statLabel}>성공</div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <p className={styles.statLabel}>평균 시도 횟수</p>
                  <p className={styles.avgAttempts}>
                    {wordInfo?.averageAttempts || 0}회
                  </p>
                </div>
              </div>
            )}

            {/* 난이도별 통계 - DifficultyStatsResponse 사용 */}
            {statistics && (
              <div className={styles.wordInfoCard}>
                <h3>난이도별 통계</h3>
                <div style={{ marginTop: '1rem' }}>
                  <div className={styles.difficultyStatRow}>
                    <span>쉬움</span>
                    <span style={{ color: 'var(--success-color)' }}>
                      {(statistics.easy?.successRate ?? 0).toFixed(0)}% 성공률
                    </span>
                  </div>
                  <div className={styles.difficultyStatRow}>
                    <span>중급</span>
                    <span style={{ color: 'var(--warning-color)' }}>
                      {(statistics.medium?.successRate ?? 0).toFixed(0)}% 성공률
                    </span>
                  </div>
                  <div className={styles.difficultyStatRow}>
                    <span>어려움</span>
                    <span style={{ color: 'var(--danger-color)' }}>
                      {(statistics.hard?.successRate ?? 0).toFixed(0)}% 성공률
                    </span>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;