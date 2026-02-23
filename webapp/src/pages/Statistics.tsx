import React, { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
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
}

interface HenStats {
  hen: Hen;
  eggs: number;
  percentage: number;
  trend: 'up' | 'down' | 'same';
}

export default function Statistics() {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [henStats, setHenStats] = useState<HenStats[]>([]);
  const [hens, setHens] = useState<Hen[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'overview' | 'hens'>('overview');
  
  useEffect(() => {
    loadData();
  }, [year, month]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Get current month stats
      const [statsRes, hensRes, eggsRes, prevEggsRes] = await Promise.all([
        fetch(`/api/statistics/month/${year}/${month}`, { credentials: 'include' }),
        fetch('/api/hens', { credentials: 'include' }),
        fetch(`/api/eggs?start_date=${year}-${String(month).padStart(2, '0')}-01&end_date=${year}-${String(month).padStart(2, '0')}-31&limit=1000`, { credentials: 'include' }),
        // Get previous month for trend comparison
        fetch(`/api/eggs?start_date=${getPrevMonthStart()}&end_date=${getPrevMonthEnd()}&limit=1000`, { credentials: 'include' })
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      
      if (hensRes.ok) {
        const hensData = await hensRes.json();
        setHens(hensData);
        
        // Calculate hen stats if we have eggs data
        if (eggsRes.ok) {
          const eggsData = await eggsRes.json();
          const prevEggsData = prevEggsRes.ok ? await prevEggsRes.json() : [];
          
          const henEggCounts: Record<string, number> = {};
          const prevHenEggCounts: Record<string, number> = {};
          let totalEggs = 0;
          
          // Count eggs per hen for current month
          eggsData.forEach((egg: { hen_id?: string; count: number }) => {
            if (egg.hen_id) {
              henEggCounts[egg.hen_id] = (henEggCounts[egg.hen_id] || 0) + egg.count;
            }
            totalEggs += egg.count;
          });
          
          // Count eggs per hen for previous month
          prevEggsData.forEach((egg: { hen_id?: string; count: number }) => {
            if (egg.hen_id) {
              prevHenEggCounts[egg.hen_id] = (prevHenEggCounts[egg.hen_id] || 0) + egg.count;
            }
          });
          
          // Build hen stats
          const calculatedHenStats: HenStats[] = hensData.map((hen: Hen) => {
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
          
          // Sort by eggs count
          calculatedHenStats.sort((a, b) => b.eggs - a.eggs);
          setHenStats(calculatedHenStats);
        }
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getPrevMonthStart = () => {
    const prev = subMonths(new Date(year, month - 1, 1), 1);
    return format(prev, 'yyyy-MM-01');
  };
  
  const getPrevMonthEnd = () => {
    const prev = subMonths(new Date(year, month - 1, 1), 1);
    const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
    return format(new Date(prev.getFullYear(), prev.getMonth(), lastDay), 'yyyy-MM-dd');
  };
  
  const goPrev = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };
  
  const goNext = () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };
  
  const formatCurrency = (n: number) => 
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
  
  const getMonthName = (m: number) => {
    const date = new Date(2024, m - 1, 1);
    return format(date, 'MMMM', { locale: sv });
  };
  
  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };
  
  const getTrendText = (trend: 'up' | 'down' | 'same', eggs: number) => {
    const avg = henStats.length > 0 ? henStats.reduce((sum, h) => sum + h.eggs, 0) / henStats.length : 0;
    const diff = eggs - avg;
    const diffPercent = avg > 0 ? Math.round((diff / avg) * 100) : 0;
    
    if (diffPercent > 10) return `${diffPercent}% över snittet!`;
    if (diffPercent < -10) return `${Math.abs(diffPercent)}% under snittet`;
    return 'Nära snittet';
  };
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  const maxEggs = stats ? Math.max(...stats.daily_breakdown.map(d => d.eggs), 1) : 1;
  
  return (
    <div className="statistics-page" data-testid="statistics-page">
      <header className="page-header">
        <h1>Statistik</h1>
      </header>
      
      <div className="period-nav">
        <button onClick={goPrev} className="nav-btn" data-testid="prev-month-btn">‹</button>
        <span className="period-text">{getMonthName(month)} {year}</span>
        <button onClick={goNext} className="nav-btn" data-testid="next-month-btn">›</button>
      </div>
      
      {/* Tab navigation */}
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          data-testid="tab-overview"
        >
          📊 Översikt
        </button>
        <button 
          className={`tab-btn ${activeTab === 'hens' ? 'active' : ''}`}
          onClick={() => setActiveTab('hens')}
          data-testid="tab-hens"
        >
          🐔 Per höna
        </button>
      </div>
      
      {activeTab === 'overview' && stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card" data-testid="total-eggs-stat">
              <span className="stat-icon">🥚</span>
              <span className="stat-value">{stats.total_eggs}</span>
              <span className="stat-label">Totalt ägg</span>
            </div>
            <div className="stat-card" data-testid="avg-eggs-stat">
              <span className="stat-icon">📊</span>
              <span className="stat-value">{stats.avg_eggs_per_day}</span>
              <span className="stat-label">Snitt/dag</span>
            </div>
            {stats.eggs_per_hen && (
              <div className="stat-card" data-testid="eggs-per-hen-stat">
                <span className="stat-icon">🐔</span>
                <span className="stat-value">{stats.eggs_per_hen}</span>
                <span className="stat-label">Ägg/höna</span>
              </div>
            )}
          </div>
          
          <div className="card finance-card">
            <h3>Ekonomi</h3>
            <div className="finance-row">
              <div className="finance-item">
                <span className="finance-label">Kostnader</span>
                <span className="finance-value cost">-{formatCurrency(stats.total_costs)}</span>
              </div>
              <div className="finance-item">
                <span className="finance-label">Försäljning</span>
                <span className="finance-value income">+{formatCurrency(stats.total_sales)}</span>
              </div>
              <div className="finance-item">
                <span className="finance-label">Netto</span>
                <span className={`finance-value ${stats.net >= 0 ? 'income' : 'cost'}`}>
                  {stats.net >= 0 ? '+' : ''}{formatCurrency(stats.net)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="card chart-card">
            <h3>Daglig äggproduktion</h3>
            {stats.daily_breakdown.length === 0 ? (
              <div className="empty-chart">
                <span>🥚</span>
                <p>Ingen data för denna period</p>
              </div>
            ) : (
              <div className="bar-chart">
                {stats.daily_breakdown.slice().reverse().map(day => (
                  <div key={day.date} className="bar-container">
                    <span className="bar-value">{day.eggs}</span>
                    <div className="bar-wrapper">
                      <div 
                        className="bar" 
                        style={{ height: `${Math.max((day.eggs / maxEggs) * 100, 4)}%` }}
                      />
                    </div>
                    <span className="bar-label">{day.date.split('-')[2]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      
      {activeTab === 'hens' && (
        <div className="hen-stats-section" data-testid="hen-stats-section">
          {hens.length === 0 ? (
            <div className="empty-state">
              <span>🐔</span>
              <h3>Inga hönor registrerade</h3>
              <p>Lägg till dina hönor för att se individuell statistik</p>
            </div>
          ) : henStats.every(h => h.eggs === 0) ? (
            <div className="empty-state">
              <span>🥚</span>
              <h3>Ingen äggdata för denna månad</h3>
              <p>Registrera ägg och välj vilken höna som la dem</p>
            </div>
          ) : (
            <>
              <div className="hen-leaderboard">
                <h3>🏆 Månadens topplista</h3>
                {henStats.filter(h => h.eggs > 0).map((henStat, index) => (
                  <div key={henStat.hen.id} className={`hen-stat-card ${index === 0 ? 'top' : ''}`} data-testid={`hen-stat-${henStat.hen.id}`}>
                    <div className="hen-stat-rank">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div className="hen-stat-avatar">🐔</div>
                    <div className="hen-stat-info">
                      <span className="hen-stat-name">{henStat.hen.name}</span>
                      {henStat.hen.breed && <span className="hen-stat-breed">{henStat.hen.breed}</span>}
                    </div>
                    <div className="hen-stat-data">
                      <span className="hen-stat-eggs">{henStat.eggs} ägg</span>
                      <span className="hen-stat-percentage">{henStat.percentage}% av totalt</span>
                    </div>
                    <div className="hen-stat-trend">
                      <span className="trend-icon">{getTrendIcon(henStat.trend)}</span>
                      <span className="trend-text">{getTrendText(henStat.trend, henStat.eggs)}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Hens with no eggs this month */}
              {henStats.filter(h => h.eggs === 0).length > 0 && (
                <div className="inactive-hens">
                  <h4>Inga ägg registrerade denna månad:</h4>
                  <div className="inactive-hen-list">
                    {henStats.filter(h => h.eggs === 0).map(henStat => (
                      <span key={henStat.hen.id} className="inactive-hen-badge">
                        🐔 {henStat.hen.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
