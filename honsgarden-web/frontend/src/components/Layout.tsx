import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BUILD_INFO } from '../utils/buildInfo';
import './Layout.css';

const navItems = [
  { path: '/', label: 'Hem', icon: '🏠' },
  { path: '/eggs', label: 'Ägg', icon: '🥚' },
  { path: '/hens', label: 'Hönor', icon: '🐔' },
  { path: '/finance', label: 'Ekonomi', icon: '💰' },
  { path: '/statistics', label: 'Statistik', icon: '📊' },
  { path: '/settings', label: 'Inställningar', icon: '⚙️' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    // Check admin status
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/check', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.is_admin === true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    if (user) checkAdmin();
  }, [user]);
  
  return (
    <div className="layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">🥚</span>
          <h1>Hönsgården</h1>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item admin-nav ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">👑</span>
              <span className="nav-label">Admin</span>
            </NavLink>
          )}
        </nav>
        
        <div className="sidebar-footer">
          <div className="build-info">Build: {BUILD_INFO.timestamp}</div>
          {user && (
            <div className="user-info">
              {user.picture && <img src={user.picture} alt={user.name} className="user-avatar" />}
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          )}
          <button onClick={logout} className="logout-btn">
            Logga ut
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
      
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `mobile-nav-item admin-nav ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">👑</span>
            <span className="mobile-nav-label">Admin</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}
