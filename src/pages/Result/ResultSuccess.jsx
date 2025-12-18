import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Result.module.css';

/**
 * ResultSuccess 컴포넌트 - 게임 성공 결과 페이지
 * 
 * 주요 기능:
 * 1. 축하 애니메이션 (confetti)
 * 2. 정답 공개
 * 3. 게임 통계 (시도 횟수, 순위, 최고 유사도)
 * 4. 시도별 유사도 그래프
 * 5. 획득 토큰 표시
 * 6. 결과 공유 (클립보드 복사)
 * 7. 액션 버튼 (순위 보기, 내일 다시)
 */
const ResultSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // location.state에서 전달받은 데이터
  const resultData = location.state || {};
  
  const [showConfetti, setShowConfetti] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Confetti 3초 후 자동 숨김
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // 결과 복사
  const handleCopyResult = async () => {
    const resultText = `WordTreasure 🎮
오늘의 단어: ${resultData.answer || '단어'}
시도: ${resultData.attempts || 0}번 | 순위: #${resultData.rank || '-'}

당신도 도전해보세요!`;

    try {
      await navigator.clipboard.writeText(resultText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      alert('복사에 실패했습니다.');
    }
  };

  // 토큰 보상 계산 (순위 기반)
  const getTokenReward = () => {
    const rank = resultData.rank || 999;
    if (rank <= 3) return 50;
    if (rank <= 10) return 40;
    if (rank <= 30) return 30;
    return 20;
  };

  return (
    <div className={styles.wrapper}>
      {/* Confetti 효과 */}
      {showConfetti && (
        <div className={styles.confetti}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className={styles.confettiPiece}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#ff6b4a', '#ff8a47', '#4AD98F', '#3EC7C2', '#FFD700'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <nav className={styles.nav}>
          <div className={styles.container}>
            <Link to="/main" className={styles.logo}>
              WordTreasure
            </Link>
          </div>
        </nav>
      </header>

      {/* Result Content */}
      <div className={styles.container}>
        <div className={styles.resultContainer}>
          <div className={styles.resultCard}>
            {/* 성공 아이콘 */}
            <div className={`${styles.resultIcon} ${styles.success}`}>🎉</div>
            
            {/* 타이틀 */}
            <h1 className={`${styles.resultTitle} ${styles.success}`}>
              축하합니다!
            </h1>
            <p className={styles.resultSubtitle}>
              오늘의 단어를 맞췄습니다!
            </p>

            {/* 정답 공개 */}
            <div className={styles.answerReveal}>
              <p className={styles.answerLabel}>정답은</p>
              <div className={styles.answerWord}>
                {resultData.answer || '라이어 게임'}
              </div>
              {resultData.description && (
                <p className={styles.answerDescription}>
                  {resultData.description}
                </p>
              )}
            </div>

            {/* 통계 */}
            <div className={styles.resultStats}>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue}>
                  {resultData.attempts || 7}번
                </div>
                <div className={styles.resultStatLabel}>시도 횟수</div>
              </div>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue}>
                  #{resultData.rank || 24}
                </div>
                <div className={styles.resultStatLabel}>현재 순위</div>
              </div>
            </div>

            {/* 시도별 유사도 그래프 */}
            {resultData.attemptHistory && resultData.attemptHistory.length > 0 && (
              <div className={styles.attemptVisualization}>
                <h3>시도별 유사도 변화</h3>
                <div className={styles.attemptGraph}>
                  {resultData.attemptHistory.map((attempt, index) => (
                    <div
                      key={index}
                      className={styles.attemptBar}
                      style={{
                        height: `${attempt.similarity}%`,
                        backgroundColor: index === resultData.attemptHistory.length - 1
                          ? 'var(--success-color)'
                          : 'var(--primary-color)'
                      }}
                    >
                      <span className={styles.attemptBarLabel}>
                        {index + 1}차
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 보상 섹션 */}
            <div className={styles.rewardSection}>
              <p className={styles.rewardLabel}>🎁 획득한 보상</p>
              <div className={styles.rewardAmount}>
                +{resultData.tokensEarned || getTokenReward()} 토큰
              </div>
              <p className={styles.rewardDetail}>
                {resultData.rank <= 3 && '🏆 TOP 3 보너스!'}
                {resultData.rank > 3 && resultData.rank <= 10 && '🥈 TOP 10 보너스!'}
                {resultData.rank > 10 && '정답 보너스'}
              </p>
            </div>

            {/* 액션 버튼 */}
            <div className={styles.actionButtons}>
              <button
                onClick={() => navigate('/leaderboard')}
                className={styles.btnSecondary}
              >
                전체 순위 보기
              </button>
              <button
                onClick={() => navigate('/main')}
                className={styles.btnPrimary}
              >
                내일 다시 도전하기
              </button>
            </div>

            {/* 공유 섹션 */}
            <div className={styles.shareSection}>
              <p className={styles.shareLabel}>
                결과를 친구들과 공유하세요!
              </p>
              <button
                onClick={handleCopyResult}
                className={`${styles.copyBtn} ${copySuccess ? styles.copied : ''}`}
              >
                <span>{copySuccess ? '✓' : '📋'}</span>
                <span>{copySuccess ? '복사 완료!' : '결과 복사하기'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSuccess;