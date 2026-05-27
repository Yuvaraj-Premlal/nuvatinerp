import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0';

const FifoOverrideApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fifoOverrides'],
    queryFn: () => api.get('/api/stock/fifo-overrides').then(r => r.data.data),
    refetchInterval: 30000
  });

  const overrides = data || [];

  const actionMutation = useMutation({
    mutationFn: ({ id, action, approved_by, rejection_note }: any) =>
      api.post(`/api/stock/fifo-override-approve/${id}`, { action, approved_by, rejection_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fifoOverrides'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      refetch();
    },
    onError: (err: any) => alert(err.response?.data?.error || 'Action failed')
  });

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    const note = action === 'reject' ? prompt('Rejection reason:') : null;
    if (action === 'reject' && !note) return;
    actionMutation.mutate({ id, action, approved_by: 'Owner', rejection_note: note });
  };

  if (isLoading) return <div className="text-center py-8 text-brand-primary animate-pulse">Loading...</div>;

  if (overrides.length === 0) return (
    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
      <p className="text-4xl mb-3">✅</p>
      <p className="font-semibold text-text-primary">No pending FIFO override requests</p>
      <p className="text-text-secondary text-sm mt-1">All material issues are following FIFO order</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <p className="font-semibold">{overrides.length} pending FIFO override request{overrides.length > 1 ? 's' : ''}</p>
        <p className="text-xs mt-0.5">Review and approve or reject. Requests expire after 60 minutes.</p>
      </div>
      <div className="space-y-3">
        {overrides.map((o: any) => {
          const expiresAt = new Date(o.expires_at);
          const minutesLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 60000));
          return (
            <div key={o.id} className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-text-primary">{o.item?.item_name}</p>
                  <p className="text-text-secondary text-xs">{o.item?.item_code}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${minutesLeft < 15 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                  ⏱ {minutesLeft} min left
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="text-green-600 font-medium">Available (older — FIFO)</p>
                  <p className="font-bold text-green-700 mt-0.5">{o.available_grn?.grn_number}</p>
                  <p className="text-green-600">{new Date(o.available_grn?.received_date).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <p className="text-amber-600 font-medium">Requested (newer)</p>
                  <p className="font-bold text-amber-700 mt-0.5">{o.requested_grn?.grn_number}</p>
                  <p className="text-amber-600">{new Date(o.requested_grn?.received_date).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              <div className="bg-surface rounded-lg p-2 mb-3 text-xs">
                <p className="text-text-secondary">Reason: <span className="font-medium text-text-primary">{o.reason}</span></p>
                <p className="text-text-secondary mt-0.5">Requested by: <span className="font-medium">{o.requested_by}</span> | {new Date(o.created_at).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAction(o.id, 'reject')}
                  disabled={actionMutation.isPending}
                  className="flex-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">
                  ✕ Reject
                </button>
                <button onClick={() => handleAction(o.id, 'approve')}
                  disabled={actionMutation.isPending}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50">
                  ✓ Approve Override
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FifoOverrideApprovals;
