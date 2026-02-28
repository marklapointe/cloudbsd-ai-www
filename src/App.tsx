import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Index from './pages/Index';
import VMs from './pages/VMs';
import Docker from './pages/Docker';
import Jails from './pages/Jails';
import Podman from './pages/Podman';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import { BackendStatusProvider } from './components/BackendStatusProvider';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <BackendStatusProvider>
      <Router>
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
            path="/docker" 
            element={
              <PrivateRoute>
                <Layout>
                  <Docker />
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
            path="/podman" 
            element={
              <PrivateRoute>
                <Layout>
                  <Podman />
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
      </Router>
    </BackendStatusProvider>
  );
}

export default App;
