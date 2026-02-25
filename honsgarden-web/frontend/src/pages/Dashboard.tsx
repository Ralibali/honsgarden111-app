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
  const [aiModalType, setAiModalType] = useState<'daily' | 'forecast'>('daily');
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);

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
  
  const loadAiData = async (type: 'daily' | 'forecast') => {
    setAiLoading(true);
    setAiModalType(type);
    setShowAiModal(true);
    try {
      const endpoint = type === 'daily' ? '/api/ai/daily-report' : '/api/ai/egg-forecast';
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
          <h1>{coop?.coop_name || 'Min Hönsgård'}</h1>
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
          <span className="stat-value">{todayStats?.hen_count || 0}</span>
          <span className="stat-label">Hönor</span>
        </Link>
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
      
      {/* AI Features Section */}
      <section className="ai-section slide-up delay-2">
        <div className="section-header">
          <h2>🤖 AI-insikter</h2>
          {!premium?.is_premium && <span className="premium-badge">Premium</span>}
        </div>
        
        <div className="ai-cards">
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
      
      {/* Quick Actions */}
      <section className="quick-actions slide-up delay-3">
        <h2>Snabbåtgärder</h2>
        <div className="actions-grid">
          <Link to="/hens" className="action-card">
            <span>🐔</span>
            <span>Lägg till höna</span>
          </Link>
          <Link to="/finance" className="action-card">
            <span>💸</span>
            <span>Lägg till kostnad</span>
          </Link>
          <Link to="/statistics" className="action-card">
            <span>📊</span>
            <span>Se statistik</span>
          </Link>
          <Link to="/settings" className="action-card">
            <span>⚙️</span>
            <span>Inställningar</span>
          </Link>
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
          <div className="modal modal-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{aiModalType === 'daily' ? '📋 AI Dagsrapport' : '📈 7-dagars prognos'}</h3>
              <button className="close-btn" onClick={() => setShowAiModal(false)}>✕</button>
            </div>
            
            {aiLoading ? (
              <div className="ai-loading">
                <div className="loading-spinner">🤖</div>
                <p>Genererar {aiModalType === 'daily' ? 'rapport' : 'prognos'}...</p>
              </div>
            ) : aiData ? (
              <div className="ai-content">
                {aiModalType === 'daily' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <p className="forecast-total">
                      Förväntat: <strong>{aiData.forecast?.total_predicted || 0} ägg</strong>
                    </p>
                    <p className="forecast-avg">Genomsnitt: {aiData.forecast?.avg_daily || 0} ägg/dag</p>
                  </>
                )}
              </div>
            ) : (
              <p className="ai-error">Kunde inte ladda data</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
