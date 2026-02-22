import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './CheckoutSuccess.css';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [attempts, setAttempts] = useState(0);
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setStatus('error');
      return;
    }
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/checkout/status/${sessionId}`, {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error('Failed to check status');
        }
        
        const data = await res.json();
        
        if (data.payment_status === 'paid') {
          setStatus('success');
        } else if (data.status === 'expired') {
          setStatus('error');
        } else if (attempts < 5) {
          // Keep polling
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Status check failed:', error);
        if (attempts < 5) {
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else {
          setStatus('error');
        }
      }
    };
    
    checkStatus();
  }, [searchParams, attempts]);
  
  if (status === 'loading') {
    return (
      <div className="checkout-success-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <h2>Verifierar betalning...</h2>
          <p>Vänta medan vi bekräftar din betalning.</p>
        </div>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="checkout-success-page">
        <div className="error-state">
          <span className="error-icon">❌</span>
          <h2>Något gick fel</h2>
          <p>Vi kunde inte verifiera din betalning. Kontakta support om pengar har dragits.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Gå till startsidan
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="checkout-success-page">
      <div className="success-state">
        <span className="success-icon">✅</span>
        <h2>Tack för ditt köp!</h2>
        <p>Du är nu Premium-användare. Alla funktioner är upplåsta!</p>
        
        <div className="features-unlocked">
          <h3>Dina nya förmåner:</h3>
          <ul>
            <li>⭐ Obegränsad statistikhistorik</li>
            <li>⭐ Årsstatistik</li>
            <li>⭐ PDF-export</li>
            <li>⭐ Påminnelser</li>
          </ul>
        </div>
        
        <button onClick={() => navigate('/')} className="btn-primary">
          Börja använda Premium
        </button>
      </div>
    </div>
  );
}
