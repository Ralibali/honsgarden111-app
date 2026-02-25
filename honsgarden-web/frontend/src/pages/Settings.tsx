import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

interface CoopSettings {
  coop_name: string;
  hen_count: number;
}

interface ReminderSettings {
  enabled: boolean;
  time: string;
}

interface PremiumStatus {
  is_premium: boolean;
  plan: string | null;
  expires_at: string | null;
}

interface FeaturePreferences {
  flock_management: boolean;
  health_log: boolean;
  productivity_alerts: boolean;
  hatching_module: boolean;
  show_economy_insights: boolean;
  can_customize: boolean;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [coop, setCoop] = useState<CoopSettings | null>(null);
  const [reminders, setReminders] = useState<ReminderSettings>({ enabled: true, time: '18:00' });
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [featurePrefs, setFeaturePrefs] = useState<FeaturePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [coopName, setCoopName] = useState('');
  const [henCount, setHenCount] = useState(0);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [saving, setSaving] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasReminderChanges, setHasReminderChanges] = useState(false);
  
  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feature');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  
  // Cancel subscription state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  useEffect(() => {
    if (coop) {
      setHasChanges(coopName !== coop.coop_name || henCount !== coop.hen_count);
    }
  }, [coopName, henCount, coop]);
  
  useEffect(() => {
    setHasReminderChanges(reminderEnabled !== reminders.enabled || reminderTime !== reminders.time);
  }, [reminderEnabled, reminderTime, reminders]);
  
  const loadSettings = async () => {
    try {
      const [coopRes, reminderRes, premiumRes, featureRes] = await Promise.all([
        fetch('/api/coop', { credentials: 'include' }),
        fetch('/api/reminders/settings', { credentials: 'include' }),
        fetch('/api/premium/status', { credentials: 'include' }),
        fetch('/api/feature-preferences', { credentials: 'include' })
      ]);
      
      if (coopRes.ok) {
        const data = await coopRes.json();
        setCoop(data);
        setCoopName(data.coop_name);
        setHenCount(data.hen_count);
      }
      
      if (reminderRes.ok) {
        const data = await reminderRes.json();
        setReminders(data);
        setReminderEnabled(data.enabled);
        setReminderTime(data.time);
      }
      
      if (premiumRes.ok) {
        const data = await premiumRes.json();
        setPremium(data);
      }
      
      if (featureRes.ok) {
        const data = await featureRes.json();
        setFeaturePrefs(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateFeaturePreference = async (key: string, value: boolean) => {
    if (!featurePrefs?.can_customize) return;
    try {
      const res = await fetch('/api/feature-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [key]: value })
      });
      if (res.ok) {
        const data = await res.json();
        setFeaturePrefs(data);
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
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
  
  const handleSaveReminders = async () => {
    setSavingReminders(true);
    try {
      const res = await fetch('/api/reminders/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enabled: reminderEnabled,
          time: reminderTime
        })
      });
      if (res.ok) {
        setReminders({ enabled: reminderEnabled, time: reminderTime });
        alert('Påminnelseinställningar sparade!');
      }
    } catch (error) {
      console.error('Failed to save reminders:', error);
    } finally {
      setSavingReminders(false);
    }
  };
  
  const handleSendTestReminder = async () => {
    setSendingTest(true);
    try {
      const res = await fetch('/api/reminders/send-test', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        alert(`Testpåminnelse skickad till ${user?.email}!`);
      } else {
        alert('Kunde inte skicka testpåminnelse');
      }
    } catch (error) {
      console.error('Failed to send test:', error);
      alert('Något gick fel');
    } finally {
      setSendingTest(false);
    }
  };
  
  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: cancelReason })
      });
      if (res.ok) {
        setPremium({ is_premium: false, plan: null, expires_at: null });
        setShowCancelModal(false);
        setCancelReason('');
        alert('Din prenumeration har avslutats. Du behåller Premium tills perioden går ut.');
      } else {
        const data = await res.json();
        alert(data.detail || 'Kunde inte avsluta prenumerationen');
      }
    } catch (error) {
      console.error('Failed to cancel:', error);
      alert('Något gick fel');
    } finally {
      setCancelling(false);
    }
  };
  
  // Handle send feedback
  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      alert('Skriv ett meddelande');
      return;
    }
    setSendingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackMessage,
          email: feedbackEmail || user?.email || undefined
        })
      });
      if (res.ok) {
        setShowFeedbackModal(false);
        setFeedbackMessage('');
        setFeedbackEmail('');
        alert('Tack för din feedback! Vi uppskattar det. 🙏');
      } else {
        alert('Kunde inte skicka feedback');
      }
    } catch (error) {
      console.error('Failed to send feedback:', error);
      alert('Något gick fel');
    } finally {
      setSendingFeedback(false);
    }
  };
  
  if (loading) return <div className="loading">Laddar...</div>;
  
  return (
    <div className="settings-page" data-testid="settings-page">
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
      
      {/* Premium Status */}
      {premium && (
        <div className="card premium-card">
          <h3>⭐ Premium</h3>
          <div className="premium-status">
            <span className={`status-badge ${premium.is_premium ? 'active' : 'inactive'}`}>
              {premium.is_premium ? 'Aktiv' : 'Inte aktiverad'}
            </span>
            {premium.is_premium && premium.plan && (
              <span className="plan-info">
                {premium.plan === 'yearly' ? 'Årsprenumeration' : premium.plan === 'trial' ? 'Provperiod' : 'Månadsprenumeration'}
              </span>
            )}
          </div>
          
          {!premium.is_premium && (
            <div className="premium-features-preview">
              <p className="premium-desc">Lås upp alla funktioner:</p>
              <ul className="premium-features-list">
                <li>🤖 AI-driven dagsrapport & rådgivare</li>
                <li>📈 7-dagars äggprognos</li>
                <li>🩺 Hälsologg per höna</li>
                <li>🐣 Kläckningsmodul</li>
                <li>🌾 Foderhantering</li>
              </ul>
            </div>
          )}
          
          {premium.is_premium ? (
            <button 
              onClick={() => setShowCancelModal(true)} 
              className="btn-danger cancel-btn"
              data-testid="cancel-subscription-btn"
            >
              Avsluta prenumeration
            </button>
          ) : (
            <a href="/premium" className="btn-primary upgrade-btn" data-testid="upgrade-premium-btn">
              ⭐ Uppgradera till Premium
            </a>
          )}
        </div>
      )}
      
      {/* Feature Preferences - Premium Only */}
      {featurePrefs && (
        <div className="card feature-prefs-card">
          <h3>🎛️ Anpassa funktioner</h3>
          {featurePrefs.can_customize ? (
            <>
              <p className="card-desc">Välj vilka funktioner du vill visa i appen</p>
              
              <div className="toggle-row">
                <div className="toggle-info">
                  <span>🏠 Flockhantering</span>
                  <small>Organisera hönor i flockar</small>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featurePrefs.preferences?.show_flock_management ?? true}
                    onChange={(e) => updateFeaturePreference('show_flock_management', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="toggle-row">
                <div className="toggle-info">
                  <span>🩺 Hälsologg</span>
                  <small>Spåra hälsa per höna</small>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featurePrefs.preferences?.show_health_log ?? true}
                    onChange={(e) => updateFeaturePreference('show_health_log', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="toggle-row">
                <div className="toggle-info">
                  <span>⚠️ Produktivitetsvarningar</span>
                  <small>Varningar när hönor inte värper</small>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featurePrefs.preferences?.show_productivity_alerts ?? true}
                    onChange={(e) => updateFeaturePreference('show_productivity_alerts', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="toggle-row">
                <div className="toggle-info">
                  <span>🐣 Kläckningsmodul</span>
                  <small>Spåra kläckning av ägg</small>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featurePrefs.preferences?.show_hatching_module ?? true}
                    onChange={(e) => updateFeaturePreference('show_hatching_module', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              <div className="toggle-row">
                <div className="toggle-info">
                  <span>💰 Ekonomiinsikter</span>
                  <small>Visa kostnad per ägg m.m.</small>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={featurePrefs.preferences?.show_economy_insights ?? true}
                    onChange={(e) => updateFeaturePreference('show_economy_insights', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </>
          ) : (
            <div className="premium-lock">
              <span className="lock-icon">🔒</span>
              <p>Uppgradera till Premium för att anpassa funktioner</p>
              <a href="/premium" className="btn-secondary">Uppgradera</a>
            </div>
          )}
        </div>
      )}
      
      {/* Reminder Settings */}
      <div className="card reminder-card">
        <h3>📧 E-postpåminnelser</h3>
        <p className="card-desc">Få en daglig påminnelse om att registrera ägg</p>
        
        <div className="toggle-row">
          <span>Aktivera påminnelser</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              data-testid="reminder-toggle"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        {reminderEnabled && (
          <>
            <label>Tid för påminnelse</label>
            <select 
              value={reminderTime} 
              onChange={(e) => setReminderTime(e.target.value)}
              className="time-select"
              data-testid="reminder-time"
            >
              <option value="07:00">07:00 - Morgon</option>
              <option value="12:00">12:00 - Lunch</option>
              <option value="17:00">17:00 - Eftermiddag</option>
              <option value="18:00">18:00 - Kväll</option>
              <option value="20:00">20:00 - Sen kväll</option>
            </select>
            
            <button 
              onClick={handleSendTestReminder} 
              disabled={sendingTest}
              className="btn-secondary test-btn"
              data-testid="send-test-reminder"
            >
              {sendingTest ? 'Skickar...' : '📩 Skicka testpåminnelse'}
            </button>
          </>
        )}
        
        {hasReminderChanges && (
          <button onClick={handleSaveReminders} disabled={savingReminders} className="btn-primary save-btn" data-testid="save-reminders">
            {savingReminders ? 'Sparar...' : 'Spara påminnelser'}
          </button>
        )}
      </div>
      
      {/* Coop Settings */}
      <div className="card">
        <h3>🏠 Hönsgård</h3>
        
        <label>Namn på hönsgården</label>
        <input
          type="text"
          value={coopName}
          onChange={(e) => setCoopName(e.target.value)}
          placeholder="Min Hönsgård"
          data-testid="coop-name-input"
        />
        
        <label>Antal hönor</label>
        <div className="counter-row">
          <button 
            onClick={() => setHenCount(c => Math.max(0, c - 1))}
            className="counter-btn"
            data-testid="hen-count-minus"
          >
            -
          </button>
          <span className="counter-value">{henCount}</span>
          <button 
            onClick={() => setHenCount(c => c + 1)}
            className="counter-btn"
            data-testid="hen-count-plus"
          >
            +
          </button>
        </div>
        <p className="hint">Uppdatera detta när du får nya hönor eller säljer/förlorar någon.</p>
        
        {hasChanges && (
          <button onClick={handleSave} disabled={saving} className="btn-primary save-btn" data-testid="save-coop">
            {saving ? 'Sparar...' : 'Spara ändringar'}
          </button>
        )}
      </div>
      
      <div className="card">
        <h3>Om appen</h3>
        <div className="about-row">
          <span>🥚</span>
          <div>
            <strong>Hönsgården</strong>
            <p>Version 2.0</p>
          </div>
        </div>
        <p className="about-desc">
          Din digitala assistent för hönsgården. Följ äggproduktion, kostnader och intäkter – dag för dag.
        </p>
      </div>
      
      {/* Feedback Section */}
      <div className="card feedback-card">
        <h3>💡 Skicka tips & feedback</h3>
        <p className="card-desc">Har du förslag på förbättringar eller nya funktioner? Vi vill gärna höra från dig!</p>
        <button 
          onClick={() => setShowFeedbackModal(true)} 
          className="btn-secondary"
          data-testid="open-feedback-btn"
        >
          Skicka feedback
        </button>
      </div>
      
      {/* Support Section */}
      <div className="card">
        <h3>📧 Support</h3>
        <p className="about-desc">Behöver du hjälp? Kontakta oss på:</p>
        <a href="mailto:support@honsgarden.se" className="support-link">
          support@honsgarden.se
        </a>
      </div>
      
      <button onClick={logout} className="btn-secondary logout-btn" data-testid="logout-btn">
        Logga ut
      </button>
      
      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Avsluta prenumeration</h2>
            <p>Vill du verkligen avsluta din prenumeration?</p>
            <p className="modal-hint">Du behåller Premium-funktioner tills perioden går ut.</p>
            
            <label>Hjälp oss bli bättre - varför avslutar du? (valfritt)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="T.ex. för dyrt, saknar funktioner..."
              rows={3}
            />
            
            <div className="modal-buttons">
              <button onClick={() => setShowCancelModal(false)} className="btn-secondary">
                Avbryt
              </button>
              <button 
                onClick={handleCancelSubscription} 
                disabled={cancelling} 
                className="btn-danger"
                data-testid="confirm-cancel-btn"
              >
                {cancelling ? 'Avslutar...' : 'Ja, avsluta'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>💡 Skicka feedback</h2>
            <p>Vi uppskattar alla tips och förslag!</p>
            
            <label>Typ av feedback</label>
            <select 
              value={feedbackType} 
              onChange={(e) => setFeedbackType(e.target.value)}
              data-testid="feedback-type"
            >
              <option value="feature">🚀 Ny funktion</option>
              <option value="improvement">✨ Förbättring</option>
              <option value="bug">🐛 Buggrapport</option>
              <option value="other">💬 Övrigt</option>
            </select>
            
            <label>Ditt meddelande *</label>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Beskriv din idé eller feedback..."
              rows={4}
              data-testid="feedback-message"
            />
            
            <label>Din e-post (valfritt)</label>
            <input
              type="email"
              value={feedbackEmail}
              onChange={(e) => setFeedbackEmail(e.target.value)}
              placeholder={user?.email || 'För att vi ska kunna svara dig'}
              data-testid="feedback-email"
            />
            
            <div className="modal-buttons">
              <button onClick={() => setShowFeedbackModal(false)} className="btn-secondary">
                Avbryt
              </button>
              <button 
                onClick={handleSendFeedback} 
                disabled={sendingFeedback || !feedbackMessage.trim()} 
                className="btn-primary"
                data-testid="send-feedback-btn"
              >
                {sendingFeedback ? 'Skickar...' : 'Skicka'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
