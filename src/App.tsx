import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { BackendStatusProvider } from './components/BackendStatusProvider';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Index = lazy(() => import('./pages/Index'));
const VMs = lazy(() => import('./pages/VMs'));
const OCIContainers = lazy(() => import('./pages/OCIContainers'));
const Jails = lazy(() => import('./pages/Jails'));
const Cluster = lazy(() => import('./pages/Cluster'));
const NetworkMap = lazy(() => import('./pages/NetworkMap'));
const Users = lazy(() => import('./pages/Users'));
const Logs = lazy(() => import('./pages/Logs'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-brand-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      <p className="text-brand-600 font-medium animate-pulse">Loading CloudBSD...</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <BackendStatusProvider>
        <Router>
          <NotificationProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/vms" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <VMs />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/containers" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <OCIContainers />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/jails" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Jails />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/cluster" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Cluster />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/network" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <NetworkMap />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/users" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Users />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/logs" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Logs />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/notifications" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Notifications />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <PrivateRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </PrivateRoute>
                  } 
                />
              </Routes>
            </Suspense>
          </NotificationProvider>
        </Router>
      </BackendStatusProvider>
    </ThemeProvider>
  );
}

export default App;
