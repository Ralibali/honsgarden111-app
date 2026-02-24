import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ProductivityAlerts.css';

interface HenAlert {
  hen_id: string;
  hen_name: string;
  breed?: string;
  flock_id?: string;
  last_egg_date: string | null;
  days_since_egg: number | null;
  alert_level: 'medium' | 'high';
}

interface ProductivityData {
  total_alerts: number;
  hens_with_issues: HenAlert[];
  threshold_days: number;
}

interface Props {
  flocks?: { id: string; name: string }[];
}

export default function ProductivityAlerts({ flocks = [] }: Props) {
  const [data, setData] = useState<ProductivityData | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/hens/productivity-alerts', { credentials: 'include' });
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch productivity alerts:', error);
      }
    };
    
    fetchAlerts();
  }, []);
  
  if (!data || data.total_alerts === 0) return null;
  
  const getFlockName = (flockId?: string) => {
    if (!flockId) return null;
    const flock = flocks.find(f => f.id === flockId);
    return flock?.name || null;
  };
  
  return (
    <div className="productivity-alerts">
      <div className="alerts-header" onClick={() => setExpanded(!expanded)}>
        <div className="alerts-icon">🥚</div>
        <div className="alerts-info">
          <h4>Produktivitetsvarning</h4>
          <p>
            <strong>{data.total_alerts} {data.total_alerts === 1 ? 'höna' : 'hönor'}</strong> har 
            inte värpt på {data.threshold_days}+ dagar
          </p>
        </div>
        <button className="expand-btn">
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      
      {expanded && (
        <div className="alerts-list">
          {data.hens_with_issues.map(alert => (
            <Link 
              key={alert.hen_id} 
              to={`/hens/${alert.hen_id}`}
              className={`alert-item ${alert.alert_level}`}
            >
              <div className="alert-avatar">🐔</div>
              <div className="alert-details">
                <span className="alert-name">{alert.hen_name}</span>
                {alert.breed && <span className="alert-breed">{alert.breed}</span>}
                {getFlockName(alert.flock_id) && (
                  <span className="alert-flock">{getFlockName(alert.flock_id)}</span>
                )}
              </div>
              <div className="alert-status">
                {alert.days_since_egg ? (
                  <span className="days-count">{alert.days_since_egg} dagar</span>
                ) : (
                  <span className="days-count never">Aldrig värpt</span>
                )}
                <span className="alert-label">sedan senaste ägg</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
