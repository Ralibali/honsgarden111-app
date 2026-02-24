import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './DataLimitsBanner.css';

interface DataLimits {
  is_premium: boolean;
  data_limit_days: number | null;
  oldest_allowed_date: string | null;
  data_at_risk: {
    total: number;
    eggs: number;
    transactions: number;
    health_logs: number;
  } | null;
  upcoming_deletion: {
    within_7_days: number;
    eggs: number;
    transactions: number;
  } | null;
  trial_warning: boolean;
  days_until_expiry: number | null;
  plan: string | null;
  message: string;
}

export default function DataLimitsBanner() {
  const [limits, setLimits] = useState<DataLimits | null>(null);
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const res = await fetch('/api/account/data-limits', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setLimits(data);
        }
      } catch (error) {
        console.error('Failed to fetch data limits:', error);
      }
    };
    
    fetchLimits();
  }, []);
  
  if (!limits || dismissed || limits.is_premium) return null;
  
  // Show warning if data will be deleted soon
  const hasUpcomingDeletion = limits.upcoming_deletion && limits.upcoming_deletion.within_7_days > 0;
  const hasDataAtRisk = limits.data_at_risk && limits.data_at_risk.total > 0;
  
  // Only show banner if there's something to warn about
  if (!hasUpcomingDeletion && !hasDataAtRisk) return null;
  
  return (
    <div className={`data-limits-banner ${hasUpcomingDeletion ? 'urgent' : 'warning'}`}>
      <div className="banner-icon">
        {hasUpcomingDeletion ? '⚠️' : '📊'}
      </div>
      <div className="banner-content">
        {hasUpcomingDeletion ? (
          <>
            <h4>Data raderas snart!</h4>
            <p>
              <strong>{limits.upcoming_deletion?.within_7_days} poster</strong> ({limits.upcoming_deletion?.eggs} äggregistreringar, {limits.upcoming_deletion?.transactions} transaktioner) 
              är äldre än {limits.data_limit_days} dagar och kommer att raderas inom 7 dagar.
            </p>
          </>
        ) : (
          <>
            <h4>Gratis-konto: {limits.data_limit_days} dagars historik</h4>
            <p>
              Du har <strong>{limits.data_at_risk?.total} poster</strong> som är för gamla och kommer att raderas.
              Uppgradera till Premium för obegränsad historik!
            </p>
          </>
        )}
        <div className="banner-actions">
          <Link to="/premium" className="upgrade-btn">
            🌟 Uppgradera till Premium
          </Link>
          <button onClick={() => setDismissed(true)} className="dismiss-btn">
            Avfärda
          </button>
        </div>
      </div>
    </div>
  );
}
