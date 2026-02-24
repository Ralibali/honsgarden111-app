import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const PREVIEW_IMAGES = {
  hero: 'https://images.pexels.com/photos/4911743/pexels-photo-4911743.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  eggs: 'https://images.pexels.com/photos/4911785/pexels-photo-4911785.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  chick: 'https://images.pexels.com/photos/4911778/pexels-photo-4911778.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'
};

export default function Login() {
  const { login } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [sending, setSending] = useState(false);
  
  const handleContactSubmit = async () => {
    if (!contactMessage.trim()) return;
    setSending(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: contactMessage,
          email: contactEmail || 'anonymous',
          source: 'landing_page'
        })
      });
      setContactSent(true);
      setTimeout(() => {
        setShowContactModal(false);
        setContactSent(false);
        setContactMessage('');
        setContactEmail('');
      }, 2000);
    } catch (error) {
      console.error('Failed to send feedback:', error);
    }
    setSending(false);
  };
  
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <header className="hero">
        <div className="hero-overlay"></div>
        <img src={PREVIEW_IMAGES.hero} alt="Kvinna som tar hand om sina höns" className="hero-image" />
        <div className="hero-content">
          {/* New Logo */}
          <div className="logo-container">
            <div className="logo-icon">
              <svg viewBox="0 0 100 100" width="80" height="80">
                {/* Stylized hen silhouette */}
                <circle cx="50" cy="50" r="45" fill="#D97706" opacity="0.15"/>
                <path d="M30 65 Q35 45 50 40 Q65 35 70 50 Q75 65 65 75 Q50 85 35 75 Q25 70 30 65" fill="#D97706"/>
                <circle cx="60" cy="48" r="4" fill="#1F2937"/>
                <path d="M68 45 Q75 42 72 50 Q70 55 68 52" fill="#EF4444"/>
                <path d="M55 58 Q58 62 52 62 Q48 62 50 58" fill="#F59E0B"/>
                {/* Egg accent */}
                <ellipse cx="35" cy="72" rx="8" ry="10" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
              </svg>
            </div>
            <h1>Hönsgården</h1>
          </div>
          <p className="tagline-main">Din digitala assistent för din hönsgård</p>
          <p className="tagline-sub">Håll koll på dina hönor, ägg och ekonomi – på ett enkelt sätt.</p>
          <button onClick={login} className="cta-button">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Kom igång gratis med Google
          </button>
        </div>
      </header>
      
      {/* Features Section */}
      <section className="features-section">
        <h2>Allt du behöver för din hönsgård</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🥚</div>
            <h3>Äggdagbok</h3>
            <p>Registrera ägg snabbt och enkelt. Se trender och jämför med tidigare perioder.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🐔</div>
            <h3>Hönsprofiler</h3>
            <p>Ge dina hönor namn och följ varje hönas äggläggning och hälsa individuellt.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Statistik & Insikter</h3>
            <p>Tydliga grafer, produktivitetsvarningar och smarta prognoser.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Ekonomi</h3>
            <p>Håll koll på foder, utrustning och försäljning. Se kostnad per ägg.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🩺</div>
            <h3>Hälsologg</h3>
            <p>Dokumentera vaccinationer, veterinärbesök och sjukdomar för varje höna.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏠</div>
            <h3>Flockhantering</h3>
            <p>Organisera dina hönor i flockar och hönshus. Filtrera statistik per flock.</p>
          </div>
        </div>
      </section>
      
      {/* Screenshot Preview */}
      <section className="preview-section">
        <div className="preview-content">
          <div className="preview-text">
            <h2>Se hur det fungerar</h2>
            <p>Enkel och intuitiv design som gör det roligt att hålla koll på hönsgården. Fungerar på både mobil och dator.</p>
            <ul className="preview-list">
              <li>✓ Snabbregistrera ägg med ett klick</li>
              <li>✓ Automatiska beräkningar och trender</li>
              <li>✓ Varningar när hönor inte värper</li>
              <li>✓ "Senast sedd"-funktion för säkerhet</li>
              <li>✓ Synka mellan mobil och dator</li>
            </ul>
          </div>
          <div className="preview-image-container">
            <img src={PREVIEW_IMAGES.eggs} alt="Samla ägg" className="preview-image" />
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="pricing-section">
        <h2>Enkel prissättning</h2>
        <p className="pricing-subtitle">Börja gratis – uppgradera när du vill ha mer</p>
        <div className="pricing-cards">
          <div className="pricing-card">
            <h3>Gratis</h3>
            <div className="price">0 kr</div>
            <ul>
              <li>✓ 1 flock</li>
              <li>✓ 90 dagars historik</li>
              <li>✓ Grundläggande statistik</li>
              <li>✓ Ägg- och ekonomilogg</li>
              <li>✓ Hälsologg</li>
            </ul>
            <button onClick={login} className="pricing-btn secondary">Kom igång</button>
          </div>
          <div className="pricing-card popular">
            <div className="popular-badge">Populärast</div>
            <h3>Premium</h3>
            <div className="price">149 kr<span>/år</span></div>
            <p className="price-monthly">eller 19 kr/mån</p>
            <ul>
              <li>✓ Allt i Gratis</li>
              <li>✓ Obegränsad historik</li>
              <li>✓ Obegränsade flockar</li>
              <li>✓ 7-dagars prognos</li>
              <li>✓ Produktivitetsvarningar</li>
              <li>✓ Ekonomijämförelse</li>
              <li>✓ Kläckningsmodul</li>
              <li>✓ Push-notiser</li>
            </ul>
            <button onClick={login} className="pricing-btn primary">Prova gratis först</button>
          </div>
        </div>
      </section>
      
      {/* Final CTA */}
      <section className="final-cta">
        <img src={PREVIEW_IMAGES.chick} alt="Kyckling" className="cta-image" />
        <div className="cta-content">
          <h2>Redo att komma igång?</h2>
          <p>Gå med tusentals andra hönsgårdsägare som redan använder Hönsgården.</p>
          <button onClick={login} className="cta-button large">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Skapa konto gratis
          </button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <svg viewBox="0 0 100 100" width="32" height="32">
                <circle cx="50" cy="50" r="45" fill="#D97706" opacity="0.15"/>
                <path d="M30 65 Q35 45 50 40 Q65 35 70 50 Q75 65 65 75 Q50 85 35 75 Q25 70 30 65" fill="#D97706"/>
                <circle cx="60" cy="48" r="4" fill="#1F2937"/>
                <ellipse cx="35" cy="72" rx="8" ry="10" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
              </svg>
              <span>Hönsgården</span>
            </div>
            <p>Gjord med ❤️ för hönsälskare</p>
          </div>
          <div className="footer-links">
            <button onClick={() => setShowContactModal(true)} className="footer-link">
              💬 Kontakta oss
            </button>
            <button onClick={() => setShowContactModal(true)} className="footer-link">
              💡 Skicka förslag
            </button>
          </div>
        </div>
        <p className="copyright">© 2024 Hönsgården. Alla rättigheter förbehållna.</p>
      </footer>
      
      {/* Floating Contact Button */}
      <button 
        className="floating-contact-btn"
        onClick={() => setShowContactModal(true)}
        title="Kontakta oss"
      >
        💬
      </button>
      
      {/* Contact Modal */}
      {showContactModal && (
        <div className="contact-modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="contact-modal" onClick={e => e.stopPropagation()}>
            {contactSent ? (
              <div className="contact-success">
                <span className="success-icon">✅</span>
                <h3>Tack för ditt meddelande!</h3>
                <p>Vi återkommer så snart vi kan.</p>
              </div>
            ) : (
              <>
                <h3>💬 Kontakta oss</h3>
                <p>Har du frågor, förslag eller feedback? Vi älskar att höra från dig!</p>
                
                <label>E-post (valfritt)</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="din@email.se"
                />
                
                <label>Meddelande</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Skriv ditt meddelande här..."
                  rows={4}
                />
                
                <div className="contact-buttons">
                  <button onClick={() => setShowContactModal(false)} className="cancel-btn">
                    Avbryt
                  </button>
                  <button 
                    onClick={handleContactSubmit} 
                    disabled={!contactMessage.trim() || sending}
                    className="send-btn"
                  >
                    {sending ? 'Skickar...' : 'Skicka'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
