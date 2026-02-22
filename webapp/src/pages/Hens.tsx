import React, { useState, useEffect } from 'react';
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

export default function Hens() {
  const [hens, setHens] = useState<Hen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [color, setColor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadHens();
  }, []);
  
  const loadHens = async () => {
    try {
      const res = await fetch('/api/hens', { credentials: 'include' });
      if (res.ok) setHens(await res.json());
    } catch (error) {
      console.error('Failed to load hens:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/hens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          breed: breed || undefined,
          color: color || undefined,
          notes: notes || undefined
        })
      });
      await loadHens();
      closeModal();
    } catch (error) {
      console.error('Failed to add hen:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna höna?')) return;
    try {
      await fetch(`/api/hens/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await loadHens();
    } catch (error) {
      console.error('Failed to delete hen:', error);
    }
  };
  
  const closeModal = () => {
    setShowModal(false);
    setName('');
    setBreed('');
    setColor('');
    setNotes('');
  };
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  return (
    <div className="hens-page">
      <header className="page-header">
        <h1>Mina Hönor</h1>
        <p>{hens.length} hönor registrerade</p>
      </header>
      
      <button onClick={() => setShowModal(true)} className="btn-primary add-btn">
        + Lägg till höna
      </button>
      
      {hens.length === 0 ? (
        <div className="empty-state">
          <span>❤️</span>
          <h3>Inga hönor ännu</h3>
          <p>Lägg till dina hönor för att kunna följa deras äggproduktion individuellt!</p>
        </div>
      ) : (
        <div className="hens-grid">
          {hens.map(hen => (
            <div key={hen.id} className="hen-card">
              <div className="hen-avatar">🐔</div>
              <h3 className="hen-name">{hen.name}</h3>
              {hen.breed && <span className="hen-breed">{hen.breed}</span>}
              {hen.color && <span className="hen-color">{hen.color}</span>}
              {hen.notes && <p className="hen-notes">{hen.notes}</p>}
              <button onClick={() => handleDelete(hen.id)} className="delete-btn">
                Ta bort
              </button>
            </div>
          ))}
        </div>
      )}
      
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Lägg till höna</h2>
            
            <label>Namn *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Greta"
            />
            
            <label>Ras (valfritt)</label>
            <input
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="T.ex. Rhode Island Red"
            />
            
            <label>Färg (valfritt)</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="T.ex. Brun"
            />
            
            <label>Anteckningar (valfritt)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. Köpt från grannens gård"
            />
            
            <div className="modal-buttons">
              <button onClick={closeModal} className="btn-secondary">Avbryt</button>
              <button onClick={handleSubmit} disabled={!name.trim() || saving} className="btn-primary">
                {saving ? 'Sparar...' : 'Lägg till'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
