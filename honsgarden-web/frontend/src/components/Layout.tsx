import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const navItems = [
  { path: '/', label: 'Hem', icon: '🏠' },
  { path: '/eggs', label: 'Ägg', icon: '🥚' },
  { path: '/finance', label: 'Ekonomi', icon: '💰' },
  { path: '/statistics', label: 'Statistik', icon: '📊' },
  { path: '/hens', label: 'Hönor', icon: '❤️' },
  { path: '/settings', label: 'Inställningar', icon: '⚙️' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  
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
        </nav>
        
        <div className="sidebar-footer">
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
        {navItems.slice(0, 5).map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
