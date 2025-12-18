import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Result.module.css';

/**
 * ResultFail 컴포넌트 - 게임 실패 결과 페이지
 * 
 * 주요 기능:
 * 1. 실패 메시지 표시
 * 2. 정답 공개
 * 3. 게임 통계 (시도 횟수, 최고 유사도)
 * 4. 시도별 유사도 그래프
 * 5. 액션 버튼 (순위 보기, 내일 다시)
 */
const ResultFail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // location.state에서 전달받은 데이터
  const resultData = location.state || {};
  
  const [copySuccess, setCopySuccess] = useState(false);

  // 결과 복사
  const handleCopyResult = async () => {
    const resultText = `WordTreasure 🎮
오늘의 단어: ${resultData.answer || '단어'}
시도: ${resultData.attempts || 0}/${resultData.maxAttempts || 10}번 | 최고 유사도: ${resultData.maxSimilarity || 0}%

내일 다시 도전해보세요!`;

    try {
      await navigator.clipboard.writeText(resultText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      alert('복사에 실패했습니다.');
    }
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
          </div>
        </nav>
      </header>

      {/* Result Content */}
      <div className={styles.container}>
        <div className={styles.resultContainer}>
          <div className={styles.resultCard}>
            {/* 실패 아이콘 */}
            <div className={`${styles.resultIcon} ${styles.fail}`}>😢</div>
            
            {/* 타이틀 */}
            <h1 className={`${styles.resultTitle} ${styles.fail}`}>
              아쉽네요!
            </h1>
            <p className={styles.resultSubtitle}>
              최대 시도 횟수를 모두 사용하셨습니다.
            </p>

            {/* 정답 공개 */}
            <div className={styles.answerReveal}>
              <p className={styles.answerLabel}>정답은</p>
              <div className={styles.answerWord}>
                {resultData.answer || '정답을 확인할 수 없습니다'}
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
                  {resultData.attempts || 0}/{resultData.maxAttempts || 10}번
                </div>
                <div className={styles.resultStatLabel}>시도 횟수</div>
              </div>
              <div className={styles.resultStat}>
                <div className={styles.resultStatValue}>
                  {resultData.maxSimilarity || 0}%
                </div>
                <div className={styles.resultStatLabel}>최고 유사도</div>
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
                        backgroundColor: 'var(--primary-color)'
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

            {/* 격려 메시지 */}
            <div className={styles.rewardSection}>
              <p className={styles.rewardLabel}>💪 다음 기회를 노려보세요!</p>
              <p className={styles.rewardDetail}>
                내일 다시 도전하면 더 좋은 결과를 얻을 수 있을 거예요!
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

export default ResultFail;
