import React, { useState, useEffect } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import './Eggs.css';

interface EggRecord {
  id: string;
  date: string;
  count: number;
  hen_id?: string;
  notes?: string;
}

interface Hen {
  id: string;
  name: string;
  breed?: string;
  color?: string;
}

export default function Eggs() {
  const [records, setRecords] = useState<EggRecord[]>([]);
  const [hens, setHens] = useState<Hen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eggCount, setEggCount] = useState('');
  const [selectedHen, setSelectedHen] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [recordsRes, hensRes] = await Promise.all([
        fetch(`/api/eggs?start_date=${format(subDays(new Date(), 30), 'yyyy-MM-dd')}&end_date=${format(new Date(), 'yyyy-MM-dd')}`, { credentials: 'include' }),
        fetch('/api/hens', { credentials: 'include' })
      ]);
      if (recordsRes.ok) setRecords(await recordsRes.json());
      if (hensRes.ok) setHens(await hensRes.json());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!eggCount) return;
    setSaving(true);
    try {
      await fetch('/api/eggs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedDate,
          count: parseInt(eggCount),
          hen_id: selectedHen || undefined,
          notes: notes || undefined
        })
      });
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna registrering?')) return;
    try {
      await fetch(`/api/eggs/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };
  
  const closeModal = () => {
    setShowModal(false);
    setEggCount('');
    setSelectedHen('');
    setNotes('');
  };
  
  const getHenName = (henId?: string) => {
    if (!henId) return null;
    const hen = hens.find(h => h.id === henId);
    return hen?.name || 'Okänd höna';
  };
  
  const totalEggs = records.reduce((sum, r) => sum + r.count, 0);
  const avgEggs = records.length > 0 ? (totalEggs / records.length).toFixed(1) : '0';
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: i === 0 ? 'Idag' : i === 1 ? 'Igår' : format(date, 'EEE d', { locale: sv })
    };
  });
  
  // Group records by date for display, but keep individual hen records
  const groupedByDate = records.reduce((acc, record) => {
    const dateKey = record.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(record);
    return acc;
  }, {} as Record<string, EggRecord[]>);
  
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  return (
    <div className="eggs-page">
      <header className="page-header">
        <h1>Ägglogg</h1>
        <p>Håll koll på din äggproduktion</p>
      </header>
      
      <div className="summary-row">
        <div className="summary-card">
          <span className="summary-value">{totalEggs}</span>
          <span className="summary-label">Totalt ägg</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{avgEggs}</span>
          <span className="summary-label">Snitt/dag</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{hens.length}</span>
          <span className="summary-label">Hönor</span>
        </div>
      </div>
      
      <button onClick={() => setShowModal(true)} className="btn-primary add-btn" data-testid="add-egg-btn">
        + Lägg till ägg
      </button>
      
      <div className="records-list">
        <h3>Historik</h3>
        {sortedDates.length === 0 ? (
          <div className="empty-state">
            <span>🥚</span>
            <p>Inga ägg registrerade ännu</p>
          </div>
        ) : (
          sortedDates.map(date => {
            const dayRecords = groupedByDate[date];
            const dayTotal = dayRecords.reduce((sum, r) => sum + r.count, 0);
            
            return (
              <div key={date} className="date-group">
                <div className="date-header">
                  <span className="date-title">
                    {format(parseISO(date), 'EEEE d MMMM', { locale: sv })}
                  </span>
                  <span className="date-total">{dayTotal} ägg</span>
                </div>
                {dayRecords.map(record => (
                  <div key={record.id} className="record-item" data-testid={`egg-record-${record.id}`}>
                    <div className="record-left">
                      <div className="record-icon">🥚</div>
                      <div className="record-info">
                        {record.hen_id ? (
                          <span className="record-hen">
                            <span className="hen-badge">🐔 {getHenName(record.hen_id)}</span>
                          </span>
                        ) : (
                          <span className="record-hen general">Alla hönor</span>
                        )}
                        {record.notes && <span className="record-notes">{record.notes}</span>}
                      </div>
                    </div>
                    <div className="record-right">
                      <span className="record-count">{record.count}</span>
                      <button onClick={() => handleDelete(record.id)} className="delete-btn" data-testid={`delete-egg-${record.id}`}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
      
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Lägg till ägg</h2>
            
            <label>Datum</label>
            <div className="date-buttons">
              {last7Days.map(day => (
                <button
                  key={day.date}
                  className={`date-btn ${selectedDate === day.date ? 'active' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                  data-testid={`date-btn-${day.date}`}
                >
                  {day.display}
                </button>
              ))}
            </div>
            
            {hens.length > 0 && (
              <>
                <label>Vilken höna? (valfritt)</label>
                <div className="hen-selector">
                  <button
                    className={`hen-btn ${selectedHen === '' ? 'active' : ''}`}
                    onClick={() => setSelectedHen('')}
                    data-testid="hen-btn-all"
                  >
                    <span className="hen-icon">🥚</span>
                    <span>Alla hönor</span>
                  </button>
                  {hens.map(hen => (
                    <button
                      key={hen.id}
                      className={`hen-btn ${selectedHen === hen.id ? 'active' : ''}`}
                      onClick={() => setSelectedHen(hen.id)}
                      data-testid={`hen-btn-${hen.id}`}
                    >
                      <span className="hen-icon">🐔</span>
                      <span>{hen.name}</span>
                    </button>
                  ))}
                </div>
                <p className="hint">Välj en höna om du vet vilken som la ägget</p>
              </>
            )}
            
            <label>Antal ägg</label>
            <div className="quick-add-section">
              <div className="quick-buttons">
                {[1, 2, 3, 5, 10].map(num => (
                  <button
                    key={num}
                    className="quick-btn"
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await fetch('/api/eggs', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            date: selectedDate,
                            count: num,
                            hen_id: selectedHen || undefined
                          })
                        });
                        await loadData();
                        closeModal();
                      } catch (error) {
                        console.error('Failed to save:', error);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    data-testid={`quick-add-${num}`}
                  >
                    +{num}
                  </button>
                ))}
              </div>
              <p className="hint">Klicka för snabbregistrering</p>
            </div>
            
            <label>Eller ange eget antal</label>
            <div className="custom-count-row">
              <input
                type="number"
                value={eggCount}
                onChange={(e) => setEggCount(e.target.value)}
                placeholder="Antal"
                min="0"
                className="count-input"
                data-testid="egg-count-input"
              />
              <button 
                onClick={handleSubmit} 
                disabled={!eggCount || saving} 
                className="btn-add"
                data-testid="add-custom-count"
              >
                Lägg till
              </button>
            </div>
            
            <label>Anteckningar (valfritt)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. 'Extra stora ägg'"
              data-testid="egg-notes-input"
            />
            
            <div className="modal-buttons">
              <button onClick={closeModal} className="btn-secondary" data-testid="cancel-egg-btn">
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
