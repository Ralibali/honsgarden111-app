import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feed.css';

type FeedType = 'layer_feed' | 'grower_feed' | 'starter_feed' | 'scratch_grain' | 'treats' | 'supplements' | 'other';

interface FeedRecord {
  id: string;
  date: string;
  feed_type: FeedType;
  amount_kg: number;
  cost?: number;
  is_purchase: boolean;
  brand?: string;
  notes?: string;
}

interface FeedInventory {
  feed_type: FeedType;
  current_stock_kg: number;
  low_stock_threshold_kg: number;
  brand?: string;
}

interface FeedStats {
  total_consumed_kg: number;
  total_purchased_kg: number;
  total_cost: number;
  daily_consumption_avg_kg: number;
  feed_per_hen_per_day_g: number;
  hen_count: number;
}

const FEED_TYPES: { value: FeedType; label: string }[] = [
  { value: 'layer_feed', label: 'Värpfoder' },
  { value: 'grower_feed', label: 'Tillväxtfoder' },
  { value: 'starter_feed', label: 'Startfoder' },
  { value: 'scratch_grain', label: 'Korn/vete' },
  { value: 'treats', label: 'Godis' },
  { value: 'supplements', label: 'Tillskott' },
  { value: 'other', label: 'Övrigt' },
];

export default function Feed() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [inventory, setInventory] = useState<FeedInventory[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isPurchase, setIsPurchase] = useState(false);
  const [feedType, setFeedType] = useState<FeedType>('layer_feed');
  const [amountKg, setAmountKg] = useState('');
  const [cost, setCost] = useState('');
  const [brand, setBrand] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Check premium status on mount
  useEffect(() => {
    const checkPremium = async () => {
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
    checkPremium();
  }, []);
  
  const loadData = useCallback(async () => {
    try {
      const [recordsRes, inventoryRes, statsRes] = await Promise.all([
        fetch('/api/feed?limit=50', { credentials: 'include' }),
        fetch('/api/feed/inventory', { credentials: 'include' }),
        fetch('/api/feed/statistics?days=30', { credentials: 'include' }),
      ]);
      
      if (recordsRes.ok) setRecords(await recordsRes.json());
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        setInventory(data.inventory || []);
        setLowStockAlerts(data.low_stock_alerts || []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to load feed data:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleSubmit = async () => {
    const amount = parseFloat(amountKg);
    if (isNaN(amount) || amount <= 0) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          feed_type: feedType,
          amount_kg: amount,
          cost: cost ? parseFloat(cost) : undefined,
          is_purchase: isPurchase,
          brand: brand || undefined,
        }),
      });
      
      if (res.ok) {
        setShowModal(false);
        setAmountKg('');
        setCost('');
        setBrand('');
        loadData();
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Ta bort denna post?')) return;
    try {
      await fetch(`/api/feed/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };
  
  const getFeedTypeLabel = (type: FeedType) => {
    return FEED_TYPES.find(f => f.value === type)?.label || type;
  };
  
  if (loading) {
    return <div className="feed-page loading">Laddar...</div>;
  }
  
  return (
    <div className="feed-page">
      <header className="feed-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Tillbaka
        </button>
        <h1>Foderhantering</h1>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          + Lägg till
        </button>
      </header>
      
      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="alert-card">
          <h3>⚠️ Lågt lager</h3>
          {lowStockAlerts.map((alert, i) => (
            <p key={i}>{getFeedTypeLabel(alert.feed_type)}: {alert.current_stock_kg.toFixed(1)} kg kvar</p>
          ))}
        </div>
      )}
      
      {/* Statistics */}
      {stats && (
        <div className="stats-card">
          <h2>📊 Senaste 30 dagarna</h2>
          <div className="stats-grid">
            <div className="stat">
              <span className="value">{stats.daily_consumption_avg_kg.toFixed(2)}</span>
              <span className="label">kg/dag</span>
            </div>
            <div className="stat">
              <span className="value">{stats.feed_per_hen_per_day_g}</span>
              <span className="label">g/höna/dag</span>
            </div>
            <div className="stat">
              <span className="value">{stats.total_cost.toFixed(0)}</span>
              <span className="label">kr totalt</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Inventory */}
      {inventory.length > 0 && (
        <div className="section">
          <h2>📦 Lager</h2>
          <div className="inventory-list">
            {inventory.map((item) => (
              <div key={item.feed_type} className={`inventory-item ${item.current_stock_kg <= item.low_stock_threshold_kg ? 'low' : ''}`}>
                <span className="name">{getFeedTypeLabel(item.feed_type)}</span>
                <span className="amount">{item.current_stock_kg.toFixed(1)} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Records */}
      <div className="section">
        <h2>📝 Senaste registreringar</h2>
        {records.length === 0 ? (
          <p className="empty">Inga registreringar ännu</p>
        ) : (
          <div className="records-list">
            {records.map((record) => (
              <div key={record.id} className={`record-item ${record.is_purchase ? 'purchase' : 'consume'}`}>
                <div className="record-icon">
                  {record.is_purchase ? '🛒' : '🍽️'}
                </div>
                <div className="record-info">
                  <span className="type">{getFeedTypeLabel(record.feed_type)}</span>
                  <span className="date">{new Date(record.date).toLocaleDateString('sv-SE')}</span>
                </div>
                <div className="record-values">
                  <span className="amount">{record.amount_kg} kg</span>
                  {record.cost && <span className="cost">{record.cost} kr</span>}
                </div>
                <button className="delete-btn" onClick={() => handleDelete(record.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Registrera foder</h2>
            
            <div className="type-toggle">
              <button
                className={!isPurchase ? 'active' : ''}
                onClick={() => setIsPurchase(false)}
              >
                🍽️ Förbrukning
              </button>
              <button
                className={isPurchase ? 'active' : ''}
                onClick={() => setIsPurchase(true)}
              >
                🛒 Inköp
              </button>
            </div>
            
            <label>Fodertyp</label>
            <select value={feedType} onChange={e => setFeedType(e.target.value as FeedType)}>
              {FEED_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
            
            <label>Mängd (kg)</label>
            <input
              type="number"
              value={amountKg}
              onChange={e => setAmountKg(e.target.value)}
              placeholder="0.0"
              step="0.1"
            />
            
            {isPurchase && (
              <>
                <label>Kostnad (kr)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0"
                />
                
                <label>Märke (valfritt)</label>
                <input
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="T.ex. Granngården"
                />
              </>
            )}
            
            <div className="modal-buttons">
              <button className="cancel" onClick={() => setShowModal(false)}>Avbryt</button>
              <button className="save" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
