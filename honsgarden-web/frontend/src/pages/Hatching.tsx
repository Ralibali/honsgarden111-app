import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Hatching.css';

interface Hen {
  id: string;
  name: string;
}

interface HatchingRecord {
  id: string;
  start_date: string;
  expected_hatch_date: string;
  egg_count: number;
  hen_id?: string;
  hen_name?: string;
  breed?: string;
  notes?: string;
  is_active: boolean;
  hatched_count?: number;
  failed_count?: number;
  completed_date?: string;
}

export default function Hatching() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<HatchingRecord[]>([]);
  const [hens, setHens] = useState<Hen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HatchingRecord | null>(null);
  
  // Form state
  const [eggCount, setEggCount] = useState('');
  const [henId, setHenId] = useState('');
  const [breed, setBreed] = useState('');
  const [notes, setNotes] = useState('');
  const [hatchedCount, setHatchedCount] = useState('');
  const [saving, setSaving] = useState(false);
  
  const loadData = useCallback(async () => {
    try {
      const [hatchingRes, hensRes] = await Promise.all([
        fetch('/api/hatching?include_completed=false', { credentials: 'include' }),
        fetch('/api/hens?active_only=true', { credentials: 'include' }),
      ]);
      
      if (hatchingRes.ok) setRecords(await hatchingRes.json());
      if (hensRes.ok) setHens(await hensRes.json());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const calculateDaysLeft = (expectedDate: string) => {
    const today = new Date();
    const expected = new Date(expectedDate);
    const diff = Math.ceil((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };
  
  const handleStartHatching = async () => {
    const count = parseInt(eggCount);
    if (isNaN(count) || count <= 0) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/hatching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          egg_count: count,
          hen_id: henId || undefined,
          breed: breed || undefined,
          notes: notes || undefined,
        }),
      });
      
      if (res.ok) {
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error('Failed to start hatching:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleComplete = async () => {
    if (!selectedRecord) return;
    const hatched = parseInt(hatchedCount) || 0;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/hatching/${selectedRecord.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hatched_count: hatched,
          failed_count: selectedRecord.egg_count - hatched,
        }),
      });
      
      if (res.ok) {
        setShowCompleteModal(false);
        setSelectedRecord(null);
        setHatchedCount('');
        loadData();
      }
    } catch (error) {
      console.error('Failed to complete hatching:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Ta bort denna kläckning?')) return;
    try {
      await fetch(`/api/hatching/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };
  
  const resetForm = () => {
    setShowAddModal(false);
    setEggCount('');
    setHenId('');
    setBreed('');
    setNotes('');
  };
  
  if (loading) {
    return <div className="hatching-page loading">Laddar...</div>;
  }
  
  return (
    <div className="hatching-page">
      <header className="hatching-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Tillbaka
        </button>
        <h1>🐣 Kläckning</h1>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          + Ny kläckning
        </button>
      </header>
      
      {records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🥚</div>
          <h2>Ingen pågående kläckning</h2>
          <p>Starta en ny kläckning för att spåra dina ägg genom hela processen.</p>
          <button className="start-btn" onClick={() => setShowAddModal(true)}>
            Starta kläckning
          </button>
        </div>
      ) : (
        <div className="hatching-list">
          {records.map((record) => {
            const daysLeft = calculateDaysLeft(record.expected_hatch_date);
            const progress = Math.min(100, Math.max(0, (21 - daysLeft) / 21 * 100));
            
            return (
              <div key={record.id} className="hatching-card">
                <div className="hatching-header-row">
                  <div className="egg-count">
                    <span className="count">{record.egg_count}</span>
                    <span className="label">ägg</span>
                  </div>
                  <div className="days-info">
                    {daysLeft > 0 ? (
                      <>
                        <span className="days">{daysLeft}</span>
                        <span className="label">dagar kvar</span>
                      </>
                    ) : daysLeft === 0 ? (
                      <span className="hatch-day">🐣 Kläckningsdag!</span>
                    ) : (
                      <span className="overdue">⚠️ {Math.abs(daysLeft)} dagar över</span>
                    )}
                  </div>
                </div>
                
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                
                <div className="hatching-details">
                  {record.hen_name && (
                    <div className="detail">
                      <span className="icon">🐔</span>
                      <span>{record.hen_name}</span>
                    </div>
                  )}
                  {record.breed && (
                    <div className="detail">
                      <span className="icon">🏷️</span>
                      <span>{record.breed}</span>
                    </div>
                  )}
                  <div className="detail">
                    <span className="icon">📅</span>
                    <span>Startad {new Date(record.start_date).toLocaleDateString('sv-SE')}</span>
                  </div>
                  <div className="detail">
                    <span className="icon">🎯</span>
                    <span>Förväntad {new Date(record.expected_hatch_date).toLocaleDateString('sv-SE')}</span>
                  </div>
                </div>
                
                <div className="hatching-actions">
                  <button 
                    className="complete-btn"
                    onClick={() => {
                      setSelectedRecord(record);
                      setShowCompleteModal(true);
                    }}
                  >
                    ✅ Avsluta
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(record.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🥚 Starta ny kläckning</h2>
            
            <label>Antal ägg *</label>
            <input
              type="number"
              value={eggCount}
              onChange={e => setEggCount(e.target.value)}
              placeholder="12"
              min="1"
            />
            
            {hens.length > 0 && (
              <>
                <label>Från vilken höna? (valfritt)</label>
                <select value={henId} onChange={e => setHenId(e.target.value)}>
                  <option value="">Välj höna...</option>
                  {hens.map(hen => (
                    <option key={hen.id} value={hen.id}>{hen.name}</option>
                  ))}
                </select>
              </>
            )}
            
            <label>Ras (valfritt)</label>
            <input
              type="text"
              value={breed}
              onChange={e => setBreed(e.target.value)}
              placeholder="T.ex. Brahma"
            />
            
            <label>Anteckningar (valfritt)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Eventuella anteckningar..."
              rows={3}
            />
            
            <div className="modal-buttons">
              <button className="cancel" onClick={resetForm}>Avbryt</button>
              <button 
                className="save" 
                onClick={handleStartHatching}
                disabled={!eggCount || saving}
              >
                {saving ? 'Sparar...' : 'Starta kläckning'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Complete Modal */}
      {showCompleteModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🐣 Avsluta kläckning</h2>
            <p>Hur många av de {selectedRecord.egg_count} äggen kläcktes?</p>
            
            <label>Antal kläckta kycklingar</label>
            <input
              type="number"
              value={hatchedCount}
              onChange={e => setHatchedCount(e.target.value)}
              placeholder="0"
              min="0"
              max={selectedRecord.egg_count}
            />
            
            <div className="complete-summary">
              <div className="summary-item success">
                <span className="icon">🐥</span>
                <span>Kläckta: {hatchedCount || 0}</span>
              </div>
              <div className="summary-item failed">
                <span className="icon">💔</span>
                <span>Misslyckade: {selectedRecord.egg_count - (parseInt(hatchedCount) || 0)}</span>
              </div>
            </div>
            
            <div className="modal-buttons">
              <button className="cancel" onClick={() => setShowCompleteModal(false)}>Avbryt</button>
              <button 
                className="save" 
                onClick={handleComplete}
                disabled={saving}
              >
                {saving ? 'Sparar...' : 'Avsluta kläckning'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
