import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const PREVIEW_IMAGES = {
  hero: 'https://images.pexels.com/photos/32100305/pexels-photo-32100305.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  eggs: 'https://images.pexels.com/photos/4530410/pexels-photo-4530410.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  chick: 'https://images.pexels.com/photos/5145/animal-easter-chick-chicken.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'
};

export default function Login() {
  const { login } = useAuth();
  
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <header className="hero">
        <div className="hero-overlay"></div>
        <img src={PREVIEW_IMAGES.hero} alt="Höna i trädgård" className="hero-image" />
        <div className="hero-content">
          <div className="logo-badge">🥚</div>
          <h1>Hönsgården</h1>
          <p className="tagline">Din digitala assistent för hönsgården</p>
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
            <div className="feature-icon">📊</div>
            <h3>Statistik</h3>
            <p>Tydliga grafer och översikter. Dag, månad och år – allt på ett ställe.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Ekonomi</h3>
            <p>Håll koll på foder, utrustning och försäljning. Se om hönsgården går plus eller minus.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🐔</div>
            <h3>Hönsprofiler</h3>
            <p>Ge dina hönor namn och följ varje hönas äggläggning individuellt.</p>
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
              <li>✓ Synka mellan mobil och dator</li>
              <li>✓ Exportera rapporter som PDF</li>
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
              <li>✓ 1 hönsgård</li>
              <li>✓ 30 dagars historik</li>
              <li>✓ Grundläggande statistik</li>
              <li>✓ Ägg- och ekonomilogg</li>
            </ul>
            <button onClick={login} className="pricing-btn secondary">Kom igång</button>
          </div>
          <div className="pricing-card popular">
            <div className="popular-badge">Populärast</div>
            <h3>Premium</h3>
            <div className="price">149 kr<span>/år</span></div>
            <ul>
              <li>✓ Allt i Gratis</li>
              <li>✓ Obegränsad historik</li>
              <li>✓ Årsstatistik</li>
              <li>✓ PDF-export</li>
              <li>✓ Hönsprofiler</li>
              <li>✓ Påminnelser</li>
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
        <p>© 2024 Hönsgården. Gjord med ❤️ för hönsälskare.</p>
      </footer>
    </div>
  );
}
