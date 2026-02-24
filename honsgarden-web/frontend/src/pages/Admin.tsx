import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

interface Stats {
  users: { total: number; new_last_7_days: number };
  subscriptions: { active: number; monthly: number; yearly: number; mrr: number };
  feedback: { new: number; total: number };
  cancellations: { last_30_days: number };
}

interface User {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: string;
  is_premium: boolean;
  plan: string | null;
  reminder_enabled: boolean;
}

interface Subscription {
  user_id: string;
  email: string;
  name: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
}

interface Feedback {
  id: string;
  type: string;
  message: string;
  email: string | null;
  status: string;
  created_at: string;
}

type TabType = 'overview' | 'users' | 'subscriptions' | 'feedback';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/admin/check', { credentials: 'include' });
      const data = await res.json();
      setIsAdmin(data.is_admin);
      if (!data.is_admin) {
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || !stats) {
        const statsRes = await fetch('/api/admin/stats', { credentials: 'include' });
        if (statsRes.ok) setStats(await statsRes.json());
      }
      
      if (activeTab === 'users') {
        const usersRes = await fetch('/api/admin/users', { credentials: 'include' });
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users);
        }
      }
      
      if (activeTab === 'subscriptions') {
        const subsRes = await fetch('/api/admin/subscriptions', { credentials: 'include' });
        if (subsRes.ok) {
          const data = await subsRes.json();
          setSubscriptions(data.subscriptions);
        }
      }
      
      if (activeTab === 'feedback') {
        const feedbackRes = await fetch('/api/admin/feedback', { credentials: 'include' });
        if (feedbackRes.ok) {
          const data = await feedbackRes.json();
          setFeedback(data.feedback);
        }
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Vill du verkligen radera användaren ${email}? Detta går inte att ångra.`)) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setUsers(users.filter(u => u.user_id !== userId));
        alert('Användare raderad');
      }
    } catch (error) {
      alert('Kunde inte radera användare');
    }
  };

  const handleToggleSubscription = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}?is_active=${!currentStatus}&plan=yearly`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (res.ok) {
        loadData();
        alert(currentStatus ? 'Prenumeration avaktiverad' : 'Prenumeration aktiverad');
      }
    } catch (error) {
      alert('Kunde inte uppdatera prenumeration');
    }
  };

  const handleFeedbackStatus = async (feedbackId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}?status=${status}`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (res.ok) {
        setFeedback(feedback.map(f => f.id === feedbackId ? { ...f, status } : f));
      }
    } catch (error) {
      alert('Kunde inte uppdatera status');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('sv-SE');
  };

  if (isAdmin === null) {
    return <div className="admin-page"><div className="loading">Kontrollerar behörighet...</div></div>;
  }

  if (isAdmin === false) {
    return (
      <div className="admin-page">
        <div className="access-denied">
          <h1>⛔ Åtkomst nekad</h1>
          <p>Du har inte behörighet att se denna sida.</p>
          <p>Omdirigerar till startsidan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>🔐 Admin Panel</h1>
        <p>Inloggad som: {user?.email}</p>
      </header>

      <nav className="admin-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          📊 Översikt
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          👥 Användare
        </button>
        <button 
          className={activeTab === 'subscriptions' ? 'active' : ''} 
          onClick={() => setActiveTab('subscriptions')}
        >
          💳 Prenumerationer
        </button>
        <button 
          className={activeTab === 'feedback' ? 'active' : ''} 
          onClick={() => setActiveTab('feedback')}
        >
          💬 Feedback {stats?.feedback.new ? `(${stats.feedback.new})` : ''}
        </button>
      </nav>

      <main className="admin-content">
        {loading && <div className="loading">Laddar...</div>}
        
        {!loading && activeTab === 'overview' && stats && (
          <div className="overview-grid">
            <div className="stat-card">
              <span className="stat-icon">👥</span>
              <div className="stat-info">
                <span className="stat-value">{stats.users.total}</span>
                <span className="stat-label">Totalt användare</span>
                <span className="stat-sub">+{stats.users.new_last_7_days} senaste 7 dagarna</span>
              </div>
            </div>
            
            <div className="stat-card premium">
              <span className="stat-icon">⭐</span>
              <div className="stat-info">
                <span className="stat-value">{stats.subscriptions.active}</span>
                <span className="stat-label">Aktiva prenumeranter</span>
                <span className="stat-sub">{stats.subscriptions.monthly} mån / {stats.subscriptions.yearly} år</span>
              </div>
            </div>
            
            <div className="stat-card revenue">
              <span className="stat-icon">💰</span>
              <div className="stat-info">
                <span className="stat-value">{stats.subscriptions.mrr} kr</span>
                <span className="stat-label">MRR (Månadsintäkt)</span>
                <span className="stat-sub">Beräknat på aktiva prenumerationer</span>
              </div>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">💬</span>
              <div className="stat-info">
                <span className="stat-value">{stats.feedback.new}</span>
                <span className="stat-label">Ny feedback</span>
                <span className="stat-sub">{stats.feedback.total} totalt</span>
              </div>
            </div>
            
            <div className="stat-card warning">
              <span className="stat-icon">🚪</span>
              <div className="stat-info">
                <span className="stat-value">{stats.cancellations.last_30_days}</span>
                <span className="stat-label">Avslutade (30 dagar)</span>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <div className="users-section">
            <h2>Alla användare ({users.length})</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Användare</th>
                  <th>Email</th>
                  <th>Registrerad</th>
                  <th>Premium</th>
                  <th>Påminnelser</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.user_id}>
                    <td className="user-cell">
                      {u.picture && <img src={u.picture} alt="" className="user-avatar" />}
                      <span>{u.name || 'Okänd'}</span>
                    </td>
                    <td>{u.email}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      <span className={`badge ${u.is_premium ? 'premium' : 'free'}`}>
                        {u.is_premium ? `⭐ ${u.plan}` : 'Gratis'}
                      </span>
                    </td>
                    <td>{u.reminder_enabled ? '✅' : '❌'}</td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleToggleSubscription(u.user_id, u.is_premium)}
                        className={u.is_premium ? 'btn-warning' : 'btn-success'}
                      >
                        {u.is_premium ? 'Ta bort Premium' : 'Ge Premium'}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.user_id, u.email)}
                        className="btn-danger"
                      >
                        Radera
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'subscriptions' && (
          <div className="subscriptions-section">
            <h2>Prenumerationer ({subscriptions.length})</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Användare</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Startad</th>
                  <th>Går ut</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(s => (
                  <tr key={s.user_id} className={!s.is_active ? 'inactive-row' : ''}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>
                      <span className={`badge plan-${s.plan}`}>
                        {s.plan === 'yearly' ? 'Årsplan' : 'Månadsplan'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.is_active ? 'active' : 'cancelled'}`}>
                        {s.is_active ? '✅ Aktiv' : '❌ Avslutad'}
                      </span>
                    </td>
                    <td>{formatDate(s.created_at)}</td>
                    <td>{formatDate(s.expires_at || '')}</td>
                    <td>
                      <button 
                        onClick={() => handleToggleSubscription(s.user_id, s.is_active)}
                        className={s.is_active ? 'btn-warning' : 'btn-success'}
                      >
                        {s.is_active ? 'Avaktivera' : 'Aktivera'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'feedback' && (
          <div className="feedback-section">
            <h2>Feedback ({feedback.length})</h2>
            <div className="feedback-list">
              {feedback.map(f => (
                <div key={f.id} className={`feedback-card status-${f.status}`}>
                  <div className="feedback-header">
                    <span className={`feedback-type type-${f.type}`}>
                      {f.type === 'feature' && '🚀 Ny funktion'}
                      {f.type === 'improvement' && '✨ Förbättring'}
                      {f.type === 'bug' && '🐛 Bugg'}
                      {f.type === 'other' && '💬 Övrigt'}
                    </span>
                    <span className="feedback-date">{formatDate(f.created_at)}</span>
                  </div>
                  <p className="feedback-message">{f.message}</p>
                  {f.email && <p className="feedback-email">📧 {f.email}</p>}
                  <div className="feedback-actions">
                    <span className={`status-badge status-${f.status}`}>
                      {f.status === 'new' && '🆕 Ny'}
                      {f.status === 'read' && '👀 Läst'}
                      {f.status === 'replied' && '✅ Besvarad'}
                    </span>
                    <div className="status-buttons">
                      <button 
                        onClick={() => handleFeedbackStatus(f.id, 'read')}
                        disabled={f.status === 'read'}
                      >
                        Markera läst
                      </button>
                      <button 
                        onClick={() => handleFeedbackStatus(f.id, 'replied')}
                        disabled={f.status === 'replied'}
                      >
                        Markera besvarad
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {feedback.length === 0 && <p className="no-data">Ingen feedback ännu</p>}
            </div>
          </div>
        )}
      </main>
      
      <footer className="admin-footer">
        <a href="/" className="back-link">← Tillbaka till Hönsgården</a>
      </footer>
    </div>
  );
}
