import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

interface CoopSettings {
  coop_name: string;
  hen_count: number;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [coop, setCoop] = useState<CoopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [coopName, setCoopName] = useState('');
  const [henCount, setHenCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  useEffect(() => {
    if (coop) {
      setHasChanges(coopName !== coop.coop_name || henCount !== coop.hen_count);
    }
  }, [coopName, henCount, coop]);
  
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/coop', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCoop(data);
        setCoopName(data.coop_name);
        setHenCount(data.hen_count);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/coop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          coop_name: coopName,
          hen_count: henCount
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCoop(data);
        alert('Inställningar sparade!');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Inställningar</h1>
      </header>
      
      {user && (
        <div className="card user-card">
          <h3>Användare</h3>
          <div className="user-info">
            {user.picture && <img src={user.picture} alt={user.name} className="user-avatar" />}
            <div>
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <h3>Hönsgård</h3>
        
        <label>Namn på hönsgården</label>
        <input
          type="text"
          value={coopName}
          onChange={(e) => setCoopName(e.target.value)}
          placeholder="Min Hönsgård"
        />
        
        <label>Antal hönor</label>
        <div className="counter-row">
          <button 
            onClick={() => setHenCount(c => Math.max(0, c - 1))}
            className="counter-btn"
          >
            -
          </button>
          <span className="counter-value">{henCount}</span>
          <button 
            onClick={() => setHenCount(c => c + 1)}
            className="counter-btn"
          >
            +
          </button>
        </div>
        <p className="hint">Uppdatera detta när du får nya hönor eller säljer/förlorar någon.</p>
        
        {hasChanges && (
          <button onClick={handleSave} disabled={saving} className="btn-primary save-btn">
            {saving ? 'Sparar...' : 'Spara ändringar'}
          </button>
        )}
      </div>
      
      <div className="card">
        <h3>Om appen</h3>
        <div className="about-row">
          <span>🥚</span>
          <div>
            <strong>Hönshus Statistik</strong>
            <p>Version 2.0</p>
          </div>
        </div>
        <p className="about-desc">
          En app för att hålla koll på din hönsgård. Följ äggproduktion, kostnader och intäkter.
        </p>
      </div>
      
      <button onClick={logout} className="btn-secondary logout-btn">
        Logga ut
      </button>
    </div>
  );
}
