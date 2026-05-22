import React from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';

const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-14 bg-white border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400"></div>
        <span className="font-semibold text-text-primary">{user?.tenant_name}</span>
        <span className="text-text-secondary text-sm">|</span>
        <span className="text-text-secondary text-sm capitalize">{user?.role}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-text-primary">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-text-secondary">{user?.email}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-sm font-bold">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-text-secondary hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
        <span className="text-brand-primary font-bold text-sm">Nuvatin ERP</span>
      </div>
    </div>
  );
};

export default TopBar;
