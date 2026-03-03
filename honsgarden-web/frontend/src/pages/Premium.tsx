import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Premium.css';

interface PremiumStatus {
  is_premium: boolean;
  plan?: string;
  expires_at?: string;
}

export default function Premium() {
  const navigate = useNavigate();
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
  useEffect(() => {
    loadStatus();
  }, []);
  
  const loadStatus = async () => {
    try {
      const res = await fetch('/api/premium/status', { credentials: 'include' });
      if (res.ok) setPremium(await res.json());
    } catch (error) {
      console.error('Failed to load premium status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePurchase = async (plan: 'monthly' | 'yearly') => {
    setPurchasing(true);
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan,
          origin_url: window.location.origin
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Checkout error:', res.status, errorData);
        
        if (res.status === 401) {
          alert('Din session har gått ut. Vänligen logga in igen.');
          window.location.href = '/login';
          return;
        }
        throw new Error(errorData.detail || 'Failed to create checkout session');
      }
      
      const data = await res.json();
      // Use url or checkout_url from response
      const checkoutUrl = data.url || data.checkout_url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Ingen checkout-URL mottagen');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Något gick fel. Försök igen.');
    } finally {
      setPurchasing(false);
    }
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const getDaysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  
  if (loading) {
    return <div className="loading">Laddar...</div>;
  }
  
  const isTrial = premium?.plan === 'trial';
  const daysLeft = premium?.expires_at ? getDaysLeft(premium.expires_at) : 0;
  
  if (premium?.is_premium && !isTrial) {
    return (
      <div className="premium-page" data-testid="premium-active">
        <div className="premium-active">
          <span className="premium-star">⭐</span>
          <h1>Du är Premium!</h1>
          <p>Tack för att du stödjer Hönsgården.</p>
          
          <div className="plan-info">
            <p><strong>Plan:</strong> {premium.plan === 'yearly' ? 'Årsprenumeration' : 'Månadsprenumeration'}</p>
            {premium.expires_at && (
              <p><strong>Förnyas:</strong> {formatDate(premium.expires_at)}</p>
            )}
          </div>
          
          <div className="features-list">
            <h3>Dina förmåner:</h3>
            <ul>
              <li>✅ 7-dagars äggprognos</li>
              <li>✅ Produktionsstatus (Normal/Låg/Hög)</li>
              <li>✅ Avvikelsedetektion per höna</li>
              <li>✅ Ekonomijämförelse (månad för månad)</li>
              <li>✅ AI-sammanfattning av din gård</li>
              <li>✅ AI-rådgivare "Agda" - personliga tips</li>
              <li>✅ Vädertips för din hönsgård</li>
              <li>✅ Hälsologg</li>
              <li>✅ Kläckningsmodul</li>
              <li>✅ Foderhantering</li>
              <li>✅ E-postpåminnelser</li>
              <li>✅ Obegränsad statistikhistorik</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
  
  // Show trial banner if in trial period
  const showTrialBanner = isTrial && daysLeft > 0;
  
  return (
    <div className="premium-page" data-testid="premium-page">
      {showTrialBanner && (
        <div className="trial-banner" data-testid="trial-banner">
          <span className="trial-icon">🎉</span>
          <div className="trial-text">
            <strong>Du har {daysLeft} dagar kvar av din gratis provperiod!</strong>
            <p>Upplev alla premium-funktioner helt gratis</p>
          </div>
        </div>
      )}
      
      <header className="premium-header">
        <span className="premium-star">⭐</span>
        <h1>Hönsgården Premium</h1>
        <p>Lås upp alla funktioner och få ut mer av din hönsgård</p>
      </header>
      
      {/* Free trial highlight */}
      {!showTrialBanner && (
        <div className="trial-promo">
          <span>🎁</span>
          <div>
            <strong>7 dagars gratis provperiod!</strong>
            <p>Nya användare får automatiskt tillgång till alla premium-funktioner i 7 dagar</p>
          </div>
        </div>
      )}
      
      <div className="features-grid">
        <div className="feature-item highlight">
          <span className="feature-icon">🔮</span>
          <h3>7-dagars prognos</h3>
          <p>Se hur många ägg du kan förvänta dig kommande vecka</p>
        </div>
        <div className="feature-item highlight">
          <span className="feature-icon">🤖</span>
          <h3>AI-rådgivare "Agda"</h3>
          <p>Personliga tips baserade på din flock och situation</p>
        </div>
        <div className="feature-item highlight">
          <span className="feature-icon">🌤️</span>
          <h3>Vädertips</h3>
          <p>Anpassade råd baserade på väderprognosen</p>
        </div>
        <div className="feature-item highlight">
          <span className="feature-icon">⚠️</span>
          <h3>Avvikelsedetektion</h3>
          <p>Varning när en höna slutar värpa oväntat</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🩺</span>
          <h3>Hälsologg</h3>
          <p>Dokumentera sjukdom, vaccination och behandlingar</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🥚</span>
          <h3>Kläckningsmodul</h3>
          <p>Håll koll på kläckningar med påminnelser</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🌾</span>
          <h3>Foderhantering</h3>
          <p>Spåra foderinköp och förbrukning</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">💰</span>
          <h3>Ekonomijämförelse</h3>
          <p>Jämför vinst/förlust månad för månad</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">📝</span>
          <h3>AI-dagsrapport</h3>
          <p>Daglig sammanfattning av din gårds status</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">📈</span>
          <h3>Obegränsad historik</h3>
          <p>Spara all statistik för alltid</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🐔</span>
          <h3>Obegränsade flockar</h3>
          <p>Hantera flera flockar och hönsgrupper</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">❤️</span>
          <h3>Stöd utvecklingen</h3>
          <p>Hjälp oss göra appen ännu bättre</p>
        </div>
      </div>
      
      <div className="pricing-cards">
        <div className="pricing-card">
          <h3>Månatlig</h3>
          <div className="price">
            <span className="amount">19</span>
            <span className="currency">kr/månad</span>
          </div>
          <p>Flexibelt, avsluta när som helst</p>
          <button
            onClick={() => handlePurchase('monthly')}
            disabled={purchasing}
            className="btn-primary purchase-btn"
            data-testid="purchase-monthly"
          >
            {purchasing ? 'Laddar...' : 'Välj månatlig'}
          </button>
        </div>
        
        <div className="pricing-card popular">
          <div className="popular-badge">Spara 35%</div>
          <h3>Årlig</h3>
          <div className="price">
            <span className="amount">149</span>
            <span className="currency">kr/år</span>
          </div>
          <p>Bara 12,42 kr/månad!</p>
          <button
            onClick={() => handlePurchase('yearly')}
            disabled={purchasing}
            className="btn-primary purchase-btn"
            data-testid="purchase-yearly"
          >
            {purchasing ? 'Laddar...' : 'Välj årlig'}
          </button>
        </div>
      </div>
      
      <p className="payment-info">
        🔒 Säker betalning via Stripe. Du kan avsluta när som helst.
      </p>
    </div>
  );
}
