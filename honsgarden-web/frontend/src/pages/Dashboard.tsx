import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import './Dashboard.css';
import DataLimitsBanner from '../components/DataLimitsBanner';
import ProductivityAlerts from '../components/ProductivityAlerts';
import WebDashboardOverview from '../components/WebDashboardOverview';

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
  const [loading, setLoading] = useState(true);
  const [eggCount, setEggCount] = useState('');
  const [selectedHen, setSelectedHen] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
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
          // Fetch weather with user's location
          fetchWeatherWithLocation(coords.lat, coords.lon);
        },
        (error) => {
          console.log('Geolocation not available:', error.message);
          // Use default Stockholm coords
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
    // Trigger entrance animations
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, summaryRes, coopRes, premiumRes, hensRes, flocksRes, insightsRes, weatherRes, flockStatsRes] = await Promise.all([
        fetch('/api/statistics/today', { credentials: 'include' }),
        fetch('/api/statistics/summary', { credentials: 'include' }),
        fetch('/api/coop', { credentials: 'include' }),
        fetch('/api/premium/status', { credentials: 'include' }),
        fetch('/api/hens?active_only=true', { credentials: 'include' }),
        fetch('/api/flocks', { credentials: 'include' }),
        fetch('/api/insights', { credentials: 'include' }),
        fetch('/api/weather', { credentials: 'include' }),
        fetch('/api/flock/statistics', { credentials: 'include' })
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
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuickAdd = async (count: number) => {
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await fetch('/api/eggs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          date: today, 
          count,
          hen_id: selectedHen || undefined
        })
      });
      await loadData();
      setEggCount('');
      setSelectedHen('');
      setShowEggModal(false);
    } catch (error) {
      console.error('Failed to add eggs:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const loadAiData = async (type: 'daily' | 'forecast' | 'advisor' | 'tip') => {
    setAiLoading(true);
    setAiModalType(type);
    setShowAiModal(true);
    setAiData(null);
    
    // For advisor, don't load initial data - user will type question
    if (type === 'advisor') {
      setAiLoading(false);
      return;
    }
    
    try {
      let endpoint = '/api/ai/daily-report';
      if (type === 'forecast') endpoint = '/api/ai/egg-forecast';
      else if (type === 'tip') endpoint = '/api/ai/daily-tip';
      
      const res = await fetch(endpoint, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAiData(data);
      } else if (res.status === 403) {
        // Premium required
        navigate('/premium');
      }
    } catch (error) {
      console.error('Failed to load AI data:', error);
    } finally {
      setAiLoading(false);
    }
  };
  
  // Fråga Agda - send question to AI advisor
  const askAgda = async () => {
    if (!advisorQuestion.trim()) return;
    
    setAiLoading(true);
    const question = advisorQuestion.trim();
    setAdvisorHistory(prev => [...prev, { role: 'user', content: question }]);
    setAdvisorQuestion('');
    
    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question })
      });
      
      if (res.ok) {
        const data = await res.json();
        const answer = data.response || data.advice || data.answer || 'Kunde inte generera svar.';
        setAdvisorHistory(prev => [...prev, { role: 'assistant', content: answer }]);
      } else if (res.status === 403) {
        setAdvisorHistory(prev => [...prev, { role: 'assistant', content: 'Denna funktion kräver Premium. Uppgradera för att få personlig rådgivning!' }]);
      } else {
        setAdvisorHistory(prev => [...prev, { role: 'assistant', content: 'Ett fel uppstod. Försök igen.' }]);
      }
    } catch (error) {
      console.error('Failed to ask Agda:', error);
      setAdvisorHistory(prev => [...prev, { role: 'assistant', content: 'Kunde inte ansluta till servern.' }]);
    } finally {
      setAiLoading(false);
    }
  };
  
  // Share functionality
  const handleShare = async (platform: 'native' | 'facebook' | 'twitter' | 'download') => {
    const shareText = `🐔 Min hönsgård idag!\n\n🥚 ${todayStats?.egg_count || 0} ägg idag\n🐔 ${todayStats?.hen_count || 0} hönor\n📊 ${summary?.this_month?.eggs || 0} ägg denna månad\n\n#Hönsgården #Höns #Ägg`;
    const shareUrl = 'https://honsgarden.se';
    
    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'Min Hönsgård',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'download') {
      // Create shareable image
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
        gradient.addColorStop(0, '#1a2e1a');
        gradient.addColorStop(1, '#0f1a0f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1080);
        
        // Title
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 72px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🐔 Hönsgården', 540, 150);
        
        // Stats
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px system-ui';
        ctx.fillText(`${todayStats?.egg_count || 0}`, 540, 400);
        ctx.font = '48px system-ui';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('ägg idag', 540, 470);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px system-ui';
        ctx.fillText(`${summary?.this_month?.eggs || 0}`, 540, 620);
        ctx.font = '36px system-ui';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('ägg denna månad', 540, 680);
        
        // Hens
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 60px system-ui';
        ctx.fillText(`🐔 ${todayStats?.hen_count || 0} hönor`, 540, 820);
        
        // Footer
        ctx.fillStyle = '#6b7280';
        ctx.font = '32px system-ui';
        ctx.fillText(format(new Date(), 'd MMMM yyyy', { locale: sv }), 540, 980);
        
        // Download
        const link = document.createElement('a');
        link.download = `honsgarden-${format(new Date(), 'yyyy-MM-dd')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
    setShowShareModal(false);
  };
  
  const hasData = (todayStats?.egg_count ?? 0) > 0 || (summary?.total_eggs_all_time ?? 0) > 0;
  
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">🥚</div>
        <p>Laddar din hönsgård...</p>
      </div>
    );
  }
  
  const today = new Date();
  const dateString = format(today, 'EEEE d MMMM', { locale: sv });
  const greeting = today.getHours() < 12 ? 'God morgon' : today.getHours() < 18 ? 'God eftermiddag' : 'God kväll';

  return (
    <div className={`dashboard ${isVisible ? 'visible' : ''}`} data-testid="dashboard">
      <DataLimitsBanner />
      <ProductivityAlerts flocks={flocks} />
      
      {/* Header */}
      <header className="dashboard-header fade-in">
        <div className="header-content">
          <p className="greeting">{greeting}!</p>
          <div className="header-title-row">
            <h1>{coop?.coop_name || 'Min Hönsgård'}</h1>
            <button 
              className="weather-widget"
              onClick={() => setShowWeatherModal(true)}
              title="Klicka för vädertips"
            >
              {weather?.current ? (
                <>
                  <span className="weather-icon">
                    {weather.current.temp < 0 ? '❄️' : 
                     weather.current.temp < 10 ? '🌥️' : 
                     weather.current.temp < 20 ? '⛅' : 
                     weather.current.temp < 25 ? '☀️' : '🔥'}
                  </span>
                  <span className="weather-temp">{Math.round(weather.current.temp)}°</span>
                </>
              ) : (
                <>
                  <span className="weather-icon">🌤️</span>
                  <span className="weather-temp">--°</span>
                </>
              )}
            </button>
          </div>
          <p className="date">{dateString}</p>
        </div>
        <button className="share-btn" onClick={() => setShowShareModal(true)} title="Dela">
          <span>📤</span>
        </button>
      </header>
      
      {/* Main Action - Add Eggs */}
      <button 
        className="main-action-btn slide-up"
        onClick={() => setShowEggModal(true)}
        data-testid="main-add-egg-btn"
      >
        <div className="action-icon">🥚</div>
        <div className="action-content">
          <span className="action-title">Registrera ägg</span>
          <span className="action-subtitle">
            {(todayStats?.egg_count ?? 0) > 0 
              ? `${todayStats?.egg_count} ägg idag` 
              : 'Tryck för att lägga till'}
          </span>
        </div>
        <div className="action-arrow">→</div>
      </button>
      
      {/* Quick Stats */}
      <div className="stats-grid slide-up delay-1">
        <Link to="/hens" className="stat-card">
          <span className="stat-emoji">🐔</span>
          <span className="stat-value">{flockStats?.hens || todayStats?.hen_count || 0}</span>
          <span className="stat-label">Hönor</span>
        </Link>
        {flockStats && flockStats.roosters > 0 && (
          <Link to="/hens" className="stat-card">
            <span className="stat-emoji">🐓</span>
            <span className="stat-value">{flockStats.roosters}</span>
            <span className="stat-label">Tuppar</span>
          </Link>
        )}
        <Link to="/statistics" className="stat-card">
          <span className="stat-emoji">🥚</span>
          <span className="stat-value">{summary?.this_month?.eggs || 0}</span>
          <span className="stat-label">Denna månad</span>
        </Link>
        <Link to="/finance" className="stat-card">
          <span className="stat-emoji">💰</span>
          <span className="stat-value">{summary?.this_month?.net || 0}</span>
          <span className="stat-label">kr netto</span>
        </Link>
      </div>
      
      {/* Flock Recommendations */}
      {flockStats && flockStats.recommendations && flockStats.recommendations.length > 0 && (
        <section className="flock-recommendations slide-up delay-2">
          <div className="section-header">
            <h2>🐔 Flockråd</h2>
          </div>
          <div className="recommendations">
            {flockStats.recommendations.map((rec, idx) => (
              <div key={idx} className={`recommendation ${rec.type}`}>
                {rec.type === 'success' && '✅ '}
                {rec.type === 'warning' && '⚠️ '}
                {rec.type === 'info' && '💡 '}
                {rec.message}
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Quick Actions - Moved higher */}
      <section className="quick-actions slide-up delay-2">
        <h2>Snabbåtgärder</h2>
        <div className="actions-grid">
          <button 
            className="action-card"
            onClick={() => setShowEggModal(true)}
          >
            <span>🥚</span>
            <span>Registrera ägg</span>
          </button>
          <Link to="/hens" className="action-card">
            <span>🐔</span>
            <span>Mina hönor</span>
          </Link>
          <Link to="/feed" className="action-card">
            <span>🌾</span>
            <span>Foder</span>
            {!premium?.is_premium && <span className="action-badge">Premium</span>}
          </Link>
          <Link to="/hatching" className="action-card">
            <span>🐣</span>
            <span>Kläckning</span>
            {!premium?.is_premium && <span className="action-badge">Premium</span>}
          </Link>
          <Link to="/finance" className="action-card">
            <span>💰</span>
            <span>Ekonomi</span>
          </Link>
          <Link to="/statistics" className="action-card">
            <span>📊</span>
            <span>Statistik</span>
          </Link>
        </div>
      </section>
      
      {/* AI Features Section */}
      <section className="ai-section slide-up delay-3">
        <div className="section-header">
          <h2>🤖 AI-insikter</h2>
          {!premium?.is_premium && <span className="premium-badge">Premium</span>}
        </div>
        
        <div className="ai-cards">
          {/* Fråga Agda */}
          <button 
            className={`ai-card ${!premium?.is_premium ? 'locked' : ''}`}
            onClick={() => premium?.is_premium ? loadAiData('advisor') : navigate('/premium')}
            data-testid="ask-agda-btn"
          >
            <span className="ai-icon">🐔</span>
            <div className="ai-info">
              <span className="ai-title">Fråga Agda</span>
              <span className="ai-desc">{premium?.is_premium ? 'Din AI-rådgivare' : 'Lås upp med Premium'}</span>
            </div>
            {!premium?.is_premium && <span className="lock-icon">🔒</span>}
          </button>
          
          {/* Dagens tips */}
          <button 
            className={`ai-card ${!premium?.is_premium ? 'locked' : ''}`}
            onClick={() => premium?.is_premium ? loadAiData('tip') : navigate('/premium')}
            data-testid="daily-tip-btn"
          >
            <span className="ai-icon">💡</span>
            <div className="ai-info">
              <span className="ai-title">Dagens tips</span>
              <span className="ai-desc">{premium?.is_premium ? 'Dagligt hönstips' : 'Lås upp med Premium'}</span>
            </div>
            {!premium?.is_premium && <span className="lock-icon">🔒</span>}
          </button>
          
          {/* Dagsrapport */}
          <button 
            className={`ai-card ${!premium?.is_premium ? 'locked' : ''}`}
            onClick={() => premium?.is_premium ? loadAiData('daily') : navigate('/premium')}
          >
            <span className="ai-icon">📋</span>
            <div className="ai-info">
              <span className="ai-title">Dagsrapport</span>
              <span className="ai-desc">{premium?.is_premium ? 'Personlig AI-analys' : 'Lås upp med Premium'}</span>
            </div>
            {!premium?.is_premium && <span className="lock-icon">🔒</span>}
          </button>
          
          {/* 7-dagars prognos */}
          <button 
            className={`ai-card ${!premium?.is_premium ? 'locked' : ''}`}
            onClick={() => premium?.is_premium ? loadAiData('forecast') : navigate('/premium')}
          >
            <span className="ai-icon">📈</span>
            <div className="ai-info">
              <span className="ai-title">7-dagars prognos</span>
              <span className="ai-desc">{premium?.is_premium ? 'Förutsäg produktion' : 'Lås upp med Premium'}</span>
            </div>
            {!premium?.is_premium && <span className="lock-icon">🔒</span>}
          </button>
        </div>
      </section>
      
      {/* Upgrade Banner for Free Users */}
      {!premium?.is_premium && (
        <Link to="/premium" className="upgrade-banner slide-up delay-4">
          <span className="upgrade-icon">⭐</span>
          <div className="upgrade-text">
            <span className="upgrade-title">Uppgradera till Premium</span>
            <span className="upgrade-desc">AI-rapporter, prognos, hälsologg & mer</span>
          </div>
          <span className="upgrade-arrow">→</span>
        </Link>
      )}
      
      {/* Egg Registration Modal */}
      {showEggModal && (
        <div className="modal-overlay" onClick={() => setShowEggModal(false)}>
          <div className="modal modal-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🥚 Registrera ägg</h3>
              <button className="close-btn" onClick={() => setShowEggModal(false)}>✕</button>
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
      
      {/* Weather Modal */}
      {showWeatherModal && (
        <div className="modal-overlay" onClick={() => setShowWeatherModal(false)}>
          <div className="modal modal-slide-up weather-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🌤️ Väder & Tips</h3>
              <button className="close-btn" onClick={() => setShowWeatherModal(false)}>✕</button>
            </div>
            <div className="weather-modal-content">
              {weather?.current ? (
                <>
                  <div className="weather-main">
                    <div className="weather-big-icon">
                      {weather.current.temp < 0 ? '❄️' : 
                       weather.current.temp < 10 ? '🌥️' : 
                       weather.current.temp < 20 ? '⛅' : 
                       weather.current.temp < 25 ? '☀️' : '🔥'}
                    </div>
                    <div className="weather-info">
                      <span className="weather-big-temp">{Math.round(weather.current.temp)}°C</span>
                      <span className="weather-feels">Känns som {Math.round(weather.current.feels_like)}°</span>
                      <span className="weather-desc">{weather.current.description}</span>
                      <span className="weather-location">📍 {weather.current.location}</span>
                    </div>
                  </div>
                  <div className="weather-details">
                    <div className="weather-detail">
                      <span className="detail-label">Luftfuktighet</span>
                      <span className="detail-value">{weather.current.humidity}%</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="weather-loading">Laddar väderdata...</p>
              )}
              
              {weather?.tips && weather.tips.length > 0 && (
                <div className="weather-tips-section">
                  <h4>💡 Tips för din hönsgård</h4>
                  {premium?.is_premium ? (
                    <div className="tips-list">
                      {weather.tips.map((tip, idx) => (
                        <div key={idx} className={`tip-card ${tip.priority}`}>
                          <span>{tip.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="premium-lock-card">
                      <span className="lock-icon">🔒</span>
                      <p>Vädertips är en Premium-funktion</p>
                      <button 
                        className="btn-upgrade-small"
                        onClick={() => {
                          setShowWeatherModal(false);
                          navigate('/premium');
                        }}
                      >
                        Uppgradera till Premium
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {!userLocation && (
                <button 
                  className="location-btn"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                          setUserLocation(coords);
                          fetchWeatherWithLocation(coords.lat, coords.lon);
                        },
                        () => alert('Kunde inte hämta din plats')
                      );
                    }
                  }}
                >
                  📍 Använd min plats
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal modal-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Dela din statistik</h3>
              <button className="close-btn" onClick={() => setShowShareModal(false)}>✕</button>
            </div>
            
            <div className="share-preview">
              <div className="share-card-preview">
                <p className="share-title">🐔 {coop?.coop_name || 'Min Hönsgård'}</p>
                <p className="share-stat-big">{todayStats?.egg_count || 0} ägg idag</p>
                <p className="share-stat-small">{summary?.this_month?.eggs || 0} ägg denna månad</p>
              </div>
            </div>
            
            <div className="share-buttons">
              {navigator.share && (
                <button onClick={() => handleShare('native')} className="share-option">
                  <span>📱</span>
                  <span>Dela</span>
                </button>
              )}
              <button onClick={() => handleShare('facebook')} className="share-option facebook">
                <span>📘</span>
                <span>Facebook</span>
              </button>
              <button onClick={() => handleShare('twitter')} className="share-option twitter">
                <span>🐦</span>
                <span>Twitter</span>
              </button>
              <button onClick={() => handleShare('download')} className="share-option download">
                <span>📥</span>
                <span>Ladda ner bild</span>
              </button>
            </div>
            
            <p className="share-hint">Ladda ner bilden för att dela på Instagram Stories!</p>
          </div>
        </div>
      )}
      
      {/* AI Modal */}
      {showAiModal && (
        <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="modal modal-slide-up ai-modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {aiModalType === 'advisor' && '🐔 Fråga Agda'}
                {aiModalType === 'tip' && '💡 Dagens tips'}
                {aiModalType === 'daily' && '📋 AI Dagsrapport'}
                {aiModalType === 'forecast' && '📈 7-dagars prognos'}
              </h3>
              <button className="close-btn" onClick={() => { setShowAiModal(false); setAdvisorHistory([]); }}>✕</button>
            </div>
            
            {/* Fråga Agda - Chat Interface */}
            {aiModalType === 'advisor' && (
              <div className="advisor-chat">
                <div className="chat-messages">
                  {advisorHistory.length === 0 && (
                    <div className="chat-welcome">
                      <p>Hej! Jag är Agda, din AI-drivna hönsgårdsrådgivare 🐔</p>
                      <p>Ställ valfri fråga om dina höns, äggproduktion, hälsa, foder eller skötsel!</p>
                    </div>
                  )}
                  {advisorHistory.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                      <span className="message-icon">{msg.role === 'user' ? '👤' : '🐔'}</span>
                      <p>{msg.content}</p>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="chat-message assistant loading">
                      <span className="message-icon">🐔</span>
                      <p>Tänker...</p>
                    </div>
                  )}
                </div>
                <div className="chat-input-container">
                  <input
                    type="text"
                    value={advisorQuestion}
                    onChange={(e) => setAdvisorQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && askAgda()}
                    placeholder="Ställ en fråga till Agda..."
                    disabled={aiLoading}
                    className="chat-input"
                  />
                  <button onClick={askAgda} disabled={aiLoading || !advisorQuestion.trim()} className="chat-send-btn">
                    {aiLoading ? '⏳' : '➤'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Dagens tips */}
            {aiModalType === 'tip' && (
              aiLoading ? (
                <div className="ai-loading">
                  <div className="loading-spinner">💡</div>
                  <p>Hämtar dagens tips...</p>
                </div>
              ) : aiData ? (
                <div className="ai-content tip-content">
                  <div className="tip-card">
                    <span className="tip-icon">💡</span>
                    <p className="tip-text">{aiData.tip || aiData.message || 'Inget tips tillgängligt just nu.'}</p>
                  </div>
                </div>
              ) : (
                <div className="ai-error">
                  <p>Kunde inte hämta dagens tips. Försök igen senare.</p>
                </div>
              )
            )}
            
            {/* Dagsrapport */}
            {aiModalType === 'daily' && (
              aiLoading ? (
                <div className="ai-loading">
                  <div className="loading-spinner">🤖</div>
                  <p>Genererar rapport...</p>
                </div>
              ) : aiData ? (
                <div className="ai-content">
                  <p className="ai-summary">{aiData.report?.summary}</p>
                  <div className="ai-stats-row">
                    <div className="ai-stat-item">
                      <span>🥚</span>
                      <span>{aiData.report?.eggs_today || 0} ägg</span>
                    </div>
                    <div className="ai-stat-item">
                      <span>🐔</span>
                      <span>{aiData.report?.hen_count || 0} hönor</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ai-error">
                  <p>Kunde inte generera rapporten. Försök igen senare.</p>
                </div>
              )
            )}
            
            {/* 7-dagars prognos */}
            {aiModalType === 'forecast' && (
              aiLoading ? (
                <div className="ai-loading">
                  <div className="loading-spinner">📈</div>
                  <p>Genererar prognos...</p>
                </div>
              ) : aiData ? (
                <div className="ai-content">
                  <p className="forecast-total">
                    Förväntat: <strong>{aiData.forecast?.total_predicted || aiData.predicted_eggs || 0} ägg</strong>
                  </p>
                  <p className="forecast-avg">Genomsnitt: {aiData.forecast?.avg_daily || Math.round((aiData.predicted_eggs || 0) / 7)} ägg/dag</p>
                </div>
              ) : (
                <div className="ai-error">
                  <p>Kunde inte generera prognosen. Försök igen senare.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
