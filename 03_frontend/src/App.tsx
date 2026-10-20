import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SidebarProvider } from './context/SidebarContext';
import { AppStateProvider } from './context/AppStateContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Forecast } from './pages/Forecast';
import { GisMap } from './pages/GisMap';
import { Convoys } from './pages/Convoys';
import { Alerts } from './pages/Alerts';
import { Simulation } from './pages/Simulation';
import { Reports } from './pages/Reports';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppStateProvider>
            <SidebarProvider>
              <BrowserRouter>
              <Routes>
                {/* Public Authentication Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Operational Theater Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/forecast" element={<Forecast />} />
                    <Route path="/map" element={<GisMap />} />
                    <Route path="/convoys" element={<Convoys />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/simulation" element={<Simulation />} />
                    <Route path="/reports" element={<Reports />} />
                  </Route>
                </Route>

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </SidebarProvider>
        </AppStateProvider>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
  );
};

export default App;
