import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import './Hens.css';

interface Flock {
  id: string;
  name: string;
  description?: string;
}

interface Hen {
  id: string;
  name: string;
  breed?: string;
  color?: string;
  birth_date?: string;
  notes?: string;
  is_active: boolean;
  flock_id?: string;
  status: 'active' | 'sold' | 'deceased';
  status_date?: string;
  last_seen?: string;
  last_seen_warning_days: number;
}

interface HealthLog {
  id: string;
  hen_id: string;
  date: string;
  type: string;
  description?: string;
}

const HEALTH_TYPES = [
  { value: 'sick', label: 'Sjuk', color: '#ef4444', emoji: '🤒' },
  { value: 'molting', label: 'Ruggning', color: '#f59e0b', emoji: '🪶' },
  { value: 'vet_visit', label: 'Veterinärbesök', color: '#6366f1', emoji: '🏥' },
  { value: 'vaccination', label: 'Vaccination', color: '#10b981', emoji: '💉' },
  { value: 'deworming', label: 'Avmaskning', color: '#8b5cf6', emoji: '💊' },
  { value: 'injury', label: 'Skada', color: '#ef4444', emoji: '🩹' },
  { value: 'recovered', label: 'Frisk', color: '#22c55e', emoji: '✅' },
  { value: 'note', label: 'Anteckning', color: '#64748b', emoji: '📝' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktiv', color: '#4ade80', emoji: '🐔' },
  { value: 'sold', label: 'Såld', color: '#f59e0b', emoji: '💰' },
  { value: 'deceased', label: 'Avliden', color: '#ef4444', emoji: '🕊️' },
];

export default function Hens() {
  const navigate = useNavigate();
  const [hens, setHens] = useState<Hen[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [henStats, setHenStats] = useState<Record<string, number>>({});
  const [healthLogs, setHealthLogs] = useState<Record<string, HealthLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHen, setEditingHen] = useState<Hen | null>(null);
  
  // Premium status
  const [isPremium, setIsPremium] = useState(false);
  
  // Flock modal
  const [showFlockModal, setShowFlockModal] = useState(false);
  const [editingFlock, setEditingFlock] = useState<Flock | null>(null);
  const [flockName, setFlockName] = useState('');
  const [flockDescription, setFlockDescription] = useState('');
  
  // Filter
  const [selectedFlock, setSelectedFlock] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  
  // Hen form
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [color, setColor] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [notes, setNotes] = useState('');
  const [henFlockId, setHenFlockId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // Status change modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusHen, setStatusHen] = useState<Hen | null>(null);
  const [newStatus, setNewStatus] = useState<string>('active');
  const [statusDate, setStatusDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
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
    checkPremiumStatus();
  }, [showInactive]);
  
  const checkPremiumStatus = async () => {
    try {
      const res = await fetch('/api/premium/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setIsPremium(data.is_premium);
      }
    } catch (error) {
      console.error('Failed to check premium status:', error);
    }
  };
  
  const loadData = async () => {
    try {
      const [hensRes, flocksRes, eggsRes, logsRes] = await Promise.all([
        fetch(`/api/hens?active_only=${!showInactive}`, { credentials: 'include' }),
        fetch('/api/flocks', { credentials: 'include' }),
        fetch('/api/eggs?limit=1000', { credentials: 'include' }),
        fetch('/api/health-logs', { credentials: 'include' })
      ]);
      
      if (hensRes.ok) {
        const hensData = await hensRes.json();
        setHens(hensData);
      }
      
      if (flocksRes.ok) {
        const flocksData = await flocksRes.json();
        setFlocks(flocksData);
      }
      
      if (eggsRes.ok) {
        const eggsData = await eggsRes.json();
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
          notes: notes || undefined,
          flock_id: henFlockId || undefined
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
    setHenFlockId(hen.flock_id || '');
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
    if (!isPremium) {
      alert('🔒 Premium-funktion\n\nHälsologgen är en Premium-funktion. Uppgradera för att dokumentera dina hönors hälsa.');
      navigate('/premium');
      return;
    }
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
  
  // Flock functions
  const handleSaveFlock = async () => {
    if (!flockName.trim()) return;
    setSaving(true);
    try {
      const url = editingFlock ? `/api/flocks/${editingFlock.id}` : '/api/flocks';
      const method = editingFlock ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: flockName.trim(),
          description: flockDescription || undefined
        })
      });
      await loadData();
      setShowFlockModal(false);
      setFlockName('');
      setFlockDescription('');
      setEditingFlock(null);
    } catch (error) {
      console.error('Failed to save flock:', error);
      alert('Kunde inte spara flocken. Kontrollera om du har Premium för obegränsat antal flockar.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteFlock = async (flockId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna flock? Hönorna kommer att bli utan flock.')) return;
    try {
      await fetch(`/api/flocks/${flockId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await loadData();
      if (selectedFlock === flockId) setSelectedFlock('all');
    } catch (error) {
      console.error('Failed to delete flock:', error);
    }
  };
  
  // Status functions
  const openStatusModal = (hen: Hen) => {
    setStatusHen(hen);
    setNewStatus(hen.status);
    setStatusDate(hen.status_date || format(new Date(), 'yyyy-MM-dd'));
    setShowStatusModal(true);
  };
  
  const handleStatusChange = async () => {
    if (!statusHen) return;
    setSaving(true);
    try {
      await fetch(`/api/hens/${statusHen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          status_date: statusDate,
          is_active: newStatus === 'active'
        })
      });
      await loadData();
      setShowStatusModal(false);
      setStatusHen(null);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleMarkSeen = async (henId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/hens/${henId}/seen`, {
        method: 'POST',
        credentials: 'include'
      });
      await loadData();
    } catch (error) {
      console.error('Failed to mark seen:', error);
    }
  };
  
  const getHealthTypeInfo = (type: string) => {
    return HEALTH_TYPES.find(t => t.value === type) || HEALTH_TYPES[7];
  };
  
  const getFlockName = (flockId?: string) => {
    if (!flockId) return null;
    const flock = flocks.find(f => f.id === flockId);
    return flock?.name || null;
  };
  
  const closeModal = () => {
    setShowModal(false);
    setEditingHen(null);
    setName('');
    setBreed('');
    setColor('');
    setBirthDate('');
    setNotes('');
    setHenFlockId('');
  };
  
  // Calculate last seen warning
  const getLastSeenWarning = (hen: Hen): boolean => {
    if (!hen.last_seen) return true; // Never seen
    const lastSeen = new Date(hen.last_seen);
    const daysSince = Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= (hen.last_seen_warning_days || 3);
  };
  
  // Filter hens
  const filteredHens = hens.filter(hen => {
    if (selectedFlock !== 'all' && selectedFlock !== 'none') {
      if (hen.flock_id !== selectedFlock) return false;
    }
    if (selectedFlock === 'none' && hen.flock_id) return false;
    return true;
  });
  
  // Group hens by flock for display
  const groupedHens = selectedFlock === 'all' ? 
    flocks.reduce((acc, flock) => {
      acc[flock.id] = filteredHens.filter(h => h.flock_id === flock.id);
      return acc;
    }, { none: filteredHens.filter(h => !h.flock_id) } as Record<string, Hen[]>) :
    null;
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  return (
    <div className="hens-page" data-testid="hens-page">
      <header className="page-header">
        <h1>Mina Hönor</h1>
        <p>{hens.length} {hens.length === 1 ? 'höna registrerad' : 'hönor registrerade'}</p>
      </header>
      
      {/* Flocks Section */}
      <section className="flocks-section">
        <div className="flocks-header">
          <h2>Flockar</h2>
          <button onClick={() => { setEditingFlock(null); setFlockName(''); setFlockDescription(''); setShowFlockModal(true); }} className="btn-secondary">
            + Ny flock
          </button>
        </div>
        
        <div className="flock-tabs">
          <button 
            className={`flock-tab ${selectedFlock === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFlock('all')}
          >
            Alla ({hens.length})
          </button>
          {flocks.map(flock => {
            const count = hens.filter(h => h.flock_id === flock.id).length;
            return (
              <button 
                key={flock.id}
                className={`flock-tab ${selectedFlock === flock.id ? 'active' : ''}`}
                onClick={() => setSelectedFlock(flock.id)}
              >
                {flock.name} ({count})
                <span 
                  className="flock-edit" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingFlock(flock);
                    setFlockName(flock.name);
                    setFlockDescription(flock.description || '');
                    setShowFlockModal(true);
                  }}
                >
                  ✏️
                </span>
              </button>
            );
          })}
          <button 
            className={`flock-tab ${selectedFlock === 'none' ? 'active' : ''}`}
            onClick={() => setSelectedFlock('none')}
          >
            Utan flock ({hens.filter(h => !h.flock_id).length})
          </button>
        </div>
      </section>
      
      {/* Filter toggle */}
      <div className="filter-row">
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Visa inaktiva (sålda/avlidna)
        </label>
      </div>
      
      <button onClick={() => setShowModal(true)} className="btn-primary add-btn" data-testid="add-hen-btn">
        + Lägg till höna
      </button>
      
      {filteredHens.length === 0 ? (
        <div className="empty-state" data-testid="empty-hens">
          <span>🐔</span>
          <h3>Inga hönor {selectedFlock !== 'all' ? 'i denna flock' : 'ännu'}</h3>
          <p>Lägg till dina hönor för att kunna följa deras äggproduktion individuellt!</p>
        </div>
      ) : (
        <div className="hens-grid">
          {filteredHens.map(hen => {
            const lastSeenWarning = getLastSeenWarning(hen);
            const statusInfo = STATUS_OPTIONS.find(s => s.value === hen.status);
            
            return (
              <div 
                key={hen.id} 
                className={`hen-card ${hen.status !== 'active' ? 'inactive' : ''} ${lastSeenWarning ? 'warning' : ''}`}
                data-testid={`hen-card-${hen.id}`}
              >
                {/* Status badge */}
                {hen.status !== 'active' && (
                  <div className="status-badge" style={{ backgroundColor: statusInfo?.color }}>
                    {statusInfo?.emoji} {statusInfo?.label}
                    {hen.status_date && <span className="status-date"> ({hen.status_date})</span>}
                  </div>
                )}
                
                {/* Last seen warning */}
                {hen.status === 'active' && lastSeenWarning && (
                  <div className="warning-badge">
                    ⚠️ Ej sedd på länge
                  </div>
                )}
                
                <div className="hen-avatar" onClick={() => navigate(`/hens/${hen.id}`)}>🐔</div>
                <h3 className="hen-name" onClick={() => navigate(`/hens/${hen.id}`)}>{hen.name}</h3>
                {hen.breed && <span className="hen-breed">{hen.breed}</span>}
                {hen.color && <span className="hen-color">{hen.color}</span>}
                
                {/* Flock badge */}
                {getFlockName(hen.flock_id) && (
                  <span className="flock-badge">{getFlockName(hen.flock_id)}</span>
                )}
                
                <div className="hen-egg-stats">
                  <span className="egg-count">{henStats[hen.id] || 0}</span>
                  <span className="egg-label">ägg totalt</span>
                </div>
                
                {/* Last seen */}
                {hen.status === 'active' && (
                  <div className="last-seen-row">
                    <span className="last-seen-label">Senast sedd: {hen.last_seen || 'Aldrig'}</span>
                    <button 
                      className="mark-seen-btn"
                      onClick={(e) => handleMarkSeen(hen.id, e)}
                    >
                      ✓ Sedd idag
                    </button>
                  </div>
                )}
                
                {/* Quick add egg for this hen */}
                {hen.status === 'active' && (
                  addingEggForHen === hen.id ? (
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
                  )
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
                              <span className="log-type">{typeInfo.emoji} {typeInfo.label}</span>
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
                  <button onClick={() => navigate(`/hens/${hen.id}`)} className="view-btn">
                    Profil
                  </button>
                  <button onClick={() => openStatusModal(hen)} className="status-btn">
                    Status
                  </button>
                  <button onClick={() => handleEdit(hen)} className="edit-btn" data-testid={`edit-hen-${hen.id}`}>
                    Redigera
                  </button>
                  <button onClick={() => handleDelete(hen.id)} className="delete-btn" data-testid={`delete-hen-${hen.id}`}>
                    Ta bort
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Add/Edit Hen Modal */}
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
            
            <label>Flock (valfritt)</label>
            <select
              value={henFlockId}
              onChange={(e) => setHenFlockId(e.target.value)}
            >
              <option value="">-- Ingen flock --</option>
              {flocks.map(flock => (
                <option key={flock.id} value={flock.id}>{flock.name}</option>
              ))}
            </select>
            
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
      
      {/* Flock Modal */}
      {showFlockModal && (
        <div className="modal-overlay" onClick={() => setShowFlockModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingFlock ? 'Redigera flock' : 'Skapa ny flock'}</h2>
            
            <label>Namn *</label>
            <input
              type="text"
              value={flockName}
              onChange={(e) => setFlockName(e.target.value)}
              placeholder="T.ex. Hönshus 1"
            />
            
            <label>Beskrivning (valfritt)</label>
            <textarea
              value={flockDescription}
              onChange={(e) => setFlockDescription(e.target.value)}
              placeholder="T.ex. Huvudhönshuset vid ladan"
            />
            
            <div className="modal-buttons">
              {editingFlock && (
                <button 
                  onClick={() => { handleDeleteFlock(editingFlock.id); setShowFlockModal(false); }} 
                  className="btn-danger"
                >
                  Ta bort
                </button>
              )}
              <button onClick={() => setShowFlockModal(false)} className="btn-secondary">Avbryt</button>
              <button onClick={handleSaveFlock} disabled={!flockName.trim() || saving} className="btn-primary">
                {saving ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Modal */}
      {showStatusModal && statusHen && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content status-modal" onClick={e => e.stopPropagation()}>
            <h2>Ändra status för {statusHen.name}</h2>
            <p className="modal-desc">Välj ny status för hönan</p>
            
            <div className="status-options">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`status-option ${newStatus === opt.value ? 'selected' : ''}`}
                  style={{ borderColor: newStatus === opt.value ? opt.color : 'transparent' }}
                  onClick={() => setNewStatus(opt.value)}
                >
                  <span className="status-emoji">{opt.emoji}</span>
                  <span className="status-label">{opt.label}</span>
                </button>
              ))}
            </div>
            
            {newStatus !== 'active' && (
              <>
                <label>Datum</label>
                <input
                  type="date"
                  value={statusDate}
                  onChange={(e) => setStatusDate(e.target.value)}
                />
              </>
            )}
            
            <div className="modal-buttons">
              <button onClick={() => setShowStatusModal(false)} className="btn-secondary">Avbryt</button>
              <button onClick={handleStatusChange} disabled={saving} className="btn-primary">
                {saving ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Health Log Modal */}
      {showHealthModal && (
        <div className="modal-overlay" onClick={() => setShowHealthModal(false)}>
          <div className="modal-content health-modal" onClick={e => e.stopPropagation()}>
            <h2>🩺 Logga hälsa</h2>
            <p className="modal-desc">Registrera hälsoobservation för {hens.find(h => h.id === healthHenId)?.name}</p>
            
            <label>Typ</label>
            <select 
              value={healthType} 
              onChange={(e) => setHealthType(e.target.value)}
            >
              {HEALTH_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.emoji} {type.label}</option>
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
              placeholder="T.ex. Hängande vinge, lite matt..."
              rows={3}
            />
            
            <div className="modal-buttons">
              <button onClick={() => setShowHealthModal(false)} className="btn-secondary">Avbryt</button>
              <button onClick={handleSaveHealth} disabled={savingHealth} className="btn-primary">
                {savingHealth ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
