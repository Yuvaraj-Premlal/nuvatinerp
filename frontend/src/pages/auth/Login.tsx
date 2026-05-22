import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', tenant_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', form);
      login(res.data.data.user, res.data.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-primary flex">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Nuvatin ERP</h1>
          <p className="text-blue-200 mt-2 text-sm">Manufacturing Intelligence Platform</p>
        </div>
        <div>
          <h2 className="text-white text-4xl font-bold leading-tight">
            Your factory.<br />
            Fully visible.<br />
            Always intelligent.
          </h2>
          <p className="text-blue-200 mt-6 text-lg leading-relaxed">
            Real-time production tracking, die health monitoring,
            and AI-driven insights — built exclusively for manufacturing.
          </p>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-white text-2xl font-bold">37</p>
            <p className="text-blue-200 text-sm">Data tables</p>
          </div>
          <div>
            <p className="text-white text-2xl font-bold">24</p>
            <p className="text-blue-200 text-sm">API modules</p>
          </div>
          <div>
            <p className="text-white text-2xl font-bold">6</p>
            <p className="text-blue-200 text-sm">AI agents</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
            <p className="text-text-secondary mt-1">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Company Code
              </label>
              <input
                type="text"
                placeholder="e.g. ALUSMITH001"
                value={form.tenant_code}
                onChange={(e) => setForm({ ...form, tenant_code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Email address
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary text-white py-3 rounded-lg font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-text-secondary text-xs mt-8">
            Powered by <span className="font-semibold text-brand-primary">Nuvatin</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
