import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import styles from './Profile.module.css';

/**
 * Profile 컴포넌트 - 완전한 프로필 페이지
 * 
 * 주요 기능:
 * 1. 프로필 헤더 (아바타, 닉네임, 이메일, 가입일)
 * 2. 통계 대시보드 (총 게임, 정답률, 평균 시도 등)
 * 3. 활동 캘린더 (GitHub 스타일)
 * 4. 최고 기록 (최고 순위, 최소 시도, 최장 연속)
 * 5. 프로필 수정 모달
 * 6. 비밀번호 변경 모달
 */
const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [bestRecords, setBestRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, image
  
  // 수정 폼 데이터
  const [editForm, setEditForm] = useState({
    nickname: '',
    bio: ''
  });
  
  // 비밀번호 변경 폼
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfileData();
    fetchStatistics();
    fetchActivityData();
    fetchBestRecords();
  }, []);

  // 프로필 데이터 가져오기 (/api/member/profile)
  const fetchProfileData = async () => {
    try {
      const response = await api.get('/api/member/profile');
      const data = response.data.data;

      setProfileData(data);
      setEditForm({
        nickname: data.nickname || '',
        // API 스펙에는 bio가 없으므로 프론트 전용 값으로만 사용
        bio: data.bio || ''
      });
    } catch (error) {
      console.error('프로필 로드 실패:', error);
    }
  };

  // 통계 데이터 가져오기 (/api/member/statistics)
  const fetchStatistics = async () => {
    try {
      const response = await api.get('/api/member/statistics');
      const data = response.data.data;

      // UserStatisticsResponse → 화면에서 쓰기 좋은 형태로 변환
      setStatistics({
        totalGames: data.totalGames,
        successCount: data.successfulGames,
        // successRate는 백엔드에서 퍼센트 값(예: 75)이 내려온다고 가정하고 그대로 사용
        successRate: Math.round(data.successRate || 0),
        avgAttempts: data.averageAttempts,
        bestRank: data.bestRank,
        maxStreak: data.longestStreak,
        currentTokens: data.currentTokens
      });
    } catch (error) {
      console.error('통계 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 최고 기록 데이터 가져오기 (/api/member/best-records)
  const fetchBestRecords = async () => {
    try {
      const response = await api.get('/api/member/best-records');
      setBestRecords(response.data.data || null);
    } catch (error) {
      console.error('최고 기록 로드 실패:', error);
    }
  };

  // 활동 캘린더 데이터 가져오기 (/api/member/activity-calendar)
  const fetchActivityData = async () => {
    try {
      // 현재 달 기준: 1일부터 35일(5주) 범위
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // 이번 달 1일
      const end = new Date(monthStart);
      end.setDate(monthStart.getDate() + 34); // 35일 범위 (예: 12/1~1/4)

      const toDateStr = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD

      const response = await api.get('/api/member/activity-calendar', {
        params: {
          startDate: toDateStr(monthStart),
          endDate: toDateStr(end)
        }
      });

      const apiActivities = response.data.data?.activities || [];
      const activityMap = new Map(
        apiActivities.map((item) => [item.activityDate, item])
      );

      // 35일 범위에 대해 날짜/레벨 매핑 (없는 날은 레벨 0)
      const days = [];
      for (
        let d = new Date(monthStart);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const current = new Date(d); // 루프 내에서 복사
        const dateStr = toDateStr(current);
        const activity = activityMap.get(dateStr);

        days.push({
          date: dateStr,
          participationLevel: activity?.participationLevel ?? 0
        });
      }

      setActivityData(days);
    } catch (error) {
      console.error('활동 데이터 로드 실패:', error);
    }
  };

  // 프로필 수정 제출 (/api/member/profile - PATCH)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 스펙 상 UpdateProfileRequest: { "nickname": "새닉네임" }
      await api.patch('/api/member/profile', {
        nickname: editForm.nickname
      });

      alert('프로필이 수정되었습니다.');
      setShowEditModal(false);
      fetchProfileData();
    } catch (error) {
      alert(error.response?.data?.message || '프로필 수정에 실패했습니다.');
    }
  };

  // 비밀번호 변경 제출 (/api/member/password - PUT)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      alert('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    
    try {
      await api.put('/api/member/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      alert('비밀번호가 변경되었습니다.');
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      alert(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 아바타 첫 글자
  const getAvatarLetter = () => {
    return (profileData?.nickname || user?.nickname || '?').charAt(0).toUpperCase();
  };

  // 활동 레벨 (0-4)
  const getActivityLevel = (level) => {
    if (level == null) return 0;
    // 서버에서 participationLevel이 0~4로 온다고 가정하고, 범위만 한 번 더 안전하게 보정
    if (level <= 0) return 0;
    if (level >= 4) return 4;
    return level;
  };

  // 가입일 포맷
  const formatJoinDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

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
                <span>{statistics?.currentTokens ?? (user?.tokens || 0)} 토큰</span>
              </div>
              <button onClick={handleLogout} className={styles.btnSecondary}>
                로그아웃
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Profile Header */}
      <div className={styles.container}>
        <div className={styles.profileHeader}>
          <div className={styles.profileInfo}>
            {/* 아바타 */}
            <div className={styles.profileAvatar}>
              {getAvatarLetter()}
            </div>
            
            {/* 프로필 상세 */}
            <div className={styles.profileDetails}>
              <h1>{profileData?.nickname || user?.nickname}</h1>
              <p>{profileData?.bio || '단어 마스터를 향한 여정'}</p>
              
              <div className={styles.profileMeta}>
                <span>📧 {user?.email}</span>
                <span>📅 가입일: {formatJoinDate(profileData?.createdAt)}</span>
                <span>🪙 보유 토큰: {profileData?.currentTokens ?? user?.tokens ?? 0}</span>
              </div>
              
              {/* 액션 버튼 */}
              <div className={styles.profileActions}>
                <button 
                  className={styles.btnAction}
                  onClick={() => setShowEditModal(true)}
                >
                  ✏️ 프로필 수정
                </button>
                <button 
                  className={styles.btnAction}
                  onClick={() => setShowPasswordModal(true)}
                >
                  🔒 비밀번호 변경
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className={styles.profileContent}>
          {/* 활동 캘린더 */}
          <div className={styles.card}>
            <h3>활동 캘린더</h3>
            <p className={styles.cardSubtitle}>
              최근 활동을 한눈에 확인하세요
            </p>
            <div className={styles.calendarGrid}>
              {activityData.length > 0 ? (
                activityData.map((day, index) => (
                  <div
                    key={index}
                    className={`${styles.calendarDay} ${
                      styles[`active${getActivityLevel(day.participationLevel)}`]
                    }`}
                    title={`${day.date}: 참여 레벨 ${day.participationLevel}`}
                  >
                    {new Date(day.date).getDate()}
                  </div>
                ))
              ) : (
                // 더미 데이터 (현재 달 1일부터 35일 표시)
                (() => {
                  const now = new Date();
                  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  return [...Array(35)].map((_, index) => {
                    const d = new Date(monthStart);
                    d.setDate(monthStart.getDate() + index);
                    return (
                      <div
                        key={index}
                        className={`${styles.calendarDay} ${styles.active0}`}
                      >
                        {d.getDate()}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* 통계 요약 */}
          <div className={styles.card}>
            <h3>통계 요약</h3>
            <p className={styles.cardSubtitle}>
              최근 게임 데이터를 한눈에 확인하세요
            </p>
            <div className={styles.statsSummary}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>
                  {statistics?.totalGames || 0}
                </div>
                <div className={styles.summaryLabel}>총 게임 수</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>
                  {statistics?.successCount || 0}
                </div>
                <div className={styles.summaryLabel}>정답 수</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>
                  {statistics?.successRate || 0}%
                </div>
                <div className={styles.summaryLabel}>정답률</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>
                  {statistics?.avgAttempts || 0}
                </div>
                <div className={styles.summaryLabel}>평균 시도</div>
              </div>
            </div>
          </div>

          {/* 최고 기록 */}
          <div className={styles.card}>
            <h3>최고 기록</h3>
            <div className={styles.recordsGrid}>
              <div className={styles.recordItem}>
                <div className={styles.recordIcon}>🥇</div>
                <div className={styles.recordLabel}>최고 순위</div>
                <div className={styles.recordValue}>
                  #{bestRecords?.bestRank?.rank ?? '-'}
                </div>
              </div>
              <div className={styles.recordItem}>
                <div className={styles.recordIcon}>⚡</div>
                <div className={styles.recordLabel}>최소 시도</div>
                <div className={styles.recordValue}>
                  {bestRecords?.fastestSolve?.attemptCount ?? '-'}번
                </div>
              </div>
              <div className={styles.recordItem}>
                <div className={styles.recordIcon}>🔥</div>
                <div className={styles.recordLabel}>최장 연속</div>
                <div className={styles.recordValue}>
                  {bestRecords?.longestStreak?.streakDays ?? '-'}일
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 프로필 수정 모달 */}
      {showEditModal && (
        <div className={styles.modal} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>프로필 수정</h2>
              <button 
                className={styles.modalClose}
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalTabs}>
              <button
                className={`${styles.modalTab} ${activeTab === 'profile' ? styles.active : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                기본 정보
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>닉네임</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>소개</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  placeholder="자기소개를 입력하세요"
                />
              </div>

              <button type="submit" className={styles.btnSubmit}>
                저장
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className={styles.modal} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>비밀번호 변경</h2>
              <button 
                className={styles.modalClose}
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>현재 비밀번호</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>새 비밀번호</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  placeholder="8자 이상 입력"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>새 비밀번호 확인</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  required
                />
              </div>

              <button type="submit" className={styles.btnSubmit}>
                변경
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;