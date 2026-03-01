/**
 * WebDashboardOverview Component
 * Compact KPI dashboard - sits at top of page, not a hero/modal
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'God morgon';
    if (hour < 12) return 'God förmiddag';
    if (hour < 18) return 'God eftermiddag';
    return 'God kväll';
  };

  // Swedish date format
  const getSwedishDate = () => {
    const today = new Date();
    const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
    const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                    'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
    return `${days[today.getDay()].charAt(0).toUpperCase() + days[today.getDay()].slice(1)} ${today.getDate()} ${months[today.getMonth()]}`;
  };

  // UI guard for unreasonable values (like 1500% laying percentage)
  const getLayingPercentage = (): string => {
    const henCount = data?.hen_count ?? 0;
    const eggsYesterday = data?.eggs_yesterday ?? 0;
    
    // Guard: no hens or more eggs than hens
    if (henCount <= 0) return '—';
    if (eggsYesterday > henCount) return '—';
    
    const pct = Math.round((eggsYesterday / henCount) * 100);
    return `${pct}%`;
  };

  if (loading) {
    return (
      <div className="overview-wrapper">
        <div className="overview-loading">
          <span className="loading-dot"></span>
          <span>Laddar...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview-wrapper">
        <div className="overview-error">
          <span>{error}</span>
          <button onClick={loadData} className="retry-btn">Försök igen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="overview-wrapper" data-testid="dashboard-overview">
      {/* Compact Header */}
      <div className="overview-header">
        <div className="overview-greeting">{getGreeting()}</div>
        <div className="overview-title">Min Hönsgård</div>
        <div className="overview-date">{getSwedishDate()}</div>
      </div>

      {/* KPI Grid - Compact cards */}
      <div className="kpi-grid">
        {/* Eggs Yesterday */}
        <div className="kpi-card" data-testid="kpi-eggs-yesterday">
          <div className="kpi-icon-box">🥚</div>
          <div className="kpi-content">
            <div className="kpi-value">{data?.eggs_yesterday ?? 0}</div>
            <div className="kpi-label">ägg igår</div>
          </div>
        </div>

        {/* Hen Count */}
        <div className="kpi-card" data-testid="kpi-hen-count">
          <div className="kpi-icon-box">🐔</div>
          <div className="kpi-content">
            <div className="kpi-value">{data?.hen_count ?? 0}</div>
            <div className="kpi-label">hönor</div>
          </div>
        </div>

        {/* Laying Percentage - with guard */}
        <div className="kpi-card" data-testid="kpi-laying-pct">
          <div className="kpi-icon-box">📈</div>
          <div className="kpi-content">
            <div className="kpi-value">{getLayingPercentage()}</div>
            <div className="kpi-label">värpprocent</div>
          </div>
        </div>

        {/* Eggs This Week */}
        <div className="kpi-card" data-testid="kpi-eggs-week">
          <div className="kpi-icon-box">📅</div>
          <div className="kpi-content">
            <div className="kpi-value">{data?.eggs_this_week ?? 0}</div>
            <div className="kpi-label">denna vecka</div>
          </div>
        </div>

        {/* Monthly Value */}
        <div className="kpi-card kpi-highlight" data-testid="kpi-monthly-value">
          <div className="kpi-icon-box">💰</div>
          <div className="kpi-content">
            <div className="kpi-value kpi-value-success">+{data?.estimated_monthly_value ?? 0} kr</div>
            <div className="kpi-label">estimerat/månad</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-action-row">
        <button 
          className="quick-action-btn primary"
          onClick={() => {
            // Dispatch custom event to open egg modal in parent
            window.dispatchEvent(new CustomEvent('openEggModal'));
          }}
          data-testid="quick-register-egg"
        >
          Registrera ägg
        </button>
        <button 
          className="quick-action-btn secondary"
          onClick={() => navigate('/hens')}
          data-testid="quick-add-hen"
        >
          Lägg till höna
        </button>
      </div>
    </div>
  );
}
