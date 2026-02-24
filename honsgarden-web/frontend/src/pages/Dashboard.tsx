import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import './Dashboard.css';

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

interface Insights {
  cost_per_egg: number;
  total_eggs: number;
  total_costs: number;
  top_hen: { id: string; name: string; eggs: number } | null;
  productivity_index: number;
  hen_count: number;
  hen_ranking: Array<{ id: string; name: string; eggs: number; lifecycle: string | null }>;
}

export default function Dashboard() {
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [coop, setCoop] = useState<CoopSettings | null>(null);
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [hens, setHens] = useState<Hen[]>([]);
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
      const [todayRes, summaryRes, coopRes, premiumRes, hensRes] = await Promise.all([
        fetch('/api/statistics/today', { credentials: 'include' }),
        fetch('/api/statistics/summary', { credentials: 'include' }),
        fetch('/api/coop', { credentials: 'include' }),
        fetch('/api/premium/status', { credentials: 'include' }),
        fetch('/api/hens', { credentials: 'include' })
      ]);
      
      if (todayRes.ok) setTodayStats(await todayRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (coopRes.ok) setCoop(await coopRes.json());
      if (premiumRes.ok) setPremium(await premiumRes.json());
      if (hensRes.ok) setHens(await hensRes.json());
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
      
      {/* Premium Banner */}
      {!premium?.is_premium && (
        <Link to="/premium" className="premium-banner" data-testid="premium-banner">
          <div className="premium-content">
            <span className="premium-icon">⭐</span>
            <div>
              <strong>Uppgradera till Premium</strong>
              <p>Obegränsad historik, PDF-export, påminnelser</p>
            </div>
          </div>
          <span className="premium-arrow">›</span>
        </Link>
      )}
    </div>
  );
}
