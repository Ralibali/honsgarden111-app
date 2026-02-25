import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './Login.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Ogiltig återställningslänk');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Lösenorden matchar inte');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, new_password: newPassword })
      });
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.detail || 'Kunde inte återställa lösenordet');
      }
    } catch (err) {
      setError('Ett fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" data-testid="reset-password-page">
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <h1 className="login-title">Återställ lösenord</h1>
            <p className="login-subtitle">Välj ett nytt lösenord för ditt konto</p>
          </div>

          {success ? (
            <div className="success-message" data-testid="reset-success">
              <div className="success-icon">✓</div>
              <h3>Lösenordet har återställts!</h3>
              <p>Du loggas in automatiskt...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" data-testid="reset-form">
              {error && (
                <div className="error-message" data-testid="reset-error">
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="new-password">Nytt lösenord</label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="Minst 6 tecken"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="new-password-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirm-password">Bekräfta lösenord</label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Ange lösenordet igen"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="confirm-password-input"
                />
              </div>
              
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading || !token}
                data-testid="reset-submit"
              >
                {loading ? 'Återställer...' : 'Återställ lösenord'}
              </button>
              
              <button
                type="button"
                className="back-button"
                onClick={() => navigate('/login')}
                data-testid="back-to-login"
              >
                Tillbaka till inloggning
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
