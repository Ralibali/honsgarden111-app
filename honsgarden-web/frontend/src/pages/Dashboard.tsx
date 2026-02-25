import React, { useState, useEffect } from 'react';
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
  cost_per_egg: number;
  total_eggs: number;
  total_costs: number;
  top_hen: { id: string; name: string; eggs: number } | null;
  productivity_index: number;
  hen_count: number;
  hen_ranking: Array<{ id: string; name: string; eggs: number; lifecycle: string | null }>;
  is_premium: boolean;
  premium?: {
    forecast_7_days: number;
    daily_average: number;
    production_status: string;
    production_text: string;
    deviation_percent: number;
    deviating_hens: Array<{ id: string; name: string; alert: string }>;
    economy: {
      this_month: { costs: number; sales: number; profit: number };
      last_month: { costs: number; sales: number; profit: number };
      change: number;
      change_percent: number;
    };
    summary: string;
  };
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
  const [loading, setLoading] = useState(true);
  const [eggCount, setEggCount] = useState('');
  const [selectedHen, setSelectedHen] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showHenPicker, setShowHenPicker] = useState(false);
  
  // New: Modal state for egg registration
  const [showEggModal, setShowEggModal] = useState(false);
  
  // New: AI Modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiModalType, setAiModalType] = useState<'daily' | 'forecast'>('daily');
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [todayRes, summaryRes, coopRes, premiumRes, hensRes, insightsRes, flocksRes] = await Promise.all([
        fetch('/api/statistics/today', { credentials: 'include' }),
        fetch('/api/statistics/summary', { credentials: 'include' }),
        fetch('/api/coop', { credentials: 'include' }),
        fetch('/api/premium/status', { credentials: 'include' }),
        fetch('/api/hens', { credentials: 'include' }),
        fetch('/api/insights', { credentials: 'include' }),
        fetch('/api/flocks', { credentials: 'include' })
      ]);
      
      if (todayRes.ok) setTodayStats(await todayRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (coopRes.ok) setCoop(await coopRes.json());
      if (premiumRes.ok) setPremium(await premiumRes.json());
      if (hensRes.ok) setHens(await hensRes.json());
      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (flocksRes.ok) setFlocks(await flocksRes.json());
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
      setShowHenPicker(false);
      setShowEggModal(false);
    } catch (error) {
      console.error('Failed to add eggs:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // Load AI data
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
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);
  };
  
  // Check if user has any data
  const hasData = (todayStats?.egg_count ?? 0) > 0 || (summary?.total_eggs_all_time ?? 0) > 0;
  
  // Get production status text
  const getProductionStatusText = () => {
    if (!hasData) {
      return { status: 'Ingen data ännu', color: '#9ca3af', text: 'Lägg till ägg för att se statistik' };
    }
    if (insights?.premium?.production_status === 'high') {
      return { status: 'Hög produktion', color: '#22c55e', text: insights.premium.production_text };
    }
    if (insights?.premium?.production_status === 'low') {
      return { status: 'Låg produktion', color: '#ef4444', text: insights.premium.production_text };
    }
    return { status: 'Normal produktion', color: '#22c55e', text: insights?.premium?.production_text || '' };
  };
  
  const productionInfo = getProductionStatusText();
  
  if (loading) {
    return <div className="loading">Laddar...</div>;
  }
  
  const today = new Date();
  const dateString = format(today, 'EEEE d MMMM yyyy', { locale: sv });
  
  return (
    <div className="dashboard" data-testid="dashboard">
      {/* Data Limits Banner for Free Users */}
      <DataLimitsBanner />
      
      {/* Productivity Alerts */}
      <ProductivityAlerts flocks={flocks} />
      
      <header className="dashboard-header">
        <div>
          <h1>{coop?.coop_name || 'Min Hönsgård'}</h1>
          <p className="date">{dateString}</p>
        </div>
      </header>
      
      {/* Main Action Button - Add Eggs */}
      <button 
        className="main-add-egg-btn"
        onClick={() => setShowEggModal(true)}
        data-testid="main-add-egg-btn"
      >
        <span className="btn-icon">🥚</span>
        <span className="btn-text">Lägg till ägg</span>
        {(todayStats?.egg_count ?? 0) > 0 && (
          <span className="today-count">{todayStats?.egg_count} idag</span>
        )}
      </button>
      
      {/* Quick Stats */}
      <div className="stats-row">
        <Link to="/hens" className="stat-card hen-card" data-testid="hen-count-card">
          <span className="stat-icon">🐔</span>
          <span className="stat-value">{todayStats?.hen_count || 0}</span>
          <span className="stat-label">Hönor</span>
        </Link>
        <Link to="/statistics" className="stat-card egg-card" data-testid="egg-count-card">
          <span className="stat-icon">🥚</span>
          <span className="stat-value">{summary?.this_month?.eggs || 0}</span>
          <span className="stat-label">Denna månad</span>
        </Link>
      </div>
      
      {/* Egg Registration Modal */}
      {showEggModal && (
        <div className="modal-overlay" onClick={() => setShowEggModal(false)}>
          <div className="egg-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🥚 Registrera ägg</h3>
              <button className="close-btn" onClick={() => setShowEggModal(false)}>✕</button>
            </div>
            
            {hens.length > 0 && (
              <div className="hen-selector">
                <label>Välj höna (valfritt)</label>
                <select 
                  value={selectedHen} 
                  onChange={e => setSelectedHen(e.target.value)}
                >
                  <option value="">Alla hönor</option>
                  {hens.map(hen => (
                    <option key={hen.id} value={hen.id}>{hen.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="quick-add-buttons">
              {[1, 2, 3, 5, 10].map(num => (
                <button
                  key={num}
                  onClick={() => handleQuickAdd(num)}
                  disabled={saving}
                  className="quick-add-btn"
                >
                  +{num}
                </button>
              ))}
            </div>
            
            <div className="custom-add">
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
      
      {/* Monthly Summary */}
      <div className="card summary-card">
        <h3>Denna månad</h3>
        <div className="month-stats">
          <div className="month-stat">
            <span className="month-value">{summary?.this_month.eggs || 0}</span>
            <span className="month-label">Ägg</span>
          </div>
          <div className="month-divider"></div>
          <div className="month-stat">
            <span className="month-value cost">{formatCurrency(summary?.this_month.costs || 0)}</span>
            <span className="month-label">Kostnader</span>
          </div>
          <div className="month-divider"></div>
          <div className="month-stat">
            <span className="month-value income">{formatCurrency(summary?.this_month.sales || 0)}</span>
            <span className="month-label">Försäljning</span>
          </div>
        </div>
        <div className="net-row">
          <span>Netto:</span>
          <span className={`net-value ${(summary?.this_month.net || 0) >= 0 ? 'positive' : 'negative'}`}>
            {(summary?.this_month.net || 0) >= 0 ? '+' : ''}{formatCurrency(summary?.this_month.net || 0)}
          </span>
        </div>
      </div>
      
      {/* All Time Stats */}
      <div className="card">
        <h3>Totalt</h3>
        <div className="total-stats">
          <div className="total-stat">
            <span className="total-icon">🥚</span>
            <span className="total-value">{summary?.total_eggs_all_time || 0}</span>
            <span className="total-label">Totalt ägg</span>
          </div>
          <div className="total-stat">
            <span className="total-icon">📈</span>
            <span className="total-value income">{formatCurrency(summary?.total_sales_all_time || 0)}</span>
            <span className="total-label">Intäkter</span>
          </div>
          <div className="total-stat">
            <span className="total-icon">📉</span>
            <span className="total-value cost">{formatCurrency(summary?.total_costs_all_time || 0)}</span>
            <span className="total-label">Kostnader</span>
          </div>
        </div>
      </div>
      
      {/* Insights Card */}
      {insights && (
        <div className="card insights-card">
          <h3>📊 Insikter</h3>
          <div className="insights-grid">
            <div className="insight-item">
              <span className="insight-icon">💰</span>
              <div className="insight-data">
                <span className="insight-value">{insights.cost_per_egg} kr</span>
                <span className="insight-label">Kostnad per ägg</span>
              </div>
            </div>
            {insights.top_hen && (
              <div className="insight-item top-hen">
                <span className="insight-icon">🏆</span>
                <div className="insight-data">
                  <span className="insight-value">{insights.top_hen.name}</span>
                  <span className="insight-label">Toppvärpare ({insights.top_hen.eggs} ägg)</span>
                </div>
              </div>
            )}
            <div className="insight-item">
              <span className="insight-icon">📈</span>
              <div className="insight-data">
                <span className="insight-value">{insights.productivity_index}%</span>
                <span className="insight-label">Produktivitet denna månad</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* PREMIUM INSIGHTS SECTION */}
      {insights?.premium && (
        <div className="card premium-insights-card">
          <div className="premium-header">
            <h3>⭐ Premium Insikter</h3>
            <span className="premium-badge">Premium</span>
          </div>
          
          {/* Summary */}
          <div className="premium-summary">
            <p>{insights.premium.summary}</p>
          </div>
          
          {/* Production Status + Forecast */}
          <div className="premium-stats-row">
            <div className={`status-card status-${insights.premium.production_status}`}>
              <span className="status-text">{insights.premium.production_text}</span>
              <span className="status-detail">{insights.premium.deviation_percent > 0 ? '+' : ''}{insights.premium.deviation_percent}% vs snitt</span>
            </div>
            <div className="forecast-card">
              <span className="forecast-icon">🔮</span>
              <div className="forecast-data">
                <span className="forecast-value">~{insights.premium.forecast_7_days} ägg</span>
                <span className="forecast-label">Prognos nästa 7 dagar</span>
              </div>
            </div>
          </div>
          
          {/* Deviating Hens Alert */}
          {insights.premium.deviating_hens.length > 0 && (
            <div className="alert-section">
              <h4>⚠️ Avvikelser upptäckta</h4>
              {insights.premium.deviating_hens.map(hen => (
                <div key={hen.id} className="hen-alert">
                  <span className="alert-icon">🐔</span>
                  <span className="alert-text">{hen.alert}</span>
                  <Link to="/hens" className="alert-action">Logga hälsa →</Link>
                </div>
              ))}
            </div>
          )}
          
          {/* Economy Comparison */}
          <div className="economy-comparison">
            <h4>💰 Ekonomijämförelse</h4>
            <div className="economy-cards">
              <div className="economy-card">
                <span className="economy-label">Denna månad</span>
                <span className={`economy-value ${insights.premium.economy.this_month.profit >= 0 ? 'positive' : 'negative'}`}>
                  {insights.premium.economy.this_month.profit >= 0 ? '+' : ''}{insights.premium.economy.this_month.profit} kr
                </span>
                <span className="economy-breakdown">
                  ↑ {insights.premium.economy.this_month.sales} kr  ↓ {insights.premium.economy.this_month.costs} kr
                </span>
              </div>
              <div className="economy-card faded">
                <span className="economy-label">Förra månaden</span>
                <span className="economy-value">
                  {insights.premium.economy.last_month.profit >= 0 ? '+' : ''}{insights.premium.economy.last_month.profit} kr
                </span>
              </div>
            </div>
            <div className={`economy-change ${insights.premium.economy.change >= 0 ? 'positive' : 'negative'}`}>
              {insights.premium.economy.change >= 0 ? '📈' : '📉'} {insights.premium.economy.change >= 0 ? '+' : ''}{insights.premium.economy.change} kr ({insights.premium.economy.change_percent}%)
            </div>
          </div>
        </div>
      )}
      
      {/* AI Premium Features Section - Shown to everyone, blurred for free */}
      <div className={`card ai-premium-section ${!premium?.is_premium ? 'blurred' : ''}`}>
        <div className="ai-section-header">
          <h3>🤖 AI-funktioner</h3>
          {!premium?.is_premium && (
            <span className="premium-badge-small">
              <span className="lock-icon">🔒</span> Premium
            </span>
          )}
        </div>
        
        <div className="ai-features-grid">
          <button 
            className={`ai-feature-card ${!premium?.is_premium ? 'locked' : ''}`}
            onClick={() => premium?.is_premium ? loadAiData('daily') : navigate('/premium')}
          >
            <div className="ai-feature-icon">📋</div>
            <div className="ai-feature-content">
              <h4>AI Dagsrapport</h4>
              <p>{premium?.is_premium 
                ? 'Personlig sammanfattning och tips baserat på din data'
                : 'Uppgradera för daglig AI-analys...'
              }</p>
            </div>
            {!premium?.is_premium && (
              <span className="unlock-btn">Lås upp</span>
            )}
          </button>
          
          <button 
            className={`ai-feature-card ${!premium?.is_premium ? 'locked' : ''}`}
            onClick={() => premium?.is_premium ? loadAiData('forecast') : navigate('/premium')}
          >
            <div className="ai-feature-icon">📈</div>
            <div className="ai-feature-content">
              <h4>Äggprognos 7 dagar</h4>
              <p>{premium?.is_premium 
                ? 'Förutsäg produktion baserat på historik'
                : 'Se vad du kan förvänta dig...'
              }</p>
            </div>
            {!premium?.is_premium && (
              <span className="unlock-btn">Lås upp</span>
            )}
          </button>
        </div>
        
        {!premium?.is_premium && (
          <Link to="/premium" className="ai-upgrade-hint">
            <span>✨</span> Uppgradera för full AI-upplevelse
          </Link>
        )}
      </div>
      
      {/* AI Modal */}
      {showAiModal && (
        <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{aiModalType === 'daily' ? '📋 AI Dagsrapport' : '📈 Äggprognos 7 dagar'}</h3>
              <button className="close-btn" onClick={() => setShowAiModal(false)}>✕</button>
            </div>
            
            {aiLoading ? (
              <div className="ai-loading">
                <span className="loading-spinner">🔄</span>
                <p>Genererar {aiModalType === 'daily' ? 'dagsrapport' : 'prognos'}...</p>
              </div>
            ) : aiData ? (
              <div className="ai-content">
                {aiModalType === 'daily' ? (
                  <>
                    <p className="ai-summary">{aiData.report?.summary}</p>
                    <div className="ai-stats">
                      <div className="ai-stat">
                        <span>🥚</span>
                        <span>{aiData.report?.eggs_today || 0} ägg idag</span>
                      </div>
                      <div className="ai-stat">
                        <span>🐔</span>
                        <span>{aiData.report?.hen_count || 0} hönor</span>
                      </div>
                    </div>
                    {aiData.report?.alerts?.length > 0 && (
                      <div className="ai-alerts">
                        <h4>⚠️ Varningar</h4>
                        {aiData.report.alerts.map((alert: string, i: number) => (
                          <p key={i}>{alert}</p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="ai-forecast-summary">
                      Förväntat: <strong>{aiData.forecast?.total_predicted || 0} ägg</strong> nästa 7 dagar
                    </p>
                    <div className="ai-forecast-details">
                      <p>Baserat på {aiData.forecast?.days_of_data || 0} dagars historik</p>
                      <p>Genomsnitt: {aiData.forecast?.avg_daily || 0} ägg/dag</p>
                    </div>
                    {aiData.forecast?.daily_predictions && (
                      <div className="forecast-list">
                        {aiData.forecast.daily_predictions.map((day: any) => (
                          <div key={day.date} className="forecast-day">
                            <span>{day.date}</span>
                            <span>~{day.predicted_eggs} ägg</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p>Kunde inte ladda data</p>
            )}
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>⚡ Snabbåtgärder</h3>
        <div className="quick-actions-grid">
          <Link to="/feed" className="quick-action-card">
            <span className="quick-action-icon" style={{ background: '#f59e0b' }}>🌾</span>
            <span className="quick-action-label">Foder</span>
          </Link>
          <Link to="/hatching" className="quick-action-card">
            <span className="quick-action-icon" style={{ background: '#ec4899' }}>🐣</span>
            <span className="quick-action-label">Kläckning</span>
          </Link>
          <button 
            className="quick-action-card"
            onClick={() => {
              const text = `🐔 ${coop?.coop_name || 'Min Hönsgård'} - Statistik\n\n🥚 ${summary?.this_month.eggs || 0} ägg denna månad\n📊 ${summary?.total_eggs_all_time || 0} ägg totalt\n💪 ${insights?.productivity_index || 0}% produktivitet\n🐓 ${today?.hen_count || 0} hönor\n\nSpåra din hönsgård med Hönsgården-appen! 🌾`;
              if (navigator.share) {
                navigator.share({ title: 'Min hönsgårdsstatistik', text });
              } else {
                navigator.clipboard.writeText(text);
                alert('Kopierat till urklipp!');
              }
            }}
          >
            <span className="quick-action-icon" style={{ background: '#3b82f6' }}>📤</span>
            <span className="quick-action-label">Dela</span>
          </button>
          <Link to="/statistics" className="quick-action-card">
            <span className="quick-action-icon" style={{ background: '#8b5cf6' }}>📊</span>
            <span className="quick-action-label">Statistik</span>
          </Link>
        </div>
      </div>
      
      {/* Premium Banner - Show if NOT premium */}
      {!premium?.is_premium && (
        <Link to="/premium" className="premium-banner" data-testid="premium-banner">
          <div className="premium-content">
            <span className="premium-icon">⭐</span>
            <div>
              <strong>Uppgradera till Premium</strong>
              <p>Prognos, produktionsstatus, varningar & ekonomijämförelse</p>
            </div>
          </div>
          <span className="premium-arrow">›</span>
        </Link>
      )}
    </div>
  );
}
