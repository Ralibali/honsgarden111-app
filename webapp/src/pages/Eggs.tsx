import React, { useState, useEffect } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import './Eggs.css';

interface EggRecord {
  id: string;
  date: string;
  count: number;
  notes?: string;
}

export default function Eggs() {
  const [records, setRecords] = useState<EggRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eggCount, setEggCount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadRecords();
  }, []);
  
  const loadRecords = async () => {
    try {
      const end = new Date();
      const start = subDays(end, 30);
      const res = await fetch(
        `/api/eggs?start_date=${format(start, 'yyyy-MM-dd')}&end_date=${format(end, 'yyyy-MM-dd')}`,
        { credentials: 'include' }
      );
      if (res.ok) setRecords(await res.json());
    } catch (error) {
      console.error('Failed to load records:', error);
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
          notes: notes || undefined
        })
      });
      await loadRecords();
      setShowModal(false);
      setEggCount('');
      setNotes('');
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
      await loadRecords();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
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
          <span className="summary-value">{records.length}</span>
          <span className="summary-label">Dagar</span>
        </div>
      </div>
      
      <button onClick={() => setShowModal(true)} className="btn-primary add-btn">
        + Lägg till ägg
      </button>
      
      <div className="records-list">
        <h3>Historik</h3>
        {records.length === 0 ? (
          <div className="empty-state">
            <span>🥚</span>
            <p>Inga ägg registrerade ännu</p>
          </div>
        ) : (
          records.map(record => (
            <div key={record.id} className="record-item">
              <div className="record-left">
                <div className="record-icon">🥚</div>
                <div className="record-info">
                  <span className="record-date">
                    {format(parseISO(record.date), 'EEEE d MMMM', { locale: sv })}
                  </span>
                  {record.notes && <span className="record-notes">{record.notes}</span>}
                </div>
              </div>
              <div className="record-right">
                <span className="record-count">{record.count}</span>
                <button onClick={() => handleDelete(record.id)} className="delete-btn">×</button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Lägg till ägg</h2>
            
            <label>Datum</label>
            <div className="date-buttons">
              {last7Days.map(day => (
                <button
                  key={day.date}
                  className={`date-btn ${selectedDate === day.date ? 'active' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  {day.display}
                </button>
              ))}
            </div>
            
            <label>Antal ägg</label>
            <input
              type="number"
              value={eggCount}
              onChange={(e) => setEggCount(e.target.value)}
              placeholder="0"
              min="0"
            />
            
            <label>Anteckningar (valfritt)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. 'Extra stora ägg'"
            />
            
            <div className="modal-buttons">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Avbryt
              </button>
              <button onClick={handleSubmit} disabled={!eggCount || saving} className="btn-primary">
                {saving ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
