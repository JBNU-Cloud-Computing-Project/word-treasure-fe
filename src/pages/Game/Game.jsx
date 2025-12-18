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
  // 실시간 순위 요청 중인지 추적 (동시 요청 방지)
  const fetchingRankingsRef = useRef(false);
  
  // 게임 상태
  const [gameData, setGameData] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [myLiveRank, setMyLiveRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

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
        // 진행 중인 게임 세션이 있는 경우: 서버에서 내려준 진행 상태(progress)로 복원
        setGameData(current);

        const progress = current.progress;

        if (progress) {
          // 1) 시도 기록 복원 (최신 시도가 배열의 앞에 오도록 정렬)
          const restoredAttempts =
            (progress.attempts || [])
              .slice()
              .sort((a, b) => (b.attemptNumber ?? 0) - (a.attemptNumber ?? 0))
              .map((attempt) => ({
                ...attempt,
                // 백엔드 similarityScore(0~100)를 프론트에서 쓰는 similarity 필드로 매핑
                similarity: Math.round(
                  attempt.similarityScore ?? attempt.similarity ?? 0
                ),
                // extraHints는 나중에 progress.hints로 채울 것
                extraHints: [],
                // createdAt을 간단한 표시용 문자열로 변환 (없으면 '방금 전')
                timestamp: attempt.createdAt || '방금 전',
              }));

          // 2) 추가 힌트(progress.hints)를 가장 최근 시도에 붙이기
          const restoredHints = progress.hints || [];
          if (restoredAttempts.length > 0 && restoredHints.length > 0) {
            // 요청 시간 기준으로 정렬 후, 내용만 뽑아서 최신 시도에 붙임
            const sortedHints = restoredHints
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.requestedAt).getTime() -
                  new Date(b.requestedAt).getTime()
              );

            const extraHintTexts = sortedHints.map(
              (hint) => hint.hintContent
            );

            restoredAttempts[0] = {
              ...restoredAttempts[0],
              extraHints: [
                ...(restoredAttempts[0].extraHints || []),
                ...extraHintTexts,
              ],
            };
          }

          setAttempts(restoredAttempts);
        } else {
          // progress가 없으면 시도 기록은 빈 배열로 초기화
          setAttempts([]);
        }
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

  // 추가 힌트 요청
  const handleRequestHint = async () => {
    if (!gameData?.gameSessionId || hintLoading) return;

    setHintLoading(true);
    try {
      const response = await api.post('/api/game/hint', {
        gameSessionId: gameData.gameSessionId,
      });

      const { hintText, remainingTokens, tokensSpent } = response.data.data;

      // 가장 최신 시도(attempts[0])에 extraHints를 추가
      setAttempts(prev => {
        if (!prev.length) return prev;

        const [latest, ...rest] = prev;
        const updatedLatest = {
          ...latest,
          extraHints: [...(latest.extraHints || []), hintText],
        };

        return [updatedLatest, ...rest];
      });

      // 필요하다면 토큰 정보로 별도 UI를 만들 수 있음
      console.log('추가 힌트 요청 - 사용 토큰:', tokensSpent, '남은 토큰:', remainingTokens);
    } catch (error) {
      console.error('추가 힌트 요청 실패:', error);
      alert(error.response?.data?.message || '추가 힌트를 불러오지 못했습니다.');
    } finally {
      setHintLoading(false);
    }
  };

  // 특정 단어에 대한 실시간 순위 가져오기
  const fetchRankings = async (dailyWordId) => {
    if (!dailyWordId) return;
    // 이미 순위 요청 중이면 중복 호출 방지
    if (fetchingRankingsRef.current) return;

    fetchingRankingsRef.current = true;
    try {
      const response = await api.get('/api/game/rankings/live', {
        params: {
          dailyWordId,
          limit: 20
        }
      });
      const data = response.data.data;
      setRankings(data?.rankings || []);
      setMyLiveRank(data?.myRank || null);
    } catch (error) {
      console.error('순위 로드 실패:', error);
    } finally {
      fetchingRankingsRef.current = false;
    }
  };

  // gameData가 준비된 후 5초마다 순위 갱신
  useEffect(() => {
    if (!gameData?.dailyWordId) return;

    fetchRankings(gameData.dailyWordId);
    const rankingInterval = setInterval(
      () => fetchRankings(gameData.dailyWordId),
      5000
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

      // 시도 제출 후에도 실시간 순위 즉시 갱신
      if (gameData?.dailyWordId) {
        fetchRankings(gameData.dailyWordId);
      }
      
      // 정답이면 성공 페이지로
      if (result.isCorrect) {
        setTimeout(() => {
          console.log(attempts);
          navigate('/result/success', { 
            state: { 
              answer: attempts.userInput,
              attemptHistory: attempts,
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

                    {/* AI 힌트 + 추가 힌트 */}
                    {attempt.hint && (
                      <div className={styles.timelineHint}>
                        <div className={styles.hintHeader}>
                          <span className={styles.hintIcon}>💡</span>
                          <strong>AI 힌트</strong>
                        </div>

                        {/* 기본 힌트 */}
                        <p>{attempt.hint}</p>

                        {/* 추가 힌트 목록 */}
                        {attempt.extraHints?.map((extraHint, i) => (
                          <p key={i} className={styles.extraHint}>
                            + {extraHint}
                          </p>
                        ))}

                        {/* 가장 최신 시도에만 추가 힌트 버튼 노출 */}
                        {index === 0 && (
                          <button
                            type="button"
                            className={styles.extraHintButton}
                            onClick={handleRequestHint}
                            disabled={hintLoading}
                          >
                            {hintLoading ? '힌트 불러오는 중...' : '추가 힌트 받기 (2 토큰 소모)'}
                          </button>
                        )}
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
              
              {/* 나의 실시간 랭킹 - 맨 위 고정 */}
              {myLiveRank && (
                <div className={`${styles.rankingItem} ${styles.myRank} ${styles.myLiveRank}`}>
                  <span className={styles.rankingPosition}>
                    {myLiveRank.rank ? `#${myLiveRank.rank}` : '-'}
                  </span>
                  <span className={styles.rankingName}>
                    {myLiveRank.nickname || user?.nickname || '나'} (나)
                  </span>
                  <span className={styles.rankingTime}>
                    {myLiveRank.status || '진행중'}
                  </span>
                </div>
              )}

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
                    {player.attemptCount != null
                      ? `${player.attemptCount}번 시도`
                      : '시도 정보 없음'}
                  </span>
                </div>
              ))}
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