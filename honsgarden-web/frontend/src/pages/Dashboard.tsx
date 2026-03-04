import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import './Dashboard.css';
import DataLimitsBanner from '../components/DataLimitsBanner';
import ProductivityAlerts from '../components/ProductivityAlerts';

interface TodayStats {
  date: string;
  egg_count: number;
  hen_count: number;
  total_costs: number;
  total_sales: number;
  net: number;
}

interface SummaryStats {
  hen_count: number;
  total_eggs_all_time: number;
  total_costs_all_time: number;
  total_sales_all_time: number;
  net_all_time: number;
  this_month: {
    eggs: number;
    costs: number;
    sales: number;
    net: number;
  };
}

interface CoopSettings {
  coop_name: string;
  hen_count: number;
}

interface PremiumStatus {
  is_premium: boolean;
  plan?: string;
}

interface Hen {
  id: string;
  name: string;
  breed?: string;
}

interface Flock {
  id: string;
  name: string;
}

interface Insights {
  premium?: {
    production_status: string;
    production_text: string;
  };
}

interface WeatherData {
  current?: {
    temp: number;
    feels_like: number;
    humidity: number;
    description: string;
    icon: string;
    location: string;
  };
  tips: Array<{
    type: string;
    priority: string;
    message: string;
  }>;
}

interface FlockStats {
  total: number;
  hens: number;
  roosters: number;
  ratio: number | null;
  recommendations: Array<{
    type: string;
    message: string;
  }>;
}

interface YesterdaySummary {
  eggs_yesterday: number;
  hen_count: number;
  laying_percentage: number;
  eggs_this_week: number;
  estimated_monthly_value: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [coop, setCoop] = useState<CoopSettings | null>(null);
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [hens, setHens] = useState<Hen[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [flockStats, setFlockStats] = useState<FlockStats | null>(null);
  const [yesterdaySummary, setYesterdaySummary] = useState<YesterdaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [eggCount, setEggCount] = useState('');
  const [selectedHen, setSelectedHen] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // SPRINT 1: Streak state
  const [streak, setStreak] = useState<{current_streak: number, longest_streak: number, days_until_reward: number, next_reward_at: number} | null>(null);
  
  // SPRINT 1: Agdas Inbox state
  const [agdaCard, setAgdaCard] = useState<{title: string, body: string} | null>(null);
  
  // SPRINT 2: Farm Today state
  const [farmToday, setFarmToday] = useState<{forecast: string, warning: string | null, tip: string, temperature: string} | null>(null);
  
  // SPRINT 2: Health Score state
  const [healthScore, setHealthScore] = useState<{score: number, trend: string, reasons: any[]} | null>(null);
  
  // SPRINT 2: PWA Install Banner state
  const [showPWABanner, setShowPWABanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // SPRINT 3A: Ranking state
  const [ranking, setRanking] = useState<{
    eggs_per_day: number,
    badge: string,
    badge_text: string,
    next_bucket: string | null,
    delta_to_target: number,
    message: string
  } | null>(null);
  
  // SPRINT 3A: Weekly Challenges state
  const [challenges, setChallenges] = useState<{
    challenges: Array<{
      key: string,
      title: string,
      description: string,
      icon: string,
      progress: number,
      target: number,
      completed: boolean,
      percent: number
    }>,
    completed_count: number,
    total_count: number,
    all_completed: boolean
  } | null>(null);
  
  // STEG 4: AI Flockanalys state
  const [flockAnalysis, setFlockAnalysis] = useState<{
    summary: string,
    possible_causes: string[],
    recommendations: string[]
  } | null>(null);
  
  // STEG 4: Alerts state
  const [alerts, setAlerts] = useState<Array<{
    id: string,
    type: string,
    icon: string,
    message: string,
    severity: string
  }>>([]);
  
  // STEG 4: National stats state
  const [nationalStats, setNationalStats] = useState<{
    avg_eggs_per_day: number,
    weekly_change: number,
    total_users: number,
    user_avg_eggs_per_day: number,
    user_vs_average: number,
    comparison_text: string
  } | null>(null);
  
  // VIRAL: Flockjämförelse state
  const [flockComparison, setFlockComparison] = useState<{
    app_avg_eggs_per_day: number,
    user_avg_eggs_per_day: number,
    percent_difference: number,
    comparison_text: string,
    status: string,
    total_active_users: number
  } | null>(null);
  
  // VIRAL: Percentile state
  const [percentile, setPercentile] = useState<{
    percentile: number | null,
    badge: string,
    message: string,
    user_eggs_this_week: number,
    tips: string[],
    total_users: number
  } | null>(null);
  
  // VIRAL: Leaderboard state
  const [leaderboard, setLeaderboard] = useState<{
    leaderboard: Array<{name: string, eggs_per_day: number, total_eggs: number}>,
    total_users: number
  } | null>(null);
  
  // VIRAL: Share image state
  const [shareImageData, setShareImageData] = useState<string | null>(null);
  const [generatingShare, setGeneratingShare] = useState(false);
  const [sharePeriod, setSharePeriod] = useState<7 | 14 | 30>(7);
  
  // Modal states
  const [showEggModal, setShowEggModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiModalType, setAiModalType] = useState<'daily' | 'forecast' | 'advisor' | 'tip'>('daily');
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  
  // Friends state
  const [friends, setFriends] = useState<{
    friends: Array<{user_id: string, name: string, eggs_per_day: number, trend: number, trend_text: string}>,
    pending_received: number,
    pending_sent: number
  } | null>(null);
  
  // Feature Preferences state (for showing/hiding dashboard modules)
  const [featurePrefs, setFeaturePrefs] = useState<{
    show_dashboard_weather?: boolean;
    show_dashboard_ai_analysis?: boolean;
    show_dashboard_weekly_goal?: boolean;
    show_dashboard_ranking?: boolean;
    show_dashboard_leaderboard?: boolean;
    show_dashboard_friends?: boolean;
    show_dashboard_national_stats?: boolean;
    show_dashboard_agda_inbox?: boolean;
  }>({});
  
  // Fråga Agda state
  const [advisorQuestion, setAdvisorQuestion] = useState('');
  const [advisorHistory, setAdvisorHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  // Get user's geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setUserLocation(coords);
          fetchWeatherWithLocation(coords.lat, coords.lon);
        },
        (error) => {
          console.log('Geolocation not available:', error.message);
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
    
    // SPRINT 2: Check PWA install status
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);
    
    // Show PWA banner if not installed and not dismissed
    const pwaDismissed = localStorage.getItem('pwa_banner_dismissed');
    if (!isInStandaloneMode && !pwaDismissed) {
      setTimeout(() => setShowPWABanner(true), 3000);
    }
  }, []);
  
