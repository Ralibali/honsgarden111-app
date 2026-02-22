import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    // Use useRef to prevent double processing under StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const processSession = async () => {
      // Extract session_id from URL fragment
      const hash = window.location.hash;
      const match = hash.match(/session_id=([^&]+)/);
      
      if (!match) {
        navigate('/login');
        return;
      }
      
      const sessionId = match[1];
      
      try {
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId })
        });
        
        if (!response.ok) {
          throw new Error('Session exchange failed');
        }
        
        const user = await response.json();
        setUser(user);
        
        // Clear the hash and navigate to dashboard
        window.history.replaceState(null, '', '/');
        navigate('/', { replace: true, state: { user } });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };
    
    processSession();
  }, [navigate, setUser]);
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'var(--bg-primary)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid var(--bg-surface)',
          borderTop: '3px solid var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loggar in...</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
