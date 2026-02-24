import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import './Hens.css';

interface Hen {
  id: string;
  name: string;
  breed?: string;
  color?: string;
  birth_date?: string;
  notes?: string;
  is_active: boolean;
}

interface HenStats {
  hen_id: string;
  total_eggs: number;
}

interface HealthLog {
  id: string;
  hen_id: string;
  date: string;
  type: string;
  description?: string;
}

const HEALTH_TYPES = [
  { value: 'sick', label: '🤒 Sjuk', color: '#ef4444' },
  { value: 'molting', label: '🪶 Ruggning', color: '#f59e0b' },
  { value: 'vet_visit', label: '🏥 Veterinärbesök', color: '#6366f1' },
  { value: 'vaccination', label: '💉 Vaccination', color: '#10b981' },
  { value: 'deworming', label: '💊 Avmaskning', color: '#8b5cf6' },
  { value: 'injury', label: '🩹 Skada', color: '#ef4444' },
  { value: 'recovered', label: '✅ Frisk', color: '#22c55e' },
  { value: 'note', label: '📝 Anteckning', color: '#64748b' },
];

export default function Hens() {
  const [hens, setHens] = useState<Hen[]>([]);
  const [henStats, setHenStats] = useState<Record<string, number>>({});
  const [healthLogs, setHealthLogs] = useState<Record<string, HealthLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHen, setEditingHen] = useState<Hen | null>(null);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [color, setColor] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // For adding eggs per hen
  const [addingEggForHen, setAddingEggForHen] = useState<string | null>(null);
  const [eggCount, setEggCount] = useState(1);
  const [savingEgg, setSavingEgg] = useState(false);
  
  // Health log modal
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthHenId, setHealthHenId] = useState<string>('');
  const [healthType, setHealthType] = useState('note');
  const [healthDescription, setHealthDescription] = useState('');
  const [healthDate, setHealthDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [savingHealth, setSavingHealth] = useState(false);
  
  // Expanded hen for health history
  const [expandedHen, setExpandedHen] = useState<string | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [hensRes, eggsRes, logsRes] = await Promise.all([
        fetch('/api/hens', { credentials: 'include' }),
        fetch('/api/eggs?limit=1000', { credentials: 'include' }),
        fetch('/api/health-logs', { credentials: 'include' })
      ]);
      
      if (hensRes.ok) {
        const hensData = await hensRes.json();
        setHens(hensData);
      }
      
      if (eggsRes.ok) {
        const eggsData = await eggsRes.json();
        // Calculate eggs per hen
        const stats: Record<string, number> = {};
        eggsData.forEach((egg: { hen_id?: string; count: number }) => {
          if (egg.hen_id) {
            stats[egg.hen_id] = (stats[egg.hen_id] || 0) + egg.count;
          }
        });
        setHenStats(stats);
      }
      
      if (logsRes.ok) {
        const logs: HealthLog[] = await logsRes.json();
        const logsMap: Record<string, HealthLog[]> = {};
        logs.forEach(log => {
          if (!logsMap[log.hen_id]) logsMap[log.hen_id] = [];
          logsMap[log.hen_id].push(log);
        });
        setHealthLogs(logsMap);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = editingHen ? `/api/hens/${editingHen.id}` : '/api/hens';
      const method = editingHen ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          breed: breed || undefined,
          color: color || undefined,
          birth_date: birthDate || undefined,
          notes: notes || undefined
        })
      });
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Failed to save hen:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleEdit = (hen: Hen) => {
    setEditingHen(hen);
    setName(hen.name);
    setBreed(hen.breed || '');
    setColor(hen.color || '');
    setBirthDate(hen.birth_date || '');
    setNotes(hen.notes || '');
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna höna?')) return;
    try {
      await fetch(`/api/hens/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await loadData();
    } catch (error) {
      console.error('Failed to delete hen:', error);
    }
  };
  
  const handleAddEgg = async (henId: string) => {
    if (eggCount < 1) return;
    setSavingEgg(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await fetch('/api/eggs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          date: today, 
          count: eggCount,
          hen_id: henId
        })
      });
      await loadData();
      setAddingEggForHen(null);
      setEggCount(1);
    } catch (error) {
      console.error('Failed to add egg:', error);
    } finally {
      setSavingEgg(false);
    }
  };
  
  const openHealthModal = (henId: string) => {
    setHealthHenId(henId);
    setHealthType('note');
    setHealthDescription('');
    setHealthDate(format(new Date(), 'yyyy-MM-dd'));
    setShowHealthModal(true);
  };
  
  const handleSaveHealth = async () => {
    if (!healthHenId) return;
    setSavingHealth(true);
    try {
      await fetch('/api/health-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hen_id: healthHenId,
          date: healthDate,
          type: healthType,
          description: healthDescription || undefined
        })
      });
      await loadData();
      setShowHealthModal(false);
    } catch (error) {
      console.error('Failed to save health log:', error);
    } finally {
      setSavingHealth(false);
    }
  };
  
  const getHealthTypeInfo = (type: string) => {
    return HEALTH_TYPES.find(t => t.value === type) || HEALTH_TYPES[7];
  };
  
  const closeModal = () => {
    setShowModal(false);
    setEditingHen(null);
    setName('');
    setBreed('');
    setColor('');
    setBirthDate('');
    setNotes('');
  };
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  return (
    <div className="hens-page" data-testid="hens-page">
      <header className="page-header">
        <h1>Mina Hönor</h1>
        <p>{hens.length} {hens.length === 1 ? 'höna registrerad' : 'hönor registrerade'}</p>
      </header>
      
      <button onClick={() => setShowModal(true)} className="btn-primary add-btn" data-testid="add-hen-btn">
        + Lägg till höna
      </button>
      
      {hens.length === 0 ? (
        <div className="empty-state" data-testid="empty-hens">
          <span>🐔</span>
          <h3>Inga hönor ännu</h3>
          <p>Lägg till dina hönor för att kunna följa deras äggproduktion individuellt!</p>
        </div>
      ) : (
        <div className="hens-grid">
          {hens.map(hen => (
            <div key={hen.id} className="hen-card" data-testid={`hen-card-${hen.id}`}>
              <div className="hen-avatar">🐔</div>
              <h3 className="hen-name">{hen.name}</h3>
              {hen.breed && <span className="hen-breed">{hen.breed}</span>}
              {hen.color && <span className="hen-color">{hen.color}</span>}
              
              <div className="hen-egg-stats">
                <span className="egg-count">{henStats[hen.id] || 0}</span>
                <span className="egg-label">ägg totalt</span>
              </div>
              
              {/* Quick add egg for this hen */}
              {addingEggForHen === hen.id ? (
                <div className="quick-egg-add">
                  <div className="egg-counter">
                    <button 
                      onClick={() => setEggCount(c => Math.max(1, c - 1))}
                      className="counter-btn"
                    >
                      -
                    </button>
                    <span className="counter-value">{eggCount}</span>
                    <button 
                      onClick={() => setEggCount(c => c + 1)}
                      className="counter-btn"
                    >
                      +
                    </button>
                  </div>
                  <div className="egg-add-buttons">
                    <button 
                      onClick={() => { setAddingEggForHen(null); setEggCount(1); }}
                      className="btn-secondary"
                    >
                      Avbryt
                    </button>
                    <button 
                      onClick={() => handleAddEgg(hen.id)}
                      disabled={savingEgg}
                      className="btn-primary"
                    >
                      {savingEgg ? '...' : '🥚 Lägg till'}
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setAddingEggForHen(hen.id)}
                  className="add-egg-btn"
                  data-testid={`add-egg-${hen.id}`}
                >
                  🥚 {hen.name} la ett ägg
                </button>
              )}
              
              {hen.notes && <p className="hen-notes">{hen.notes}</p>}
              
              {/* Health log button */}
              <button 
                onClick={() => openHealthModal(hen.id)}
                className="health-btn"
              >
                🩺 Logga hälsa
              </button>
              
              {/* Recent health logs */}
              {healthLogs[hen.id] && healthLogs[hen.id].length > 0 && (
                <div className="health-summary">
                  <div 
                    className="health-summary-header"
                    onClick={() => setExpandedHen(expandedHen === hen.id ? null : hen.id)}
                  >
                    <span>📋 Hälsohistorik ({healthLogs[hen.id].length})</span>
                    <span className="expand-icon">{expandedHen === hen.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedHen === hen.id && (
                    <div className="health-log-list">
                      {healthLogs[hen.id].slice(0, 5).map(log => {
                        const typeInfo = getHealthTypeInfo(log.type);
                        return (
                          <div key={log.id} className="health-log-item" style={{ borderLeftColor: typeInfo.color }}>
                            <span className="log-type">{typeInfo.label}</span>
                            <span className="log-date">{log.date}</span>
                            {log.description && <p className="log-desc">{log.description}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
              <div className="hen-actions">
                <button onClick={() => handleEdit(hen)} className="edit-btn" data-testid={`edit-hen-${hen.id}`}>
                  Redigera
                </button>
                <button onClick={() => handleDelete(hen.id)} className="delete-btn" data-testid={`delete-hen-${hen.id}`}>
                  Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingHen ? 'Redigera höna' : 'Lägg till höna'}</h2>
            
            <label>Namn *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Greta"
              data-testid="hen-name-input"
            />
            
            <label>Ras (valfritt)</label>
            <input
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="T.ex. Rhode Island Red"
              data-testid="hen-breed-input"
            />
            
            <label>Färg (valfritt)</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="T.ex. Brun"
              data-testid="hen-color-input"
            />
            
            <label>Födelsedatum (valfritt)</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              data-testid="hen-birth-input"
            />
            
            <label>Anteckningar (valfritt)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. Köpt från grannens gård"
              data-testid="hen-notes-input"
            />
            
            <div className="modal-buttons">
              <button onClick={closeModal} className="btn-secondary" data-testid="cancel-hen-btn">Avbryt</button>
              <button onClick={handleSubmit} disabled={!name.trim() || saving} className="btn-primary" data-testid="save-hen-btn">
                {saving ? 'Sparar...' : (editingHen ? 'Uppdatera' : 'Lägg till')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