  const fetchWeatherWithLocation = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    }
  };

  useEffect(() => {
    loadData();
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, summaryRes, coopRes, premiumRes, hensRes, flocksRes, insightsRes, weatherRes, flockStatsRes, yesterdayRes, streakRes, agdaCardRes, farmTodayRes, healthRes, rankingRes, challengesRes, flockAnalysisRes, alertsRes, nationalStatsRes, flockCompRes, percentileRes, leaderboardRes, friendsRes, featurePrefsRes] = await Promise.all([
        fetch('/api/statistics/today', { credentials: 'include' }),
        fetch('/api/statistics/summary', { credentials: 'include' }),
        fetch('/api/coop', { credentials: 'include' }),
        fetch('/api/premium/status', { credentials: 'include' }),
        fetch('/api/hens?active_only=true', { credentials: 'include' }),
        fetch('/api/flocks', { credentials: 'include' }),
        fetch('/api/insights', { credentials: 'include' }),
        fetch('/api/weather', { credentials: 'include' }),
        fetch('/api/flock/statistics', { credentials: 'include' }),
        fetch('/api/stats/yesterday-summary', { credentials: 'include' }),
        fetch('/api/me/streak', { credentials: 'include' }),
        fetch('/api/agda/inbox/today', { credentials: 'include' }),
        fetch('/api/farm/today', { credentials: 'include' }),
        fetch('/api/flock/health', { credentials: 'include' }),
        fetch('/api/ranking/summary', { credentials: 'include' }),
        fetch('/api/challenges/week', { credentials: 'include' }),
        fetch('/api/ai/flock-analysis', { credentials: 'include' }),
        fetch('/api/alerts', { credentials: 'include' }),
        fetch('/api/stats/national', { credentials: 'include' }),
        // VIRAL: New endpoints
        fetch('/api/stats/flock-comparison', { credentials: 'include' }),
        fetch('/api/stats/percentile', { credentials: 'include' }),
        fetch('/api/stats/leaderboard', { credentials: 'include' }),
        // Friends endpoint
        fetch('/api/friends', { credentials: 'include' }),
        // Feature preferences
        fetch('/api/feature-preferences', { credentials: 'include' })
      ]);

      if (statsRes.ok) setTodayStats(await statsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (coopRes.ok) setCoop(await coopRes.json());
      if (premiumRes.ok) setPremium(await premiumRes.json());
      if (hensRes.ok) setHens(await hensRes.json());
      if (flocksRes.ok) setFlocks(await flocksRes.json());
      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (weatherRes.ok) setWeather(await weatherRes.json());
      if (flockStatsRes.ok) setFlockStats(await flockStatsRes.json());
      if (yesterdayRes.ok) setYesterdaySummary(await yesterdayRes.json());
      
      // SPRINT 1: Load streak data
      if (streakRes.ok) {
        const streakData = await streakRes.json();
        setStreak(streakData);
      }
      
      // SPRINT 1: Load Agda's Inbox card
      if (agdaCardRes.ok) {
        const cardData = await agdaCardRes.json();
        if (cardData.card) {
          setAgdaCard(cardData.card);
        }
      }
      
      // SPRINT 2: Load Farm Today data
      if (farmTodayRes.ok) {
        const farmData = await farmTodayRes.json();
        setFarmToday(farmData);
      }
      
      // SPRINT 2: Load Health Score
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealthScore(healthData);
      }
      
      // SPRINT 3A: Load Ranking data
      if (rankingRes.ok) {
        const rankingData = await rankingRes.json();
        setRanking(rankingData);
      }
      
      // SPRINT 3A: Load Weekly Challenges
      if (challengesRes.ok) {
        const challengesData = await challengesRes.json();
        setChallenges(challengesData);
      }
      
      // STEG 4: Load AI Flock Analysis
      if (flockAnalysisRes.ok) {
        const analysisData = await flockAnalysisRes.json();
        setFlockAnalysis(analysisData);
      }
      
      // STEG 4: Load Alerts
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
      
      // STEG 4: Load National Stats
      if (nationalStatsRes.ok) {
        const nationalData = await nationalStatsRes.json();
        setNationalStats(nationalData);
      }
      
      // VIRAL: Load Flock Comparison
      if (flockCompRes.ok) {
        const compData = await flockCompRes.json();
        setFlockComparison(compData);
      }
      
      // VIRAL: Load Percentile
      if (percentileRes.ok) {
        const percData = await percentileRes.json();
        setPercentile(percData);
      }
      
      // VIRAL: Load Leaderboard
      if (leaderboardRes.ok) {
        const lbData = await leaderboardRes.json();
        setLeaderboard(lbData);
      }
      
      // Load Friends
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData);
      }
      
      // Load Feature Preferences
      if (featurePrefsRes.ok) {
        const prefsData = await featurePrefsRes.json();
        setFeaturePrefs(prefsData.preferences || {});
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuickAdd = async (count: number) => {
    setSaving(true);
    try {
      const body: any = { count, date: format(new Date(), 'yyyy-MM-dd') };
      if (selectedHen) body.hen_id = selectedHen;
      
      const res = await fetch('/api/eggs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        await loadData();
        setEggCount('');
        setSelectedHen('');
        setShowEggModal(false);
      }
    } catch (error) {
      console.error('Failed to add eggs:', error);
    } finally {
      setSaving(false);
    }
  };

  const loadAiData = async (type: 'daily' | 'forecast' | 'advisor' | 'tip') => {
    if (!premium?.is_premium) {
      navigate('/premium');
      return;
    }
    setAiModalType(type);
    setShowAiModal(true);
    
    if (type === 'advisor') {
      setAdvisorHistory([]);
      return;
    }
    
    setAiLoading(true);
    setAiData(null);
    
    try {
      let endpoint = '';
      if (type === 'daily') endpoint = '/api/ai/daily-report';
      else if (type === 'forecast') endpoint = '/api/ai/egg-forecast';
      else if (type === 'tip') endpoint = '/api/ai/daily-tip';
      
      const res = await fetch(endpoint, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAiData(data);
      }
    } catch (error) {
      console.error('Failed to load AI data:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const sendAdvisorMessage = async () => {
    if (!advisorQuestion.trim()) return;
    
    const userMessage = advisorQuestion;
    setAdvisorQuestion('');
    setAdvisorHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiLoading(true);
    
    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: userMessage, history: advisorHistory })
      });
      
      if (res.ok) {
        const data = await res.json();
        const content = data.response || data.answer || "Kunde inte få svar.";
        setAdvisorHistory(prev => [...prev, { role: 'assistant', content }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // Helper functions
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'God morgon';
    if (hour < 12) return 'God förmiddag';
    if (hour < 18) return 'God eftermiddag';
    return 'God kväll';
  };

  const getSwedishDate = () => {
    const today = new Date();
    const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
    const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                    'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
    return `${days[today.getDay()].charAt(0).toUpperCase() + days[today.getDay()].slice(1)} ${today.getDate()} ${months[today.getMonth()]}`;
  };

  // UI guard for unreasonable laying percentage
  const getLayingPercentage = (): string => {
    const henCount = yesterdaySummary?.hen_count ?? 0;
    const eggsYesterday = yesterdaySummary?.eggs_yesterday ?? 0;
    if (henCount <= 0) return '—';
    if (eggsYesterday > henCount) return '—';
    const pct = Math.round((eggsYesterday / henCount) * 100);
    return `${pct}%`;
  };

  // Preview AI insight for non-premium
  const getPreviewInsight = () => {
    const eggsYesterday = yesterdaySummary?.eggs_yesterday ?? 0;
    const henCount = yesterdaySummary?.hen_count ?? 0;
    if (henCount === 0) return "Lägg till dina hönor för personlig analys.";
    if (eggsYesterday === 0) return "Registrera ägg för att få AI-analys.";
    const pct = Math.round((eggsYesterday / henCount) * 100);
    if (pct >= 80) return "Äggproduktionen ser stabil ut idag.";
    if (pct >= 50) return "Produktionen är normal för årstiden.";
    return "Vi ser potential för optimering.";
  };
  
  // Haptic feedback helper (mobile)
  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    if ('vibrate' in navigator) {
      switch (type) {
        case 'light': navigator.vibrate(10); break;
        case 'medium': navigator.vibrate(20); break;
        case 'success': navigator.vibrate([10, 50, 20]); break;
      }
    }
  };
  
  // Skeleton Loading Component
  const SkeletonLoader = () => (
    <div className="dashboard-loading" data-testid="skeleton-loader">
      {/* Header skeleton */}
      <div className="skeleton skeleton-card" style={{height: '100px', marginBottom: '16px'}} />
      
      {/* Stats row skeleton */}
      <div className="skeleton-row">
        <div className="skeleton" style={{flex: 1, height: '60px', borderRadius: '12px'}} />
        <div className="skeleton" style={{flex: 1, height: '60px', borderRadius: '12px'}} />
        <div className="skeleton" style={{flex: 1, height: '60px', borderRadius: '12px'}} />
      </div>
      
      {/* Main card skeleton */}
      <div className="skeleton skeleton-card" style={{height: '180px'}} />
      
      {/* Challenges skeleton */}
      <div style={{padding: '16px'}}>
        <div className="skeleton skeleton-text short" style={{marginBottom: '12px'}} />
        <div className="skeleton" style={{height: '50px', borderRadius: '12px', marginBottom: '8px'}} />
        <div className="skeleton" style={{height: '50px', borderRadius: '12px', marginBottom: '8px'}} />
        <div className="skeleton" style={{height: '50px', borderRadius: '12px'}} />
      </div>
      
      {/* Bottom cards skeleton */}
      <div className="skeleton-row">
        <div className="skeleton" style={{flex: 1, height: '80px', borderRadius: '12px'}} />
        <div className="skeleton" style={{flex: 1, height: '80px', borderRadius: '12px'}} />
      </div>
    </div>
  );
  
  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div className={`dashboard ${isVisible ? 'visible' : ''}`} data-testid="dashboard">
      <DataLimitsBanner />
      <ProductivityAlerts flocks={flocks} />
      
      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 1: Header + Kompakt Stat-rad
      ══════════════════════════════════════════════════════════════════ */}
      <header className="dashboard-header">
        <div className="header-top">
          <div className="header-greeting">
            <span className="greeting-text">{getGreeting()}</span>
            <h1 className="header-title">{coop?.coop_name || 'Min Hönsgård'}</h1>
            <span className="header-date">{getSwedishDate()}</span>
          </div>
          <div className="header-actions">
            {/* Notification bell with alerts */}
            {alerts.length > 0 && (
              <button 
                className="notification-bell" 
                onClick={() => setShowAlertsModal(true)}
                data-testid="alerts-bell"
              >
                <span className="bell-icon">🔔</span>
                <span className="bell-badge">{alerts.length}</span>
              </button>
            )}
            {weather?.current && (featurePrefs.show_dashboard_weather !== false) && (
              <button className="weather-pill" onClick={() => setShowWeatherModal(true)}>
                <span>{weather.current.temp < 5 ? '❄️' : weather.current.temp < 15 ? '🌥️' : '☀️'}</span>
                <span>{Math.round(weather.current.temp)}°</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Kompakt horisontell stat-rad */}
        <div className="stat-strip">
          <div className="stat-item">
            <span className="stat-icon">🥚</span>
            <span className="stat-value">{yesterdaySummary?.eggs_yesterday ?? 0}</span>
            <span className="stat-label">igår</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon">🐔</span>
            <span className="stat-value">{yesterdaySummary?.hen_count ?? hens.length}</span>
            <span className="stat-label">{(yesterdaySummary?.hen_count ?? hens.length) === 1 ? 'höna' : 'hönor'}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-icon">📅</span>
            <span className="stat-value">{yesterdaySummary?.eggs_this_week ?? 0}</span>
            <span className="stat-label">veckan</span>
          </div>
          {streak && streak.current_streak > 0 && (
            <>
              <div className="stat-divider" />
              <div className="stat-item streak">
                <span className="stat-icon">🔥</span>
                <span className="stat-value">{streak.current_streak}</span>
                <span className="stat-label">dagar</span>
              </div>
            </>
          )}
          <div className="stat-divider" />
          <div className="stat-item highlight">
            <span className="stat-icon">💰</span>
            <span className="stat-value">+{yesterdaySummary?.estimated_monthly_value ?? 0}</span>
            <span className="stat-label">kr/mån</span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          SPRINT 2: PWA Install Banner
      ══════════════════════════════════════════════════════════════════ */}
      {showPWABanner && !isStandalone && (
        <section className="pwa-banner">
          <div className="pwa-content">
            <span className="pwa-icon">📱</span>
            <div className="pwa-text">
              <strong>Installera Hönsgården</strong>
              {isIOS ? (
                <span>Tryck på dela-knappen ⤴️ och välj "Lägg till på hemskärmen"</span>
              ) : (
                <span>Lägg till appen på hemskärmen för snabbare åtkomst</span>
              )}
            </div>
            <button className="pwa-close" onClick={() => {
              setShowPWABanner(false);
              localStorage.setItem('pwa_banner_dismissed', 'true');
            }}>×</button>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SPRINT 2: Din hönsgård idag (2x2 Grid Layout)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="farm-today-section">
        <div className="farm-today-header">
          <span className="farm-today-icon">🐔</span>
          <h3>Din hönsgård idag</h3>
        </div>
        <div className="farm-today-grid">
          <div className="farm-today-card prognos" data-testid="farm-prognos">
            <span className="card-icon">🥚</span>
            <span className="card-value">{farmToday?.forecast?.replace('Förväntad produktion: ~', '').replace(' ägg/dag', '') || '0'}</span>
            <span className="card-label">ägg/dag prognos</span>
          </div>
          <div className="farm-today-card temperatur" data-testid="farm-temp">
            <span className="card-icon">🌡️</span>
            <span className="card-value">{farmToday?.temperature || weather?.temperature || '—'}°</span>
            <span className="card-label">temperatur</span>
          </div>
          <div className="farm-today-card halsoscore" data-testid="farm-health">
            <span className="card-icon">💚</span>
            <span className="card-value">{healthScore?.score ?? 0}/100</span>
            <span className="card-label">hälsoscore</span>
          </div>
          <div className="farm-today-card tips" data-testid="farm-tips">
            <span className="card-icon">💡</span>
            <span className="card-value">{farmToday?.tip || 'Lägg till höns!'}</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SNABB ÄGGLOGGNING (Mobil-optimerad)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="quick-egg-section">
        <div className="quick-egg-card">
          <div className="quick-egg-header">
            <h3>🥚 Registrera ägg</h3>
            <span className="egg-count">{todayStats?.total_eggs ?? 0} idag</span>
          </div>
          <div className="quick-egg-buttons">
            <button 
              className="quick-egg-btn btn-1 btn-press"
              onClick={async () => {
                triggerHaptic('success');
                await fetch('/api/eggs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ count: 1, date: new Date().toISOString().split('T')[0] })
                });
                loadData();
              }}
              data-testid="quick-egg-1"
            >
              +1
            </button>
            <button 
              className="quick-egg-btn btn-2 btn-press"
              onClick={async () => {
                triggerHaptic('success');
                await fetch('/api/eggs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ count: 2, date: new Date().toISOString().split('T')[0] })
                });
                loadData();
              }}
              data-testid="quick-egg-2"
            >
              +2
            </button>
            <button 
              className="quick-egg-btn btn-3 btn-press"
              onClick={async () => {
                triggerHaptic('success');
                await fetch('/api/eggs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ count: 3, date: new Date().toISOString().split('T')[0] })
                });
                loadData();
              }}
              data-testid="quick-egg-3"
            >
              +3
            </button>
            <button 
              className="quick-egg-btn btn-custom btn-press"
              onClick={() => {
                triggerHaptic('light');
                setShowEggModal(true);
              }}
              data-testid="quick-egg-custom"
            >
              ...
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SPRINT 1: Streak motivation banner
      ══════════════════════════════════════════════════════════════════ */}
      {streak && streak.current_streak > 0 && streak.current_streak < 10 && (
        <section className="streak-banner">
          <div className="streak-content">
            <span className="streak-fire">🔥</span>
            <div className="streak-text">
              <strong>Du är inne på dag {streak.current_streak}!</strong>
              <span>Logga ägg {streak.days_until_reward} dagar till för 7 dagar premium!</span>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 2: Primär CTA - Registrera ägg
      ══════════════════════════════════════════════════════════════════ */}
      <section className="primary-cta-section">
        <button 
          className="primary-cta"
          onClick={() => setShowEggModal(true)}
          data-testid="main-add-egg-btn"
        >
          <span className="cta-icon">🥚</span>
          <div className="cta-content">
            <span className="cta-title">Registrera ägg</span>
            <span className="cta-subtitle">
              {(todayStats?.egg_count ?? 0) > 0 
                ? `${todayStats?.egg_count} ägg idag` 
                : 'Tryck för att lägga till'}
            </span>
          </div>
          <span className="cta-arrow">→</span>
        </button>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SPRINT 1: Agdas Inbox
      ══════════════════════════════════════════════════════════════════ */}
      {agdaCard && (featurePrefs.show_dashboard_agda_inbox !== false) && (
        <section className="agda-inbox-section">
          <div className="section-header">
            <span>📬 Agdas Inbox</span>
            <span className="today-label">Idag</span>
          </div>
          <div className="agda-card">
            <div className="agda-card-header">
              <span className="agda-icon">🐔</span>
              <span className="agda-name">Agda</span>
            </div>
            <h4 className="agda-card-title">{agdaCard.title}</h4>
            <p className="agda-card-body">{agdaCard.body}</p>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SPRINT 3A: Ranking + Tävlingsmekanik
      ══════════════════════════════════════════════════════════════════ */}
      {ranking && ranking.eggs_per_day > 0 && (featurePrefs.show_dashboard_ranking !== false) && (
        <section className="ranking-section">
          <div className="section-header">
            <span>🏆 Din ranking</span>
            <span className="week-label">Denna vecka</span>
          </div>
          <div className="ranking-card">
            <div className="ranking-header">
              {ranking.badge && <span className="ranking-badge">{ranking.badge}</span>}
              <div className="ranking-info">
                <span className="ranking-title">{ranking.badge_text || 'Börja logga!'}</span>
                <span className="ranking-eggs">{ranking.eggs_per_day} ägg/dag</span>
              </div>
            </div>
            {ranking.next_bucket && (
              <div className="ranking-progress">
                <div className="ranking-target">
                  <span>Nästa nivå: {ranking.next_bucket === 'top_25' ? 'Topp 25%' : ranking.next_bucket === 'top_10' ? 'Topp 10%' : ranking.next_bucket === 'top_5' ? 'Topp 5%' : 'Topp 50%'}</span>
                  <span className="delta">+{ranking.delta_to_target} ägg/dag</span>
                </div>
                <p className="ranking-message">{ranking.message}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SPRINT 3A: Veckomål (Quests)
      ══════════════════════════════════════════════════════════════════ */}
      {challenges && challenges.challenges.length > 0 && (
        <section className="challenges-section">
          <div className="section-header">
            <span>✅ Veckans mål</span>
            <span className="progress-label">{challenges.completed_count}/{challenges.total_count}</span>
          </div>
          <div className="challenges-list">
            {challenges.challenges.map((c) => (
              <div key={c.key} className={`challenge-item ${c.completed ? 'completed' : ''}`}>
                <span className="challenge-icon">{c.completed ? '✓' : c.icon}</span>
                <div className="challenge-info">
                  <span className="challenge-title">{c.title}</span>
                  <div className="challenge-progress-bar">
                    <div className="challenge-progress-fill" style={{width: `${c.percent}%`}}></div>
                  </div>
                </div>
                <span className="challenge-count">{c.progress}/{c.target}</span>
              </div>
            ))}
          </div>
          {challenges.all_completed && (
            <div className="challenges-complete-badge">
              <span>🎉</span>
              <span>Alla mål klara! Bra jobbat!</span>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEG 4: AI Flockanalys (Premium)
      ══════════════════════════════════════════════════════════════════ */}
      {flockAnalysis && flockAnalysis.summary && (featurePrefs.show_dashboard_ai_analysis !== false) && (
        <section className="flock-analysis-section" data-testid="flock-analysis">
          <div className="section-header">
            <span>🧠 AI Flockanalys</span>
          </div>
          <div className="flock-analysis-card">
            <p className="analysis-summary">{flockAnalysis.summary}</p>
            
            {flockAnalysis.possible_causes && flockAnalysis.possible_causes.length > 0 && (
              <div className="analysis-causes">
                <span className="causes-label">Möjliga orsaker:</span>
                <ul>
                  {flockAnalysis.possible_causes.map((cause, i) => (
                    <li key={i}>• {cause}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {flockAnalysis.recommendations && flockAnalysis.recommendations.length > 0 && (
              <div className="analysis-tips">
                <span className="tips-label">💡 Tips:</span>
                <ul>
                  {flockAnalysis.recommendations.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEG 4: Nationell Statistik
      ══════════════════════════════════════════════════════════════════ */}
      {nationalStats && nationalStats.total_users > 1 && (featurePrefs.show_dashboard_national_stats !== false) && (
        <section className="national-stats-section" data-testid="national-stats">
          <div className="section-header">
            <span>📊 Höns i Sverige</span>
          </div>
          <div className="national-stats-card">
            <div className="national-stat-row">
              <span className="stat-label">Snittproduktion:</span>
              <span className="stat-value">{nationalStats.avg_eggs_per_day} ägg/dag</span>
            </div>
            {nationalStats.weekly_change !== 0 && (
              <div className="national-stat-row">
                <span className="stat-label">Förändring denna vecka:</span>
                <span className={`stat-value ${nationalStats.weekly_change > 0 ? 'positive' : 'negative'}`}>
                  {nationalStats.weekly_change > 0 ? '+' : ''}{nationalStats.weekly_change}%
                </span>
              </div>
            )}
            <div className="national-comparison">
              <span className="your-stat">Din flock: {nationalStats.user_avg_eggs_per_day} ägg/dag</span>
              <span className={`comparison-text ${nationalStats.user_vs_average >= 0 ? 'above' : 'below'}`}>
                {nationalStats.comparison_text}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VIRAL: Flockjämförelse - Hur presterar din flock?
      ══════════════════════════════════════════════════════════════════ */}
      {flockComparison && flockComparison.total_active_users > 1 && (
        <section className="flock-comparison-section" data-testid="flock-comparison">
          <div className="section-header">
            <span>🏆 Hur presterar din flock?</span>
          </div>
          <div className="flock-comparison-card">
            <div className="comparison-stats">
              <div className="comparison-stat app-avg">
                <span className="stat-label">Snitt i Hönsgården</span>
                <span className="stat-value">{flockComparison.app_avg_eggs_per_day} ägg/dag</span>
              </div>
              <div className="comparison-stat user-avg">
                <span className="stat-label">Din flock</span>
                <span className="stat-value highlight">{flockComparison.user_avg_eggs_per_day} ägg/dag</span>
              </div>
            </div>
            <div className={`comparison-badge ${flockComparison.status}`}>
              <span className="badge-text">{flockComparison.comparison_text}</span>
            </div>
            {percentile && percentile.percentile && percentile.percentile <= 25 && (
              <div className="percentile-badge">
                <span className="badge-icon">{percentile.badge}</span>
                <span className="badge-msg">{percentile.message}</span>
              </div>
            )}
            {/* AI Tips if below average */}
            {percentile && percentile.tips && percentile.tips.length > 0 && flockComparison.status === 'below' && (
              <div className="improvement-tips">
                <span className="tips-header">💡 Tips för att öka produktionen:</span>
                <ul>
                  {percentile.tips.slice(0, 3).map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Share button */}
            <button 
              className="share-result-btn btn-press"
              onClick={async () => {
                setGeneratingShare(true);
                try {
                  const res = await fetch('/api/share/generate-image', { method: 'POST', credentials: 'include' });
                  if (res.ok) {
                    const data = await res.json();
                    setShareImageData(data.image_data);
                    setShowShareModal(true);
                  }
                } catch (e) {
                  console.error('Failed to generate share image:', e);
                }
                setGeneratingShare(false);
              }}
              disabled={generatingShare}
            >
              {generatingShare ? '⏳ Genererar...' : '📤 Dela resultat'}
            </button>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VIRAL: Veckans Toppflockar (Leaderboard)
      ══════════════════════════════════════════════════════════════════ */}
      {leaderboard && leaderboard.leaderboard && leaderboard.leaderboard.length > 0 && (featurePrefs.show_dashboard_leaderboard !== false) && (
        <section className="leaderboard-section" data-testid="leaderboard">
          <div className="section-header">
            <span>🏅 Veckans toppflockar</span>
            <span className="users-label">{leaderboard.total_users} flockar</span>
          </div>
          <div className="leaderboard-list">
            {leaderboard.leaderboard.slice(0, 5).map((entry, i) => (
              <div key={i} className={`leaderboard-item ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                <span className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <span className="lb-name">{entry.name}</span>
                <span className="lb-eggs">{entry.eggs_per_day} ägg/dag</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SOCIAL: Vänner-modul
      ══════════════════════════════════════════════════════════════════ */}
      {(featurePrefs.show_dashboard_friends !== false) && (
      <section className="friends-section" data-testid="friends-section">
        <div className="section-header">
          <span>👥 Vänner</span>
          {friends?.pending_received ? (
            <span className="pending-badge">{friends.pending_received} ny</span>
          ) : null}
        </div>
        <div className="friends-card">
          {friends?.friends && friends.friends.length > 0 ? (
            <div className="friends-list">
              {friends.friends.slice(0, 5).map((friend, i) => (
                <div key={friend.user_id} className="friend-item">
                  <span className="friend-name">{friend.name}</span>
                  <div className="friend-stats">
                    <span className="friend-eggs">{friend.eggs_per_day} ägg/dag</span>
                    <span className={`friend-trend ${friend.trend >= 0 ? 'up' : 'down'}`}>
                      {friend.trend_text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="friends-empty">
              <p>Du har inga vänner ännu</p>
              <p className="hint">Bjud in vänner för att jämföra resultat!</p>
            </div>
          )}
          <Link to="/settings" className="add-friends-btn">
            + Lägg till vänner
          </Link>
        </div>
      </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 3: Premium Teaser (aspirational, inte blockerande)
      ══════════════════════════════════════════════════════════════════ */}
      {!premium?.is_premium && (
        <section className="premium-teaser-section">
          <div className="ai-preview-card">
            <div className="ai-preview-header">
              <span className="ai-robot">🤖</span>
              <span className="ai-label">AI-insikt</span>
            </div>
            <p className="ai-preview-text">"{getPreviewInsight()}"</p>
            <button 
              className="unlock-btn"
              onClick={() => navigate('/premium')}
            >
              <span>⭐</span> Lås upp djupare analys
            </button>
          </div>
          
          <div className="premium-features-preview">
            <button className="feature-preview" onClick={() => navigate('/premium')}>
              <span>📈</span>
              <span>Se 7-dagars prognos</span>
            </button>
            <button className="feature-preview" onClick={() => navigate('/premium')}>
              <span>🐔</span>
              <span>Få smart flockråd</span>
            </button>
          </div>
        </section>
      )}

      {/* Premium users: Full AI access */}
      {premium?.is_premium && (
        <section className="ai-section-premium">
          <div className="ai-grid">
            <button className="ai-card-premium" onClick={() => loadAiData('advisor')}>
              <span className="ai-icon">🐔</span>
              <div className="ai-info">
                <span className="ai-title">Fråga Agda</span>
                <span className="ai-desc">Din AI-rådgivare</span>
              </div>
            </button>
            <button className="ai-card-premium" onClick={() => loadAiData('tip')}>
              <span className="ai-icon">💡</span>
              <div className="ai-info">
                <span className="ai-title">Dagens tips</span>
                <span className="ai-desc">Dagligt hönstips</span>
              </div>
            </button>
            <button className="ai-card-premium" onClick={() => loadAiData('daily')}>
              <span className="ai-icon">📋</span>
              <div className="ai-info">
                <span className="ai-title">Dagsrapport</span>
                <span className="ai-desc">Personlig AI-analys</span>
              </div>
            </button>
            <button className="ai-card-premium" onClick={() => loadAiData('forecast')}>
              <span className="ai-icon">📈</span>
              <div className="ai-info">
                <span className="ai-title">7-dagars prognos</span>
                <span className="ai-desc">Förutsäg produktion</span>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 4: Min Flock
      ══════════════════════════════════════════════════════════════════ */}
      <section className="flock-section">
        <h2 className="section-title">Min flock</h2>
        <div className="flock-grid">
          <Link to="/hens" className="flock-card">
            <span className="card-icon">🐔</span>
            <div className="card-info">
              <span className="card-title">Mina hönor</span>
              <span className="card-meta">{hens.length} st</span>
            </div>
          </Link>
          <Link to="/hens?add=true" className="flock-card">
            <span className="card-icon">➕</span>
            <div className="card-info">
              <span className="card-title">Lägg till höna</span>
            </div>
          </Link>
        </div>
        
        {/* Flockråd inline */}
        {flockStats?.recommendations && flockStats.recommendations.length > 0 && (
          <div className="flock-tips">
            {flockStats.recommendations.slice(0, 2).map((rec, idx) => (
              <div key={idx} className={`flock-tip ${rec.type}`}>
                <span>{rec.type === 'success' ? '✅' : rec.type === 'warning' ? '⚠️' : '💡'}</span>
                <span>{rec.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 5: Analys & Ekonomi (sekundär nivå)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="secondary-section">
        <h2 className="section-title">Analys & Ekonomi</h2>
        <div className="secondary-grid">
          <Link to="/statistics" className="secondary-card">
            <span className="card-icon">📊</span>
            <span className="card-title">Statistik</span>
          </Link>
          <Link to="/finance" className="secondary-card">
            <span className="card-icon">💰</span>
            <span className="card-title">Ekonomi</span>
          </Link>
          <Link to="/eggs" className="secondary-card">
            <span className="card-icon">🥚</span>
            <span className="card-title">Ägglogg</span>
          </Link>
          <button 
            className="secondary-card" 
            onClick={() => setShowShareModal(true)}
          >
            <span className="card-icon">📤</span>
            <span className="card-title">Dela</span>
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SEKTION 6: Community Q&A - Stor knapp
      ══════════════════════════════════════════════════════════════════ */}
      <section className="community-section">
        <Link to="/community" className="community-big-btn" data-testid="community-btn">
          <div className="community-btn-icon">💬</div>
          <div className="community-btn-content">
            <h3>Frågor & Svar</h3>
            <p>Få svar från Agda (AI) och andra hönsägare</p>
          </div>
          <span className="community-btn-arrow">→</span>
        </Link>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}
      
      {/* Egg Registration Modal */}
      {showEggModal && (
        <div className="modal-overlay" onClick={() => setShowEggModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🥚 Registrera ägg</h3>
              <button className="close-btn" onClick={() => setShowEggModal(false)}>×</button>
            </div>
            
            {hens.length > 0 && (
              <div className="form-group">
                <label>Välj höna (valfritt)</label>
                <select value={selectedHen} onChange={e => setSelectedHen(e.target.value)}>
                  <option value="">Alla hönor</option>
                  {hens.map(hen => (
                    <option key={hen.id} value={hen.id}>{hen.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="quick-buttons">
              {[1, 2, 3, 5, 10].map(num => (
                <button
                  key={num}
                  onClick={() => handleQuickAdd(num)}
                  disabled={saving}
                  className="quick-btn"
                >
                  +{num}
                </button>
              ))}
            </div>
            
            <div className="custom-input egg-input-improved">
              <button 
                className="egg-stepper minus"
                onClick={() => setEggCount(prev => Math.max(0, (parseInt(prev) || 0) - 1).toString())}
                disabled={saving}
              >
                −
              </button>
              <input
                type="number"
                placeholder="0"
                value={eggCount}
                onChange={(e) => setEggCount(e.target.value)}
                min="0"
                className="egg-count-input"
                inputMode="numeric"
              />
              <button 
                className="egg-stepper plus"
                onClick={() => setEggCount(prev => ((parseInt(prev) || 0) + 1).toString())}
                disabled={saving}
              >
                +
              </button>
            </div>
            
            <button
              onClick={() => eggCount && handleQuickAdd(parseInt(eggCount))}
              disabled={!eggCount || parseInt(eggCount) === 0 || saving}
              className="btn-primary btn-add-eggs"
            >
              {saving ? '⏳ Sparar...' : `Lägg till ${eggCount || 0} ägg`}
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => { setShowShareModal(false); setShareImageData(null); }}>
          <div className="modal share-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Dela din statistik</h3>
              <button className="close-btn" onClick={() => { setShowShareModal(false); setShareImageData(null); }}>×</button>
            </div>
            
            {/* Period selector */}
            <div className="share-period-selector">
              <span className="period-label">Välj period:</span>
              <div className="period-buttons">
                {[7, 14, 30].map(days => (
                  <button
                    key={days}
                    className={`period-btn ${sharePeriod === days ? 'active' : ''}`}
                    onClick={() => setSharePeriod(days as 7 | 14 | 30)}
                  >
                    {days} dagar
                  </button>
                ))}
              </div>
            </div>
            
            <div className="share-preview">
              {shareImageData ? (
                <div className="share-image-preview">
                  <img src={shareImageData} alt="Delbar statistik" className="share-img" />
                </div>
              ) : (
                <div className="share-card">
                  <h4>🥚 {coop?.coop_name || 'Min Hönsgård'}</h4>
                  <p className="share-text-preview">
                    {flockComparison 
                      ? `Min flock producerar just nu ${flockComparison.user_avg_eggs_per_day} ägg per dag, vilket är ${flockComparison.status === 'above' ? 'över' : flockComparison.status === 'below' ? 'under' : 'på'} snittet i Hönsgården de senaste ${sharePeriod} dagarna.`
                      : `${todayStats?.egg_count || 0} ägg idag • ${yesterdaySummary?.eggs_this_week || 0} ägg denna vecka`
                    }
                  </p>
                </div>
              )}
            </div>
            
            <div className="share-actions">
              {shareImageData && (
                <button className="share-action primary" onClick={() => {
                  const link = document.createElement('a');
                  link.href = shareImageData;
                  link.download = 'honsgarden-resultat.png';
                  link.click();
                }}>
                  💾 Ladda ner bild
                </button>
              )}
              <button className="share-action" onClick={() => {
                const periodText = sharePeriod === 7 ? 'denna vecka' : sharePeriod === 14 ? 'de senaste 14 dagarna' : 'denna månad';
                const text = flockComparison 
                  ? `🐔 Min flock i Hönsgården\n\nMin flock producerar just nu ${flockComparison.user_avg_eggs_per_day} ägg per dag, vilket är ${Math.abs(flockComparison.percent_difference)}% ${flockComparison.status === 'above' ? 'över' : flockComparison.status === 'below' ? 'under' : 'på'} snittet i Hönsgården ${periodText}.\n\n${flockComparison.status === 'above' ? '🔥 ' : ''}${flockComparison.comparison_text}\n\nSe hur din flock presterar på app.honsgarden.se`
                  : `🥚 ${coop?.coop_name || 'Min Hönsgård'}\n${todayStats?.egg_count || 0} ägg idag\n${yesterdaySummary?.eggs_this_week || 0} ägg denna vecka\n\napp.honsgarden.se`;
                navigator.clipboard?.writeText(text);
                alert('Kopierad till urklipp!');
              }}>
                📋 Kopiera text
              </button>
              {navigator.share && (
                <button className="share-action" onClick={async () => {
                  const periodText = sharePeriod === 7 ? 'denna vecka' : sharePeriod === 14 ? 'de senaste 14 dagarna' : 'denna månad';
                  try {
                    if (shareImageData) {
                      const res = await fetch(shareImageData);
                      const blob = await res.blob();
                      const file = new File([blob], 'honsgarden-resultat.png', { type: 'image/png' });
                      await navigator.share({
                        files: [file],
                        title: 'Min Hönsgård',
                        text: `🐔 Min flock producerar ${flockComparison?.user_avg_eggs_per_day || 0} ägg/dag - ${flockComparison?.comparison_text || 'kolla in appen!'}`,
                      });
                    } else {
                      await navigator.share({
                        title: 'Min Hönsgård',
                        text: `🐔 Min flock i Hönsgården producerar ${flockComparison?.user_avg_eggs_per_day || 0} ägg per dag ${periodText}!\n\n${flockComparison?.comparison_text || ''}`,
                        url: 'https://app.honsgarden.se'
                      });
                    }
                  } catch (e) {
                    console.log('Share cancelled');
                  }
                }}>
                  📱 Dela via app
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weather Modal */}
      {showWeatherModal && (
        <div className="modal-overlay" onClick={() => setShowWeatherModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🌤️ Väder & tips</h3>
              <button className="close-btn" onClick={() => setShowWeatherModal(false)}>×</button>
            </div>
            {weather?.current && (
              <div className="weather-details">
                <div className="weather-main">
                  <span className="weather-temp-large">{Math.round(weather.current.temp)}°C</span>
                  <span className="weather-desc">{weather.current.description}</span>
                  <span className="weather-loc">{weather.current.location}</span>
                </div>
                {weather.tips && weather.tips.length > 0 && (
                  <div className="weather-tips">
                    <h4>Tips för idag:</h4>
                    {weather.tips.map((tip, i) => (
                      <p key={i} className={`tip tip-${tip.priority}`}>{tip.message}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {aiModalType === 'daily' && '📋 Dagsrapport'}
                {aiModalType === 'forecast' && '📈 7-dagars prognos'}
                {aiModalType === 'advisor' && '🐔 Fråga Agda'}
                {aiModalType === 'tip' && '💡 Dagens tips'}
              </h3>
              <button className="close-btn" onClick={() => setShowAiModal(false)}>×</button>
            </div>
            
            <div className="modal-content">
              {aiModalType === 'advisor' ? (
                <div className="advisor-chat">
                  <div className="chat-history">
                    {advisorHistory.length === 0 && (
                      <div className="chat-empty">
                        <span>🐔</span>
                        <p>Hej! Jag är Agda, din hönsexpert. Fråga mig vad som helst om dina hönor!</p>
                      </div>
                    )}
                    {advisorHistory.map((msg, i) => (
                      <div key={i} className={`chat-msg ${msg.role}`}>
                        <p>{msg.content}</p>
                      </div>
                    ))}
                    {aiLoading && <div className="chat-loading">Agda tänker...</div>}
                  </div>
                  <div className="chat-input">
                    <input
                      type="text"
                      placeholder="Ställ en fråga..."
                      value={advisorQuestion}
                      onChange={e => setAdvisorQuestion(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && sendAdvisorMessage()}
                    />
                    <button onClick={sendAdvisorMessage} disabled={aiLoading}>Skicka</button>
                  </div>
                </div>
              ) : aiLoading ? (
                <div className="ai-loading">
                  <span>🤖</span>
                  <p>Analyserar din data...</p>
                </div>
              ) : aiData ? (
                <div className="ai-result">
                  {aiModalType === 'tip' && (
                    <>
                      <p className="ai-tip">{aiData.tip}</p>
                    </>
                  )}
                  {aiModalType === 'daily' && (
                    <>
                      <p className="ai-report">{aiData.report}</p>
                      {aiData.highlights && (
                        <ul className="ai-highlights">
                          {aiData.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                        </ul>
                      )}
                    </>
                  )}
                  {aiModalType === 'forecast' && (
                    <>
                      {aiData.forecast?.message && (
                        <p className="ai-forecast">{aiData.forecast.message}</p>
                      )}
                      {aiData.forecast?.daily_predictions && (
                        <div className="forecast-list">
                          {aiData.forecast.daily_predictions.map((day: any, i: number) => (
                            <div key={i} className="forecast-day">
                              <span className="forecast-date">{new Date(day.date).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                              <span className="forecast-eggs">{day.predicted_eggs} ägg</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {aiData.forecast?.total_predicted && (
                        <div className="forecast-prediction">
                          <span>Totalt förväntat: </span>
                          <strong>{aiData.forecast.total_predicted} ägg denna vecka</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="ai-error">
                  <p>Kunde inte ladda data. Försök igen.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Alerts Modal */}
      {showAlertsModal && (
        <div className="modal-overlay" onClick={() => setShowAlertsModal(false)}>
          <div className="modal-content alerts-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔔 Varningar</h2>
              <button className="modal-close" onClick={() => setShowAlertsModal(false)}>✕</button>
            </div>
            <div className="alerts-list">
              {alerts.length === 0 ? (
                <p className="no-alerts">Inga varningar just nu! 🎉</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={`alert-item alert-${alert.severity}`}>
                    <span className="alert-icon">{alert.icon}</span>
                    <span className="alert-message">{alert.message}</span>
                    <button 
                      className="alert-dismiss-btn"
                      onClick={async () => {
                        await fetch(`/api/alerts/${alert.id}/dismiss`, { method: 'POST', credentials: 'include' });
                        setAlerts(alerts.filter(a => a.id !== alert.id));
                      }}
                    >
                      Stäng
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
