/**
 * WebDashboardOverview Component
 * Persistent KPI dashboard for web (not modal, always visible)
 */

import React, { useState, useEffect } from 'react';
import './WebDashboardOverview.css';

interface YesterdaySummary {
  eggs_yesterday: number;
  hen_count: number;
  laying_percentage: number;
  eggs_this_week: number;
  estimated_monthly_value: number;
  yesterday_date: string;
}

export default function WebDashboardOverview() {
  const [data, setData] = useState<YesterdaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stats/yesterday-summary', {
        credentials: 'include',
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError('Kunde inte ladda data');
      }
    } catch (err) {
      setError('Anslutningsfel');
    } finally {
      setLoading(false);
    }
  };

  // Time-based greeting (client locale)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'God morgon';
    if (hour < 12) return 'God förmiddag';
    if (hour < 18) return 'God eftermiddag';
    return 'God kväll';
  };

  // Format date in Swedish
  const formatDate = (dateStr?: string) => {
    try {
      const date = dateStr ? new Date(dateStr) : new Date();
      const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
      const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                      'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
      
      const dayName = days[date.getDay()];
      const dayNum = date.getDate();
      const monthName = months[date.getMonth()];
      
      return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum} ${monthName}`;
    } catch {
      return 'Idag';
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
    const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                    'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
    return `${days[today.getDay()].charAt(0).toUpperCase() + days[today.getDay()].slice(1)} ${today.getDate()} ${months[today.getMonth()]}`;
  };

  if (loading) {
    return (
      <div className="dashboard-overview loading">
        <div className="loading-spinner"></div>
        <p>Laddar sammanställning...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-overview error">
        <p>{error}</p>
        <button onClick={loadData} className="retry-btn">Försök igen</button>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      {/* Header with greeting */}
      <div className="overview-header">
        <h2 className="greeting">{getGreeting()}! <span className="emoji">🥚</span></h2>
        <p className="date">{getTodayDate()}</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* Eggs Yesterday - Main highlight */}
        <div className="kpi-card main-kpi">
          <div className="kpi-icon-large">🥚</div>
          <div className="kpi-content">
            <span className="kpi-value-large">{data?.eggs_yesterday ?? 0}</span>
            <span className="kpi-label">ägg igår</span>
            <span className="kpi-date">{formatDate(data?.yesterday_date)}</span>
          </div>
        </div>

        {/* Hen Count */}
        <div className="kpi-card">
          <div className="kpi-icon">🐔</div>
          <div className="kpi-content">
            <span className="kpi-value">{data?.hen_count ?? 0}</span>
            <span className="kpi-label">hönor</span>
          </div>
        </div>

        {/* Laying Percentage */}
        <div className="kpi-card">
          <div className="kpi-icon">📈</div>
          <div className="kpi-content">
            <span className="kpi-value">{data?.laying_percentage ?? 0}%</span>
            <span className="kpi-label">värpprocent</span>
          </div>
        </div>

        {/* Eggs This Week */}
        <div className="kpi-card">
          <div className="kpi-icon">📅</div>
          <div className="kpi-content">
            <span className="kpi-value">{data?.eggs_this_week ?? 0}</span>
            <span className="kpi-label">denna vecka</span>
          </div>
        </div>

        {/* Monthly Value */}
        <div className="kpi-card highlight">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <span className="kpi-value success">+{data?.estimated_monthly_value ?? 0} kr</span>
            <span className="kpi-label">estimerat/månad</span>
          </div>
        </div>
      </div>
    </div>
  );
}
