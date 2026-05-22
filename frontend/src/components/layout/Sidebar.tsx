import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import { useAuthStore } from '../../store/auth.store';

const navItems = [
  { path: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { path: '/factory', icon: '🏭', label: 'Factory' },
  { path: '/pfep', icon: '📋', label: 'PFEP' },
  { path: '/production', icon: '⚙️', label: 'Production' },
  { path: '/quality', icon: '✓', label: 'Quality' },
  { path: '/stores', icon: '📦', label: 'Stores' },
  { path: '/purchase', icon: '🛒', label: 'Purchase' },
  { path: '/dispatch', icon: '🚚', label: 'Dispatch' },
  { path: '/toc', icon: '📊', label: 'TOC' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${collapsed ? 'w-16' : 'w-56'} bg-brand-dark min-h-screen flex flex-col transition-all duration-200`}>
      <div className="flex items-center justify-between p-4 border-b border-blue-800">
        {!collapsed && <span className="text-white text-xs font-medium uppercase tracking-wider">Menu</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-blue-300 hover:text-white transition-colors ml-auto"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${isActive
                  ? 'bg-brand-primary text-white border-l-4 border-brand-accent'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white border-l-4 border-transparent'
                }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-blue-800">
        {!collapsed && (
          <p className="text-blue-400 text-xs text-center">Nuvatin ERP v1.0</p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
