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
  
  // Modal states
  const [showEggModal, setShowEggModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiModalType, setAiModalType] = useState<'daily' | 'forecast' | 'advisor' | 'tip'>('daily');
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  
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
      const [statsRes, summaryRes, coopRes, premiumRes, hensRes, flocksRes, insightsRes, weatherRes, flockStatsRes, yesterdayRes, streakRes, agdaCardRes] = await Promise.all([
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
        fetch('/api/agda/inbox/today', { credentials: 'include' })
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
  
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">🥚</div>
        <p>Laddar din hönsgård...</p>
      </div>
    );
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
          {weather?.current && (
            <button className="weather-pill" onClick={() => setShowWeatherModal(true)}>
              <span>{weather.current.temp < 5 ? '❄️' : weather.current.temp < 15 ? '🌥️' : '☀️'}</span>
              <span>{Math.round(weather.current.temp)}°</span>
            </button>
          )}
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
      {agdaCard && (
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
            
            <div className="custom-input">
              <input
                type="number"
                placeholder="Annat antal"
                value={eggCount}
                onChange={(e) => setEggCount(e.target.value)}
                min="0"
              />
              <button
                onClick={() => eggCount && handleQuickAdd(parseInt(eggCount))}
                disabled={!eggCount || saving}
                className="btn-primary"
              >
                Lägg till
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Dela statistik</h3>
              <button className="close-btn" onClick={() => setShowShareModal(false)}>×</button>
            </div>
            <div className="share-preview">
              <div className="share-card">
                <h4>🥚 {coop?.coop_name || 'Min Hönsgård'}</h4>
                <p>{todayStats?.egg_count || 0} ägg idag</p>
                <p>{yesterdaySummary?.eggs_this_week || 0} ägg denna vecka</p>
              </div>
            </div>
            <div className="share-actions">
              <button className="share-action" onClick={() => {
                navigator.clipboard?.writeText(
                  `🥚 ${coop?.coop_name || 'Min Hönsgård'}\n${todayStats?.egg_count || 0} ägg idag\n${yesterdaySummary?.eggs_this_week || 0} ägg denna vecka`
                );
                setShowShareModal(false);
              }}>
                📋 Kopiera text
              </button>
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
    </div>
  );
}
