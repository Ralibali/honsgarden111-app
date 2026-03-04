import React, { useState, useEffect, useCallback } from 'react';
import { format, subMonths, endOfMonth } from 'date-fns';
import { sv } from 'date-fns/locale';
import './Statistics.css';

interface MonthStats {
  year: number;
  month: number;
  total_eggs: number;
  avg_eggs_per_day: number;
  total_costs: number;
  total_sales: number;
  net: number;
  eggs_per_hen?: number;
  daily_breakdown: Array<{ date: string; eggs: number; costs: number; sales: number }>;
}

interface Hen {
  id: string;
  name: string;
  breed?: string;
  expected_eggs_per_week?: number;
}

interface HenStats {
  hen: Hen;
  eggs: number;
  percentage: number;
  trend: 'up' | 'down' | 'same';
}

interface EggRecord {
  date: string;
  count: number;
  hen_id?: string;
}

type ViewMode = 'overview' | 'hens' | 'chart';

// Simple bar chart component - no external dependencies
function SimpleBarChart({ data, maxValue, label }: { data: { label: string; value: number }[]; maxValue: number; label: string }) {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="simple-chart">
      <div className="chart-label">{label}</div>
      <div className="chart-bars">
        {data.map((item, i) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={i} className="bar-item">
              <div className="bar-value">{item.value > 0 ? item.value : ''}</div>
              <div className="bar-track">
                <div 
                  className="bar-fill" 
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
              </div>
              <div className="bar-label">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Trend indicator
function TrendBadge({ trend }: { trend: 'up' | 'down' | 'same' }) {
  const config = {
    up: { icon: '↑', className: 'trend-up', text: 'Ökar' },
    down: { icon: '↓', className: 'trend-down', text: 'Minskar' },
    same: { icon: '→', className: 'trend-same', text: 'Stabil' }
  };
  const { icon, className, text } = config[trend];
  
  return (
    <span className={`trend-badge ${className}`}>
      {icon} {text}
    </span>
  );
}

export default function Statistics() {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [henStats, setHenStats] = useState<HenStats[]>([]);
  const [hens, setHens] = useState<Hen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [isPremium, setIsPremium] = useState(false);
  
  // Chart data
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [chartMax, setChartMax] = useState(10);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sv-SE', { 
      style: 'currency', 
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get premium status
      const premiumRes = await fetch('/api/premium/status', { credentials: 'include' });
      if (premiumRes.ok) {
        const data = await premiumRes.json();
        setIsPremium(data.is_premium);
      }
      
      // Get month stats and hens
      const [statsRes, hensRes] = await Promise.all([
        fetch(`/api/statistics/month/${year}/${month}`, { credentials: 'include' }),
        fetch('/api/hens', { credentials: 'include' })
      ]);
      
      if (!statsRes.ok) {
        throw new Error('Kunde inte ladda statistik');
      }
      
      const statsData = await statsRes.json();
      setStats(statsData);
      
      // Build chart data from daily breakdown
      if (statsData.daily_breakdown && statsData.daily_breakdown.length > 0) {
        const days = statsData.daily_breakdown;
        // Take last 14 days or all if less
        const recentDays = days.slice(-14);
        const chartItems = recentDays.map((d: { date: string; eggs: number }) => ({
          label: format(new Date(d.date), 'd', { locale: sv }),
          value: d.eggs
        }));
        setChartData(chartItems);
        setChartMax(Math.max(...chartItems.map((d: { value: number }) => d.value), 1));
      }
      
      if (hensRes.ok) {
        const hensData = await hensRes.json();
        setHens(hensData);
        await loadHenStats(hensData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const loadHenStats = async (hensData: Hen[]) => {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      
      const eggsRes = await fetch(
        `/api/eggs?start_date=${startDate}&end_date=${endDate}&limit=1000`, 
        { credentials: 'include' }
      );
      
      const prevMonth = subMonths(new Date(year, month - 1), 1);
      const prevStart = format(prevMonth, 'yyyy-MM-01');
      const prevEnd = format(endOfMonth(prevMonth), 'yyyy-MM-dd');
      
      const prevEggsRes = await fetch(
        `/api/eggs?start_date=${prevStart}&end_date=${prevEnd}&limit=1000`, 
        { credentials: 'include' }
      );
      
      if (eggsRes.ok) {
        const eggsData: EggRecord[] = await eggsRes.json();
        const prevEggsData: EggRecord[] = prevEggsRes.ok ? await prevEggsRes.json() : [];
        
        const henEggCounts: Record<string, number> = {};
        const prevHenEggCounts: Record<string, number> = {};
        let totalEggs = 0;
        
        eggsData.forEach(egg => {
          if (egg.hen_id) {
            henEggCounts[egg.hen_id] = (henEggCounts[egg.hen_id] || 0) + egg.count;
          }
          totalEggs += egg.count;
        });
        
        prevEggsData.forEach(egg => {
          if (egg.hen_id) {
            prevHenEggCounts[egg.hen_id] = (prevHenEggCounts[egg.hen_id] || 0) + egg.count;
          }
        });
        
        const calculatedHenStats: HenStats[] = hensData.map(hen => {
          const eggs = henEggCounts[hen.id] || 0;
          const prevEggs = prevHenEggCounts[hen.id] || 0;
          const percentage = totalEggs > 0 ? Math.round((eggs / totalEggs) * 100) : 0;
          
          let trend: 'up' | 'down' | 'same' = 'same';
          if (prevEggs > 0) {
            const change = ((eggs - prevEggs) / prevEggs) * 100;
            if (change > 5) trend = 'up';
            else if (change < -5) trend = 'down';
          }
          
          return { hen, eggs, percentage, trend };
        });
        
        calculatedHenStats.sort((a, b) => b.eggs - a.eggs);
        setHenStats(calculatedHenStats);
      }
    } catch (error) {
      console.error('Failed to load hen stats:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    const now = new Date();
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    if (new Date(nextYear, nextMonth - 1) <= now) {
      setMonth(nextMonth);
      setYear(nextYear);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-loading">
          <div className="loading-spinner" />
          <p>Laddar statistik...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="stats-page">
        <div className="stats-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={loadData} className="retry-btn">Försök igen</button>
        </div>
      </div>
    );
  }

  const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: sv });

  return (
    <div className="stats-page">
      {/* Header */}
      <header className="stats-header">
        <h1>Statistik</h1>
      </header>

      {/* Month Navigation */}
      <nav className="month-nav" data-testid="month-navigation">
        <button 
          onClick={goToPrevMonth} 
          className="nav-arrow"
          aria-label="Föregående månad"
        >
          ←
        </button>
        <span className="month-name">{monthName}</span>
        <button 
          onClick={goToNextMonth} 
          className="nav-arrow"
          aria-label="Nästa månad"
        >
          →
        </button>
      </nav>

      {/* View Toggle */}
      <div className="view-toggle" data-testid="view-toggle">
        <button 
          className={viewMode === 'overview' ? 'active' : ''}
          onClick={() => setViewMode('overview')}
        >
          Översikt
        </button>
        <button 
          className={viewMode === 'hens' ? 'active' : ''}
          onClick={() => setViewMode('hens')}
        >
          Per höna
        </button>
        <button 
          className={viewMode === 'chart' ? 'active' : ''}
          onClick={() => setViewMode('chart')}
        >
          Graf
        </button>
      </div>

      {/* Overview View */}
      {viewMode === 'overview' && stats && (
        <section className="stats-overview" data-testid="stats-overview">
          <div className="stat-grid">
            <div className="stat-card" data-testid="stat-eggs">
              <div className="stat-icon">🥚</div>
              <div className="stat-content">
                <span className="stat-value">{stats.total_eggs}</span>
                <span className="stat-label">Totalt ägg</span>
              </div>
            </div>

            <div className="stat-card" data-testid="stat-avg">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <span className="stat-value">{stats.avg_eggs_per_day.toFixed(1)}</span>
                <span className="stat-label">Ägg per dag</span>
              </div>
            </div>

            <div className="stat-card income" data-testid="stat-income">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <span className="stat-value">{formatCurrency(stats.total_sales)}</span>
                <span className="stat-label">Intäkter</span>
              </div>
            </div>

            <div className="stat-card expense" data-testid="stat-expense">
              <div className="stat-icon">💸</div>
              <div className="stat-content">
                <span className="stat-value">{formatCurrency(stats.total_costs)}</span>
                <span className="stat-label">Kostnader</span>
              </div>
            </div>
          </div>

          {/* Net Result - Full Width */}
          <div className={`result-card ${stats.net >= 0 ? 'positive' : 'negative'}`} data-testid="stat-result">
            <div className="result-icon">{stats.net >= 0 ? '📈' : '📉'}</div>
            <div className="result-content">
              <span className="result-value">{formatCurrency(stats.net)}</span>
              <span className="result-label">Resultat denna månad</span>
            </div>
          </div>

          {/* Quick Stats */}
          {stats.eggs_per_hen && (
            <div className="quick-stat">
              <span className="qs-label">Ägg per höna:</span>
              <span className="qs-value">{stats.eggs_per_hen.toFixed(1)}</span>
            </div>
          )}
        </section>
      )}

      {/* Hens View */}
      {viewMode === 'hens' && (
        <section className="hens-overview" data-testid="hens-overview">
          {henStats.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🐔</span>
              <p>Ingen höns-data tillgänglig</p>
              <p className="empty-hint">Registrera dina höns för att se statistik per höna</p>
            </div>
          ) : (
            <div className="hen-list">
              {henStats.map((hs, index) => (
                <div 
                  key={hs.hen.id} 
                  className={`hen-card ${index === 0 ? 'top-producer' : ''}`}
                  data-testid={`hen-stat-${hs.hen.id}`}
                >
                  <div className="hen-rank">
                    {index === 0 ? '🏆' : `${index + 1}`}
                  </div>
                  <div className="hen-info">
                    <span className="hen-name">{hs.hen.name}</span>
                    <span className="hen-breed">{hs.hen.breed || 'Okänd ras'}</span>
                  </div>
                  <div className="hen-stats">
                    <span className="hen-eggs">{hs.eggs} ägg</span>
                    <span className="hen-pct">{hs.percentage}%</span>
                  </div>
                  <TrendBadge trend={hs.trend} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Chart View */}
      {viewMode === 'chart' && (
        <section className="chart-overview" data-testid="chart-overview">
          <div className="chart-card">
            <h3>Äggproduktion senaste 14 dagarna</h3>
            {chartData.length > 0 ? (
              <SimpleBarChart 
                data={chartData} 
                maxValue={chartMax} 
                label="Ägg per dag"
              />
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📊</span>
                <p>Ingen data att visa</p>
                <p className="empty-hint">Börja logga ägg för att se grafer</p>
              </div>
            )}
          </div>

          {/* Premium Charts */}
          {!isPremium && (
            <div className="premium-promo">
              <div className="promo-icon">🔒</div>
              <h4>Fler grafer med Premium</h4>
              <p>Få tillgång till detaljerade analyser, trendgrafer och jämförelser</p>
              <a href="/premium" className="promo-btn">Uppgradera</a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
