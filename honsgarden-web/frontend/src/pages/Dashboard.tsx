import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    } catch (error) {
      console.error('Failed to add eggs:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);
  };
  
  if (loading) {
    return <div className="loading">Laddar...</div>;
  }
  
  const today = new Date();
  const dateString = format(today, 'EEEE d MMMM yyyy', { locale: sv });
  
  return (
    <div className="dashboard" data-testid="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{coop?.coop_name || 'Min Hönsgård'}</h1>
          <p className="subtitle">Följ äggproduktion och ekonomi – dag för dag.</p>
          <p className="date">{dateString}</p>
        </div>
      </header>
      
      {/* Quick Stats */}
      <div className="stats-row">
        <Link to="/hens" className="stat-card hen-card" data-testid="hen-count-card">
          <span className="stat-icon">🐔</span>
          <span className="stat-value">{todayStats?.hen_count || 0}</span>
          <span className="stat-label">Hönor</span>
        </Link>
        <div className="stat-card egg-card" data-testid="egg-count-card">
          <span className="stat-icon">🥚</span>
          <span className="stat-value">{todayStats?.egg_count || 0}</span>
          <span className="stat-label">Ägg idag</span>
        </div>
      </div>
      
      {/* Quick Add */}
      <div className="quick-add-section">
        <div className="quick-add-header">
          <h3>Snabbregistrera ägg</h3>
          {hens.length > 0 && (
            <button 
              className={`hen-toggle ${showHenPicker ? 'active' : ''}`}
              onClick={() => setShowHenPicker(!showHenPicker)}
              data-testid="hen-toggle-btn"
            >
              {selectedHen ? `🐔 ${hens.find(h => h.id === selectedHen)?.name}` : '🥚 Alla hönor'}
              <span className="toggle-icon">{showHenPicker ? '▲' : '▼'}</span>
            </button>
          )}
        </div>
        
        {showHenPicker && hens.length > 0 && (
          <div className="hen-picker" data-testid="hen-picker">
            <button 
              className={`hen-option ${selectedHen === '' ? 'active' : ''}`}
              onClick={() => { setSelectedHen(''); setShowHenPicker(false); }}
              data-testid="hen-option-all"
            >
              <span>🥚</span>
              <span>Alla hönor</span>
            </button>
            {hens.map(hen => (
              <button
                key={hen.id}
                className={`hen-option ${selectedHen === hen.id ? 'active' : ''}`}
                onClick={() => { setSelectedHen(hen.id); setShowHenPicker(false); }}
                data-testid={`hen-option-${hen.id}`}
              >
                <span>🐔</span>
                <span>{hen.name}</span>
              </button>
            ))}
          </div>
        )}
        
        <div className="quick-add-buttons">
          {[1, 2, 3, 5, 10].map(num => (
            <button
              key={num}
              onClick={() => handleQuickAdd(num)}
              disabled={saving}
              className="quick-add-btn"
              data-testid={`quick-add-${num}`}
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
            data-testid="custom-egg-count"
          />
          <button
            onClick={() => eggCount && handleQuickAdd(parseInt(eggCount))}
            disabled={!eggCount || saving}
            className="btn-primary"
            data-testid="add-custom-eggs"
          >
            Lägg till
          </button>
        </div>
      </div>
      
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
