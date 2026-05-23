import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './store/auth.store';
import Factory from './pages/factory/Factory';
import PFEP from './pages/pfep/PFEP';
import Production from './pages/production/Production';
import Quality from './pages/quality/Quality';
import Stores from './pages/stores/Stores';
import Purchase from './pages/purchase/Purchase';
import Dispatch from './pages/dispatch/Dispatch';
import TOC from './pages/toc/TOC';
import Settings from './pages/settings/Settings';
import Finance from './pages/finance/Finance';
import Maintenance from './pages/maintenance/Maintenance';
import Reports from './pages/reports/Reports';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/factory" element={<ProtectedRoute><Factory /></ProtectedRoute>} />
          <Route path="/pfep" element={<ProtectedRoute><PFEP /></ProtectedRoute>} />
          <Route path="/production" element={<ProtectedRoute><Production /></ProtectedRoute>} />
          <Route path="/quality" element={<ProtectedRoute><Quality /></ProtectedRoute>} />
          <Route path="/stores" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
          <Route path="/purchase" element={<ProtectedRoute><Purchase /></ProtectedRoute>} />
          <Route path="/dispatch" element={<ProtectedRoute><Dispatch /></ProtectedRoute>} />
          <Route path="/toc" element={<ProtectedRoute><TOC /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/pfep" element={<ProtectedRoute><PFEP /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
