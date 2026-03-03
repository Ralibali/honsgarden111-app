import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const HERO_IMAGE = 'https://images.pexels.com/photos/4911743/pexels-photo-4911743.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  
  // Auth state
  const [authMode, setAuthMode] = useState<'welcome' | 'login' | 'register' | 'forgot'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // GDPR consent state
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookie_consent');
    if (!cookieConsent) {
      setShowCookieBanner(true);
    }
  }, []);
  
  const acceptAllCookies = () => {
    localStorage.setItem('cookie_consent', 'all');
    setShowCookieBanner(false);
  };
  
  const acceptNecessaryCookies = () => {
    localStorage.setItem('cookie_consent', 'necessary');
    setShowCookieBanner(false);
  };
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMessage('');
    setAuthLoading(true);
    
    // Validate for registration
    if (authMode === 'register') {
      if (!name.trim()) {
        setAuthError('Namn är obligatoriskt');
        setAuthLoading(false);
        return;
      }
      if (!acceptedTerms) {
        setAuthError('Du måste godkänna användarvillkoren för att registrera dig.');
        setAuthLoading(false);
        return;
      }
      // Note: acceptedMarketing is optional per GDPR
    }
    
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = authMode === 'register' 
        ? { 
            email, 
            password, 
            name: name.trim(),
            accepted_terms: acceptedTerms,
            accepted_marketing: acceptedMarketing
          }
        : { email, password, remember_me: rememberMe };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setAuthError(data.detail || 'Något gick fel');
        return;
      }
      
      // Success
      setUser({
        user_id: data.user_id,
        email: data.email,
        name: data.name || '',
        picture: data.picture
      });
      navigate('/');
    } catch (error) {
      setAuthError('Kunde inte ansluta till servern');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccessMessage('');
    setAuthLoading(true);
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      setSuccessMessage(data.message || 'Om e-postadressen finns skickas ett återställningsmail.');
      setEmail('');
    } catch (error) {
      setAuthError('Kunde inte ansluta till servern');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-bg" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="login-overlay"></div>
      </div>
      
      {/* Content */}
      <div className="login-content">
        {/* Logo & Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <circle cx="50" cy="45" r="35" fill="#FF9800"/>
              <circle cx="50" cy="40" r="25" fill="#FFC107"/>
              <ellipse cx="50" cy="70" rx="20" ry="15" fill="#FFE082"/>
              <circle cx="42" cy="35" r="4" fill="#333"/>
              <path d="M50 28 L55 18 L45 18 Z" fill="#F44336"/>
              <path d="M62 45 Q75 45 70 55" stroke="#FF9800" strokeWidth="3" fill="none"/>
            </svg>
          </div>
          <h1 className="login-title">Hönsgården</h1>
          <p className="login-tagline">Din digitala assistent för hönsgården</p>
        </div>
        
        {/* Auth Card */}
        <div className="auth-card">
          {/* Welcome Screen */}
          {authMode === 'welcome' && (
            <div className="auth-welcome">
              <h2>Välkommen!</h2>
              <p>Håll koll på dina hönor, ägg och ekonomi – på ett enkelt sätt.</p>
              
              <div className="welcome-features">
                <div className="feature-item">
                  <span className="feature-icon">🥚</span>
                  <span>Äggdagbok</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🐔</span>
                  <span>Hönsprofiler</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span>Statistik</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💰</span>
                  <span>Ekonomi</span>
                </div>
              </div>
              
              <button 
                className="btn-primary btn-large"
                onClick={() => setAuthMode('register')}
                data-testid="get-started-btn"
              >
                Kom igång gratis
              </button>
              
              <p className="auth-switch">
                Har du redan ett konto? 
                <button onClick={() => setAuthMode('login')}>Logga in</button>
              </p>
            </div>
          )}
          
          {/* Login Form */}
          {authMode === 'login' && (
            <form onSubmit={handleEmailAuth} className="auth-form">
              <h2>Logga in</h2>
              
              {authError && <div className="auth-error">{authError}</div>}
              
              <div className="form-group">
                <label>E-postadress</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.se"
                  required
                  autoComplete="email"
                  data-testid="login-email"
                />
              </div>
              
              <div className="form-group">
                <label>Lösenord</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  data-testid="login-password"
                />
              </div>
              
              <div className="remember-me-row">
                <label className="remember-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    data-testid="remember-me"
                  />
                  <span className="checkmark"></span>
                  <span>Kom ihåg mig i 30 dagar</span>
                </label>
                <button 
                  type="button" 
                  className="forgot-password-link"
                  onClick={() => setAuthMode('forgot')}
                >
                  Glömt lösenord?
                </button>
              </div>
              
              <button 
                type="submit" 
                className="btn-primary btn-large"
                disabled={authLoading}
                data-testid="login-submit"
              >
                {authLoading ? 'Loggar in...' : 'Logga in'}
              </button>
              
              <p className="auth-switch">
                Ny här? 
                <button type="button" onClick={() => setAuthMode('register')}>Skapa konto gratis</button>
              </p>
              
              <button 
                type="button" 
                className="btn-back"
                onClick={() => setAuthMode('welcome')}
              >
                ← Tillbaka
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <h2>Glömt lösenord?</h2>
              <p className="form-subtitle-muted">Ange din e-postadress så skickar vi en återställningslänk.</p>
              
              {authError && <div className="auth-error">{authError}</div>}
              {successMessage && <div className="auth-success">{successMessage}</div>}
              
              <div className="form-group">
                <label>E-postadress</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.se"
                  required
                  autoComplete="email"
                  data-testid="forgot-email"
                />
              </div>
              
              <button 
                type="submit" 
                className="btn-primary btn-large"
                disabled={authLoading}
                data-testid="forgot-submit"
              >
                {authLoading ? 'Skickar...' : 'Skicka återställningslänk'}
              </button>
              
              <p className="support-text">
                Har du inget konto? Eller fått problem? <br/>
                <a href="mailto:info@honsgarden.se">Kontakta oss</a> så hjälper vi dig.
              </p>
              
              <button 
                type="button" 
                className="btn-back"
                onClick={() => setAuthMode('login')}
              >
                ← Tillbaka till inloggning
              </button>
            </form>
          )}
          
          {/* Register Form */}
          {authMode === 'register' && (
            <form onSubmit={handleEmailAuth} className="auth-form">
              <h2>Skapa konto</h2>
              <p className="form-subtitle">🎁 7 dagars gratis Premium ingår!</p>
              
              {authError && <div className="auth-error">{authError}</div>}
              {successMessage && <div className="auth-success">{successMessage}</div>}
              
              <div className="form-group">
                <label>Namn <span className="required-star">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ditt namn"
                  required
                  autoComplete="name"
                  data-testid="register-name"
                />
              </div>
              
              <div className="form-group">
                <label>E-postadress <span className="required-star">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.se"
                  required
                  autoComplete="email"
                  data-testid="register-email"
                />
              </div>
              
              <div className="form-group">
                <label>Lösenord <span className="required-star">*</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minst 6 tecken"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  data-testid="register-password"
                />
              </div>
              
              {/* GDPR Consent Checkboxes */}
              <div className="consent-section">
                <label className="consent-checkbox required">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                    data-testid="accept-terms"
                  />
                  <span className="checkmark"></span>
                  <span className="consent-text">
                    Jag har läst och godkänner{' '}
                    <button 
                      type="button" 
                      className="link-btn"
                      onClick={() => setShowTermsModal(true)}
                    >
                      användarvillkoren och integritetspolicyn för honsgarden.se
                    </button>
                    <span className="required-star">*</span>
                  </span>
                </label>
                
                <label className="consent-checkbox optional">
                  <input
                    type="checkbox"
                    checked={acceptedMarketing}
                    onChange={(e) => setAcceptedMarketing(e.target.checked)}
                    data-testid="accept-marketing"
                  />
                  <span className="checkmark"></span>
                  <span className="consent-text">
                    Jag godkänner att honsgarden.se skickar nyhetsbrev, erbjudanden och produktuppdateringar till min e-postadress.
                  </span>
                </label>
              </div>
              
              <button 
                type="submit" 
                className="btn-primary btn-large"
                disabled={authLoading || !acceptedTerms || !name.trim()}
                data-testid="register-submit"
              >
                {authLoading ? 'Skapar konto...' : 'Skapa konto'}
              </button>
              
              <p className="auth-switch">
                Har du redan ett konto? 
                <button type="button" onClick={() => setAuthMode('login')}>Logga in</button>
              </p>
              
              <button 
                type="button" 
                className="btn-back"
                onClick={() => setAuthMode('welcome')}
              >
                ← Tillbaka
              </button>
            </form>
          )}
        </div>
        
        {/* Footer */}
        <p className="login-footer">
          © 2026 honsgarden.se
        </p>
      </div>
      
      {/* Terms Modal */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="terms-modal" onClick={e => e.stopPropagation()}>
            <div className="terms-header">
              <h2>Användarvillkor & Integritetspolicy</h2>
              <button className="close-btn" onClick={() => setShowTermsModal(false)}>✕</button>
            </div>
            <div className="terms-content">
              <p className="terms-updated"><strong>honsgarden.se</strong> | Senast uppdaterad: 2026-02-25</p>
              
              <h3>1. Allmänt</h3>
              <ul>
                <li>Dessa villkor gäller när du skapar ett konto och använder tjänsten honsgarden.se ("vi", "oss", "tjänsten").</li>
                <li>Genom att registrera dig bekräftar du att du har läst, förstått och godkänt dessa villkor.</li>
                <li>Du måste vara minst 16 år gammal för att använda tjänsten. Om du är under 18 år krävs målsmans godkännande.</li>
                <li>Villkoren gäller tills vidare och kan uppdateras. Du meddelas vid väsentliga förändringar.</li>
              </ul>
              
              <h3>2. Personuppgifter & GDPR</h3>
              <p>Vi behandlar dina personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR) samt den svenska dataskyddslagen (2018:218).</p>
              
              <h4>Vilka uppgifter vi samlar in:</h4>
              <ul>
                <li>Namn och e-postadress vid registrering</li>
                <li>Uppgifter du själv lämnar i tjänsten (hönsdata, äggregistreringar, ekonomi)</li>
                <li>Tekniska data (t.ex. IP-adress, enhetstyp, cookies)</li>
              </ul>
              
              <h4>Rättslig grund för behandlingen:</h4>
              <ul>
                <li><strong>Avtal</strong> – för att kunna tillhandahålla tjänsten du registrerat dig för</li>
                <li><strong>Samtycke</strong> – för marknadsföring och nyhetsbrev</li>
                <li><strong>Berättigat intresse</strong> – för säkerhet, felsökning och förbättring av tjänsten</li>
              </ul>
              
              <h4>Dina rättigheter enligt GDPR:</h4>
              <ul>
                <li>Rätt till <strong>tillgång</strong> – du kan begära ett utdrag av dina uppgifter</li>
                <li>Rätt till <strong>rättelse</strong> – du kan korrigera felaktiga uppgifter</li>
                <li>Rätt till <strong>radering</strong> ("rätten att bli glömd")</li>
                <li>Rätt till <strong>dataportabilitet</strong> – få dina uppgifter i maskinläsbart format</li>
                <li>Rätt att <strong>invända</strong> mot behandling</li>
                <li>Rätt att <strong>återkalla samtycke</strong> när som helst</li>
              </ul>
              
              <p>För att utöva dina rättigheter, kontakta oss på: <strong>info@honsgarden.se</strong></p>
              
              <h4>Lagringstid:</h4>
              <ul>
                <li>Dina uppgifter lagras så länge ditt konto är aktivt eller så länge det krävs enligt lag.</li>
                <li>Vid avslut av konto raderas personuppgifter inom 30 dagar, om inget annat krävs enligt lag.</li>
              </ul>
              
              <p>Du har rätt att lämna klagomål till <strong>Integritetsskyddsmyndigheten (IMY)</strong>: <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">www.imy.se</a></p>
              
              <h3>3. E-postkommunikation & Marknadsföring</h3>
              <p>Genom att godkänna villkoren ger du ditt <strong>samtycke</strong> till att honsgarden.se får kontakta dig via e-post med:</p>
              <ul>
                <li><strong>Nyhetsbrev</strong> – nyheter, tips och information om hönsuppfödning</li>
                <li><strong>Erbjudanden</strong> – kampanjer, rabatter och relevanta produkter</li>
                <li><strong>Produktuppdateringar</strong> – information om nya funktioner och förbättringar</li>
              </ul>
              <p>Du kan när som helst <strong>avprenumerera</strong> via avprenumerationslänken i varje utskick eller genom att kontakta oss direkt.</p>
              
              <h3>4. Cookies</h3>
              <ul>
                <li>Vi använder cookies och liknande tekniker för att tjänsten ska fungera korrekt.</li>
                <li>Cookies för analys och marknadsföring används endast efter ditt samtycke.</li>
                <li>Du kan hantera cookieinställningar i din webbläsare.</li>
              </ul>
              
              <h3>5. Säkerhet</h3>
              <ul>
                <li>Vi vidtar tekniska och organisatoriska åtgärder för att skydda dina personuppgifter.</li>
                <li>Du ansvarar för att hålla ditt lösenord hemligt.</li>
              </ul>
              
              <h3>6. Ansvarsbegränsning</h3>
              <ul>
                <li>Tjänsten tillhandahålls "i befintligt skick". Vi garanterar inte oavbruten eller felfri drift.</li>
                <li>honsgarden.se ansvarar inte för indirekt skada, utebliven vinst eller dataförlust.</li>
              </ul>
              
              <h3>7. Tillämplig lag & Tvistelösning</h3>
              <ul>
                <li>Dessa villkor regleras av <strong>svensk lag</strong>.</li>
                <li>Tvister kan hänskjutas till <strong>Allmänna reklamationsnämnden (ARN)</strong> eller allmän domstol i Sverige.</li>
              </ul>
              
              <h3>8. Kontakt</h3>
              <p>
                <strong>honsgarden.se</strong><br/>
                E-post: info@honsgarden.se<br/>
                Webbplats: www.honsgarden.se
              </p>
            </div>
            <div className="terms-footer">
              <button className="btn-primary" onClick={() => setShowTermsModal(false)}>
                Jag har läst villkoren
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cookie Banner */}
      {showCookieBanner && (
        <div className="cookie-banner">
          <div className="cookie-content">
            <span className="cookie-icon">🍪</span>
            <p>Vi använder cookies för att förbättra din upplevelse. Genom att fortsätta godkänner du vår användning av cookies.</p>
          </div>
          <div className="cookie-buttons">
            <button onClick={acceptNecessaryCookies} className="btn-secondary-small">
              Endast nödvändiga
            </button>
            <button onClick={acceptAllCookies} className="btn-primary-small">
              Godkänn alla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
