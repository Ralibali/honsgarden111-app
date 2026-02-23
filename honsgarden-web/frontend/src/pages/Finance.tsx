import React, { useState, useEffect } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import './Finance.css';

interface Transaction {
  id: string;
  date: string;
  type: 'cost' | 'sale';
  category: string;
  amount: number;
  description?: string;
}

const COST_CATEGORIES = [
  { value: 'feed', label: 'Foder', icon: '🌾' },
  { value: 'equipment', label: 'Utrustning', icon: '🔧' },
  { value: 'medicine', label: 'Medicin', icon: '💊' },
  { value: 'other_cost', label: 'Övrigt', icon: '📝' },
];

const SALE_CATEGORIES = [
  { value: 'egg_sale', label: 'Äggförsäljning', icon: '🥚' },
  { value: 'hen_sale', label: 'Hönförsäljning', icon: '🐔' },
  { value: 'other_income', label: 'Övrigt', icon: '💵' },
];

export default function Finance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [transType, setTransType] = useState<'cost' | 'sale'>('cost');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadTransactions();
  }, []);
  
  const loadTransactions = async () => {
    try {
      const end = new Date();
      const start = subDays(end, 30);
      const res = await fetch(
        `/api/transactions?start_date=${format(start, 'yyyy-MM-dd')}&end_date=${format(end, 'yyyy-MM-dd')}`,
        { credentials: 'include' }
      );
      if (res.ok) setTransactions(await res.json());
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!amount || !category) return;
    setSaving(true);
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedDate,
          type: transType,
          category,
          amount: parseFloat(amount),
          description: description || undefined
        })
      });
      await loadTransactions();
      closeModal();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker?')) return;
    try {
      await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await loadTransactions();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };
  
  const closeModal = () => {
    setShowModal(false);
    setCategory('');
    setAmount('');
    setDescription('');
  };
  
  const formatCurrency = (n: number) => 
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
  
  const totalCosts = transactions.filter(t => t.type === 'cost').reduce((s, t) => s + t.amount, 0);
  const totalSales = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
  const net = totalSales - totalCosts;
  
  const getCategoryInfo = (cat: string) => 
    [...COST_CATEGORIES, ...SALE_CATEGORIES].find(c => c.value === cat);
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: i === 0 ? 'Idag' : i === 1 ? 'Igår' : format(date, 'EEE d', { locale: sv })
    };
  });
  
  const categories = transType === 'cost' ? COST_CATEGORIES : SALE_CATEGORIES;
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  return (
    <div className="finance-page">
      <header className="page-header">
        <h1>Ekonomi</h1>
        <p>Håll koll på kostnader och intäkter</p>
      </header>
      
      <div className="finance-summary">
        <div className="summary-card cost-card">
          <span className="summary-icon">📉</span>
          <span className="summary-value cost">{formatCurrency(totalCosts)}</span>
          <span className="summary-label">Kostnader</span>
        </div>
        <div className="summary-card sale-card">
          <span className="summary-icon">📈</span>
          <span className="summary-value income">{formatCurrency(totalSales)}</span>
          <span className="summary-label">Försäljning</span>
        </div>
      </div>
      
      <div className="net-card">
        <span>Netto</span>
        <span className={`net-value ${net >= 0 ? 'positive' : 'negative'}`}>
          {net >= 0 ? '+' : ''}{formatCurrency(net)}
        </span>
      </div>
      
      <div className="action-buttons">
        <button 
          onClick={() => { setTransType('cost'); setShowModal(true); }}
          className="action-btn cost-btn"
        >
          - Lägg till kostnad
        </button>
        <button 
          onClick={() => { setTransType('sale'); setShowModal(true); }}
          className="action-btn sale-btn"
        >
          + Lägg till försäljning
        </button>
      </div>
      
      <div className="transactions-list">
        <h3>Transaktioner</h3>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <span>💰</span>
            <p>Inga transaktioner ännu</p>
          </div>
        ) : (
          transactions.map(trans => {
            const catInfo = getCategoryInfo(trans.category);
            return (
              <div key={trans.id} className="transaction-item">
                <div className="trans-left">
                  <div className={`trans-icon ${trans.type}`}>
                    {catInfo?.icon || '💵'}
                  </div>
                  <div className="trans-info">
                    <span className="trans-category">{catInfo?.label || trans.category}</span>
                    <span className="trans-date">
                      {format(parseISO(trans.date), 'd MMM yyyy', { locale: sv })}
                    </span>
                    {trans.description && <span className="trans-desc">{trans.description}</span>}
                  </div>
                </div>
                <div className="trans-right">
                  <span className={`trans-amount ${trans.type}`}>
                    {trans.type === 'cost' ? '-' : '+'}{formatCurrency(trans.amount)}
                  </span>
                  <button onClick={() => handleDelete(trans.id)} className="delete-btn">×</button>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{transType === 'cost' ? 'Lägg till kostnad' : 'Lägg till försäljning'}</h2>
            
            <label>Kategori</label>
            <div className="category-grid">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  className={`category-btn ${category === cat.value ? 'active' : ''}`}
                  onClick={() => setCategory(cat.value)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            
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
            
            <label>Belopp (kr)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
            />
            
            <label>Beskrivning (valfritt)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="T.ex. '25 kg foder'"
            />
            
            <div className="modal-buttons">
              <button onClick={closeModal} className="btn-secondary">Avbryt</button>
              <button 
                onClick={handleSubmit} 
                disabled={!amount || !category || saving} 
                className="btn-primary"
              >
                {saving ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
