import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import styles from './Game.module.css';

/**
 * Game 컴포넌트 - 완전한 게임 플레이 페이지
 * 
 * 주요 기능:
 * 1. 타임라인 형식의 시도 기록 (최신이 위)
 * 2. 실시간 순위 표시 (사이드바)
 * 3. 유사도 바 애니메이션
 * 4. AI 힌트 시스템
 * 5. 하단 고정 입력창
 * 6. 스크롤 투 탑 버튼
 */
const Game = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);
  
  //초기화 진행 중인지 추적 (useRef 사용)
  const initializingRef = useRef(false);
  
  // 게임 상태
  const [gameData, setGameData] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    //이미 초기화 중이면 무시
    if (initializingRef.current) return;
    
    initializingRef.current = true;
    initializeGame();
    
    // 스크롤 이벤트 리스너
    window.addEventListener('scroll', handleScroll);
    
    //cleanup: 컴포넌트 언마운트 시 초기화 플래그 리셋
    return () => {
      window.removeEventListener('scroll', handleScroll);
      initializingRef.current = false;
    };
  }, []);

  // 게임 세션 초기화: 현재 상태 조회 후 필요 시 게임 시작
  const initializeGame = async () => {
    try {
      const currentRes = await api.get('/api/game/current');
      const current = currentRes.data.data;

      if (current?.hasStarted && current?.gameSessionId) {
        setGameData(current);
      } else {
        const startRes = await api.post('/api/game/start', {
          dailyWordId: current.dailyWordId
        });
        setGameData(startRes.data.data);
      }
    } catch (error) {
      console.error('게임 초기화 실패:', error);
      alert('게임을 시작할 수 없습니다.');
      navigate('/main');
    }
  };

  // 스크롤 감지
  const handleScroll = () => {
    setShowScrollTop(window.pageYOffset > 300);
  };

  // 특정 단어에 대한 실시간 순위 가져오기
  const fetchRankings = async (dailyWordId) => {
    if (!dailyWordId) return;
    try {
      const response = await api.get('/api/game/rankings/live', {
        params: {
          dailyWordId,
          limit: 20
        }
      });
      const data = response.data.data;
      setRankings(data?.rankings || []);
    } catch (error) {
      console.error('순위 로드 실패:', error);
    }
  };

  // gameData가 준비된 후 10초마다 순위 갱신
  useEffect(() => {
    if (!gameData?.dailyWordId) return;

    fetchRankings(gameData.dailyWordId);
    const rankingInterval = setInterval(
      () => fetchRankings(gameData.dailyWordId),
      10000
    );

    return () => clearInterval(rankingInterval);
  }, [gameData?.dailyWordId]);

  // 추측 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || loading) return;

    setLoading(true);
    try {
      const response = await api.post('/api/game/attempt', {
        gameSessionId: gameData?.gameSessionId,
        userInput: userInput.trim()
      });

      const result = response.data.data;
      // API 스펙: similarityScore가 이미 0~100(%) 값으로 전달되므로 그대로 사용
      const normalizedResult = {
        ...result,
        similarity: Math.round(result.similarityScore ?? result.similarity ?? 0)
      };

      // 새로운 시도를 맨 앞에 추가 (타임라인 형식)
      setAttempts(prev => [normalizedResult, ...prev]);
      
      // 입력창 초기화
      setUserInput('');
      
      // 정답이면 성공 페이지로
      if (result.isCorrect) {
        setTimeout(() => {
          navigate('/result/success', { 
            state: { 
              attempts: attempts.length + 1,
              rank: result.rank,
              tokens: result.tokensEarned 
            }
          });
        }, 1500);
      }
      
      // 최상단으로 스크롤
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('추측 실패:', error);
      alert(error.response?.data?.message || '추측 제출에 실패했습니다.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // 맨 위로 스크롤
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 유사도에 따른 배지 스타일
  const getSimilarityBadgeStyle = (similarity) => {
    if (similarity >= 90) {
      return { background: '#D4EDDA', color: '#155724' };
    } else if (similarity >= 70) {
      return { background: '#D1ECF1', color: '#0C5460' };
    } else if (similarity >= 50) {
      return { background: '#FFF3CD', color: '#856404' };
    } else {
      return { background: '#F8D7DA', color: '#721C24' };
    }
  };

  return (
    <div className={styles.gameWrapper}>
      {/* Header */}
      <header className={styles.gameHeader}>
        <div className={styles.container}>
          <div className={styles.gameInfo}>
            <button 
              onClick={() => navigate('/main')} 
              className={styles.btnBack}
            >
              ← 나가기
            </button>
            <h1 className={styles.gameTitle}>오늘의 단어 맞추기</h1>
            <div className={styles.attemptCounter}>
              <span>시도 횟수:</span>
              <strong>{attempts.length}회</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.container}>
        <div className={styles.gameLayout}>
          {/* 메인 타임라인 영역 */}
          <div className={styles.gameMain}>
            <div className={styles.attemptsTimeline}>
              {attempts.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎯</div>
                  <h3>첫 시도를 시작하세요!</h3>
                  <p>단어나 문장을 입력하여 정답에 도전해보세요.</p>
                </div>
              ) : (
                attempts.map((attempt, index) => (
                  <div 
                    key={index} 
                    className={`${styles.timelineItem} ${index === 0 ? styles.latest : ''}`}
                  >
                    {/* 헤더 */}
                    <div className={styles.timelineHeader}>
                      <div className={styles.timelineWord}>
                        {attempt.userInput}
                      </div>
                      <div 
                        className={styles.timelineBadge}
                        style={getSimilarityBadgeStyle(attempt.similarity)}
                      >
                        {attempt.similarity}%
                      </div>
                      {index === 0 && (
                        <div className={styles.badgeLatest}>최신</div>
                      )}
                    </div>

                    {/* 유사도 바 */}
                    <div className={styles.timelineSimilarity}>
                      <div className={styles.similarityRow}>
                        <div className={styles.similarityPercent}>
                          {attempt.similarity}%
                        </div>
                        <div className={styles.similarityBarWrapper}>
                          <div className={styles.similarityBar}>
                            <div 
                              className={styles.similarityFill}
                              style={{ width: `${attempt.similarity}%` }}
                            />
                          </div>
                          <div className={styles.similarityLabel}>
                            유사도
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI 힌트 */}
                    {attempt.hint && (
                      <div className={styles.timelineHint}>
                        <div className={styles.hintHeader}>
                          <span className={styles.hintIcon}>💡</span>
                          <strong>AI 힌트</strong>
                        </div>
                        <p>{attempt.hint}</p>
                      </div>
                    )}

                    {/* 메타 정보 */}
                    <div className={styles.timelineMeta}>
                      <span>{attempt.timestamp || '방금 전'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 사이드바 - 실시간 순위 */}
          <aside className={styles.gameSidebar}>
            <div className={styles.liveRankings}>
              <h3 className={styles.rankingTitle}>
                <span className={styles.liveIndicator}></span>
                실시간 순위
              </h3>
              
              {rankings.slice(0, 5).map((player, index) => (
                <div 
                  key={index}
                  className={`${styles.rankingItem} ${
                    player.memberId === user?.memberId ? styles.myRank : ''
                  }`}
                >
                  <span className={`${styles.rankingPosition} ${styles[`rank${index + 1}`]}`}>
                    #{index + 1}
                  </span>
                  <span className={styles.rankingName}>
                    {player.nickname}
                    {player.memberId === user?.memberId && ' (나)'}
                  </span>
                  <span className={styles.rankingTime}>
                    {player.attempts}번 시도
                  </span>
                </div>
              ))}
              
              {/* 내 순위가 5위 밖이면 따로 표시 */}
              {rankings.findIndex(p => p.memberId === user?.memberId) > 4 && (
                <div className={`${styles.rankingItem} ${styles.myRank}`}>
                  <span className={styles.rankingPosition}>
                    #{rankings.findIndex(p => p.memberId === user?.memberId) + 1}
                  </span>
                  <span className={styles.rankingName}>
                    {user?.nickname} (나)
                  </span>
                  <span className={styles.rankingTime}>진행중</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* 하단 고정 입력창 */}
      <div className={styles.inputSectionFixed}>
        <div className={styles.inputWrapperContainer}>
          <form onSubmit={handleSubmit} className={styles.inputContent}>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="단어나 문장을 입력하세요..."
              className={styles.gameInput}
              disabled={loading}
              autoFocus
            />
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading || !userInput.trim()}
            >
              {loading ? '분석 중...' : '제출 🚀'}
            </button>
          </form>
        </div>
      </div>

      {/* 맨 위로 가기 버튼 */}
      {showScrollTop && (
        <button 
          className={styles.scrollTopBtn}
          onClick={scrollToTop}
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default Game;