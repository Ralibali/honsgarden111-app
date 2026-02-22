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
        throw new Error('Failed to create checkout session');
      }
      
      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Något gick fel. Försök igen.');
    } finally {
      setPurchasing(false);
    }
  };
  
  if (loading) {
    return <div className="loading">Laddar...</div>;
  }
  
  if (premium?.is_premium) {
    return (
      <div className="premium-page">
        <div className="premium-active">
          <span className="premium-star">⭐</span>
          <h1>Du är Premium!</h1>
          <p>Tack för att du stödjer Hönshus Statistik.</p>
          
          <div className="plan-info">
            <p><strong>Plan:</strong> {premium.plan === 'yearly' ? 'Årsprenumeration' : 'Månadsprenumeration'}</p>
            {premium.expires_at && (
              <p><strong>Förnyas:</strong> {new Date(premium.expires_at).toLocaleDateString('sv-SE')}</p>
            )}
          </div>
          
          <div className="features-list">
            <h3>Dina förmåner:</h3>
            <ul>
              <li>✅ Obegränsad statistikhistorik</li>
              <li>✅ Årsstatistik</li>
              <li>✅ PDF-export</li>
              <li>✅ Påminnelser</li>
              <li>✅ Statistik per höna</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="premium-page">
      <header className="premium-header">
        <span className="premium-star">⭐</span>
        <h1>Hönshus Premium</h1>
        <p>Lås upp alla funktioner och få ut mer av din hönsgård</p>
      </header>
      
      <div className="features-grid">
        <div className="feature-item">
          <span className="feature-icon">📈</span>
          <h3>Obegränsad historik</h3>
          <p>Se all din statistik utan begränsningar</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">📅</span>
          <h3>Årsstatistik</h3>
          <p>Jämför år för år</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">📄</span>
          <h3>PDF-export</h3>
          <p>Exportera rapporter som PDF</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔔</span>
          <h3>Påminnelser</h3>
          <p>Glöm aldrig att registrera ägg</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🐔</span>
          <h3>Per höna</h3>
          <p>Följ varje hönas produktion</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">❤️</span>
          <h3>Stöd utvecklingen</h3>
          <p>Hjälp oss göra appen bättre</p>
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
          >
            {purchasing ? 'Laddar...' : 'Välj månatlig'}
          </button>
        </div>
        
        <div className="pricing-card popular">
          <div className="popular-badge">Populärast</div>
          <h3>Årlig</h3>
          <div className="price">
            <span className="amount">149</span>
            <span className="currency">kr/år</span>
          </div>
          <p>Spara 79 kr (över 30%!)</p>
          <button
            onClick={() => handlePurchase('yearly')}
            disabled={purchasing}
            className="btn-primary purchase-btn"
          >
            {purchasing ? 'Laddar...' : 'Välj årlig'}
          </button>
        </div>
      </div>
      
      <p className="payment-info">
        Säker betalning via Stripe. Du kan avsluta när som helst.
      </p>
    </div>
  );
}
