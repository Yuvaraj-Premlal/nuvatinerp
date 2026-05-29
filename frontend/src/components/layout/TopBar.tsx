import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { fmtDateTime } from '../../utils/datetime';

const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAlerts, setShowAlerts] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/api/alerts').then(r => r.data.data),
    refetchInterval: 30000,
    staleTime: 0
  });

  const alerts = alertsData || [];
  const unreadCount = alerts.filter((a: any) => !a.is_read).length;

  const readMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/alerts/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] })
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/alerts/${id}/resolve`, { resolved_by: user?.first_name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] })
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const severityColor: any = {
    critical: 'bg-red-50 border-red-200 text-red-700',
    high: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const severityIcon: any = {
    critical: '🚨',
    high: '⚠',
    info: 'ℹ'
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="h-14 bg-white border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400"></div>
        <span className="font-semibold text-text-primary">{user?.tenant_name}</span>
        <span className="text-text-secondary text-sm">|</span>
        <span className="text-text-secondary text-sm capitalize">{user?.role}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Alert Bell */}
        <div ref={alertRef} className="relative">
          <button onClick={() => {
            setShowAlerts(!showAlerts);
            alerts.filter((a: any) => !a.is_read).forEach((a: any) => readMutation.mutate(a.id));
          }} className="relative p-1.5 rounded-lg hover:bg-surface transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-10 w-96 bg-white rounded-xl shadow-lg border border-border z-50 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <p className="font-medium text-text-primary text-sm">Alerts & Notifications</p>
                <span className="text-xs text-text-secondary">{alerts.length} total</span>
              </div>
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-text-secondary text-sm">No alerts</div>
              ) : (
                <div className="divide-y divide-border">
                  {alerts.map((a: any) => (
                    <div key={a.id} className={`p-3 ${!a.is_read ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-sm mt-0.5">{severityIcon[a.severity] || 'ℹ'}</span>
                          <div>
                            <p className="text-xs text-text-primary leading-relaxed">{a.message}</p>
                            <p className="text-xs text-text-secondary mt-1">{fmtDateTime(a.created_at)}</p>
                          </div>
                        </div>
                        {!a.is_resolved && (
                          <button onClick={() => resolveMutation.mutate(a.id)}
                            className="text-xs text-green-600 hover:text-green-700 whitespace-nowrap">
                            Resolve
                          </button>
                        )}
                      </div>
                      {a.is_resolved && <span className="text-xs text-green-500 mt-1 block">✓ Resolved</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-sm font-medium text-text-primary">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-text-secondary">{user?.email}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-sm font-bold">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <button onClick={handleLogout} className="text-xs text-text-secondary hover:text-red-500 transition-colors">
          Sign out
        </button>
        <span className="text-brand-primary font-bold text-sm">Nuvatin ERP</span>
      </div>
    </div>
  );
};

export default TopBar;
