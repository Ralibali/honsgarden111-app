import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
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

export default function Statistics() {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  
  useEffect(() => {
    loadStats();
  }, [year, month]);
  
  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/statistics/month/${year}/${month}`, { credentials: 'include' });
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
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
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  const maxEggs = stats ? Math.max(...stats.daily_breakdown.map(d => d.eggs), 1) : 1;
  
  return (
    <div className="statistics-page">
      <header className="page-header">
        <h1>Statistik</h1>
      </header>
      
      <div className="period-nav">
        <button onClick={goPrev} className="nav-btn">‹</button>
        <span className="period-text">{getMonthName(month)} {year}</span>
        <button onClick={goNext} className="nav-btn">›</button>
      </div>
      
      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">🥚</span>
              <span className="stat-value">{stats.total_eggs}</span>
              <span className="stat-label">Totalt ägg</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📊</span>
              <span className="stat-value">{stats.avg_eggs_per_day}</span>
              <span className="stat-label">Snitt/dag</span>
            </div>
            {stats.eggs_per_hen && (
              <div className="stat-card">
                <span className="stat-icon">❤️</span>
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
    </div>
  );
}
