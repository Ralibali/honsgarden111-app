import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import './HenProfile.css';

interface HealthLog {
  id: string;
  date: string;
  type: string;
  description?: string;
}

interface HenProfile {
  id: string;
  name: string;
  breed?: string;
  color?: string;
  birth_date?: string;
  notes?: string;
  status: string;
  status_date?: string;
  last_seen?: string;
  last_seen_warning_days: number;
  flock_id?: string;
  health_logs: HealthLog[];
  statistics: {
    total_eggs: number;
    eggs_this_week: number;
    eggs_this_month: number;
    weekly_average: number;
    monthly_average: number;
    last_egg_date?: string;
    days_since_egg?: number;
    no_eggs_warning: boolean;
  };
  last_seen_warning: boolean;
  days_since_seen?: number;
  egg_graph_data: Array<{ date: string; count: number }>;
}

const HEALTH_TYPES: Record<string, { label: string; color: string; emoji: string }> = {
  sick: { label: 'Sjuk', color: '#ef4444', emoji: '🤒' },
  molting: { label: 'Ruggning', color: '#f59e0b', emoji: '🪶' },
  vet_visit: { label: 'Veterinärbesök', color: '#6366f1', emoji: '🏥' },
  vaccination: { label: 'Vaccination', color: '#10b981', emoji: '💉' },
  deworming: { label: 'Avmaskning', color: '#8b5cf6', emoji: '💊' },
  injury: { label: 'Skada', color: '#ef4444', emoji: '🩹' },
  recovered: { label: 'Frisk', color: '#22c55e', emoji: '✅' },
  note: { label: 'Anteckning', color: '#64748b', emoji: '📝' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktiv', color: '#4ade80' },
  sold: { label: 'Såld', color: '#f59e0b' },
  deceased: { label: 'Avliden', color: '#ef4444' },
};

export default function HenProfile() {
  const { henId } = useParams();
  const navigate = useNavigate();
  const [hen, setHen] = useState<HenProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthType, setHealthType] = useState('note');
  const [healthDate, setHealthDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [healthDescription, setHealthDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [henId]);

  const loadProfile = async () => {
    try {
      const res = await fetch(`/api/hens/${henId}/profile`, { credentials: 'include' });
      if (res.ok) {
        setHen(await res.json());
      }
    } catch (error) {
      console.error('Failed to load hen profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsSeen = async () => {
    try {
      await fetch(`/api/hens/${henId}/seen`, { method: 'POST', credentials: 'include' });
      await loadProfile();
    } catch (error) {
      alert('Kunde inte uppdatera');
    }
  };

  const saveHealthLog = async () => {
    setSaving(true);
    try {
      await fetch('/api/health-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hen_id: henId,
          date: healthDate,
          type: healthType,
          description: healthDescription || undefined,
        }),
      });
      setShowHealthModal(false);
      setHealthDescription('');
      await loadProfile();
    } catch (error) {
      alert('Kunde inte spara');
    } finally {
      setSaving(false);
    }
  };

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate);
    const today = new Date();
    const months = Math.floor((today.getTime() - birth.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    if (months < 12) return `${months} månader`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years} år ${remainingMonths} mån` : `${years} år`;
  };

  if (loading) {
    return <div className="hen-profile-page"><div className="loading">Laddar...</div></div>;
  }

  if (!hen) {
    return <div className="hen-profile-page"><div className="error">Höna hittades inte</div></div>;
  }

  const maxEgg = Math.max(...hen.egg_graph_data.map(d => d.count), 1);

  return (
    <div className="hen-profile-page">
      <header className="profile-header">
        <button className="back-btn" onClick={() => navigate('/hens')}>← Tillbaka</button>
        <h1>{hen.name}</h1>
        <span className={`status-badge status-${hen.status}`}>
          {STATUS_LABELS[hen.status]?.label || hen.status}
        </span>
      </header>

      {/* Warning Banners */}
      {hen.last_seen_warning && (
        <div className="warning-banner last-seen-warning">
          <span>⚠️ {hen.name} har inte setts på {hen.days_since_seen} dagar!</span>
          <button onClick={markAsSeen}>Markera som sedd</button>
        </div>
      )}
      
      {hen.statistics.no_eggs_warning && (
        <div className="warning-banner no-eggs-warning">
          <span>🥚 {hen.name} har inte lagt ägg på {hen.statistics.days_since_egg}+ dagar</span>
        </div>
      )}

      {/* Basic Info Card */}
      <div className="card info-card">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Ras</span>
            <span className="info-value">{hen.breed || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Färg</span>
            <span className="info-value">{hen.color || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Ålder</span>
            <span className="info-value">{hen.birth_date ? calculateAge(hen.birth_date) : '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Senast sedd</span>
            <span className="info-value">
              {hen.last_seen || 'Aldrig'}
              {!hen.last_seen_warning && (
                <button className="seen-btn" onClick={markAsSeen}>✓ Sedd idag</button>
              )}
            </span>
          </div>
        </div>
        {hen.notes && <p className="hen-notes">{hen.notes}</p>}
      </div>

      {/* Statistics Card */}
      <div className="card stats-card">
        <h2>📊 Produktivitet</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{hen.statistics.total_eggs}</span>
            <span className="stat-label">Totalt ägg</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{hen.statistics.eggs_this_week}</span>
            <span className="stat-label">Denna vecka</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{hen.statistics.eggs_this_month}</span>
            <span className="stat-label">Denna månad</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{hen.statistics.weekly_average}</span>
            <span className="stat-label">Snitt/vecka</span>
          </div>
        </div>
        
        {/* Egg Graph */}
        <div className="egg-graph">
          <h3>Ägg senaste 30 dagarna</h3>
          <div className="graph-container">
            {hen.egg_graph_data.map((d, i) => (
              <div key={i} className="graph-bar-container">
                <div 
                  className="graph-bar" 
                  style={{ height: `${(d.count / maxEgg) * 100}%` }}
                  title={`${d.date}: ${d.count} ägg`}
                />
              </div>
            ))}
          </div>
          <div className="graph-labels">
            <span>30d sedan</span>
            <span>Idag</span>
          </div>
        </div>
      </div>

      {/* Health Timeline */}
      <div className="card timeline-card">
        <div className="timeline-header">
          <h2>🩺 Hälsohistorik</h2>
          <button className="add-health-btn" onClick={() => setShowHealthModal(true)}>
            + Ny anteckning
          </button>
        </div>
        
        {hen.health_logs.length === 0 ? (
          <p className="no-data">Ingen hälsohistorik ännu</p>
        ) : (
          <div className="timeline">
            {hen.health_logs.map((log) => {
              const typeInfo = HEALTH_TYPES[log.type] || HEALTH_TYPES.note;
              return (
                <div key={log.id} className="timeline-item" style={{ borderLeftColor: typeInfo.color }}>
                  <div className="timeline-date">
                    {format(new Date(log.date), 'd MMM yyyy', { locale: sv })}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-type">
                      {typeInfo.emoji} {typeInfo.label}
                    </span>
                    {log.description && <p className="timeline-desc">{log.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Health Modal */}
      {showHealthModal && (
        <div className="modal-overlay" onClick={() => setShowHealthModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🩺 Ny hälsoanteckning</h2>
            <p>Registrera observation för {hen.name}</p>
            
            <label>Kategori</label>
            <select value={healthType} onChange={(e) => setHealthType(e.target.value)}>
              {Object.entries(HEALTH_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.emoji} {val.label}</option>
              ))}
            </select>
            
            <label>Datum</label>
            <input
              type="date"
              value={healthDate}
              onChange={(e) => setHealthDate(e.target.value)}
            />
            
            <label>Beskrivning (valfritt)</label>
            <textarea
              value={healthDescription}
              onChange={(e) => setHealthDescription(e.target.value)}
              placeholder="T.ex. symptom, beteende, behandling..."
              rows={3}
            />
            
            <div className="modal-buttons">
              <button onClick={() => setShowHealthModal(false)} className="btn-secondary">Avbryt</button>
              <button onClick={saveHealthLog} disabled={saving} className="btn-primary">
                {saving ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
