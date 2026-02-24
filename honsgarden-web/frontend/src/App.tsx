import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Eggs from './pages/Eggs';
import Finance from './pages/Finance';
import Statistics from './pages/Statistics';
import Hens from './pages/Hens';
import HenProfile from './pages/HenProfile';
import Settings from './pages/Settings';
import Premium from './pages/Premium';
import CheckoutSuccess from './pages/CheckoutSuccess';
import AuthCallback from './pages/AuthCallback';
import Admin from './pages/Admin';
import Layout from './components/Layout';

function AppRouter() {
  const location = useLocation();
  
  // CRITICAL: Check for session_id synchronously during render
  // This prevents race conditions by processing OAuth callback FIRST
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/checkout/success" element={<CheckoutSuccess />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/eggs" element={<Eggs />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/hens" element={<Hens />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: 40,
            height: 40,
            border: '3px solid var(--bg-surface)',
            borderTop: '3px solid var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: 'var(--text-secondary)' }}>Laddar...</p>
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
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
