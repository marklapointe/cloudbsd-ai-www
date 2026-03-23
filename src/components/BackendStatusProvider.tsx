import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import socket from '../api/socket';
import { useTranslation } from 'react-i18next';

interface BackendStatusContextType {
  isOffline: boolean;
  isInitialCheckDone: boolean;
  setOffline: (offline: boolean) => void;
}

const BackendStatusContext = createContext<BackendStatusContextType>({ 
  isOffline: false,
  isInitialCheckDone: false,
  setOffline: () => {}
});

export const useBackendStatus = () => useContext(BackendStatusContext);

export const BackendStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);

  const checkHealth = async () => {
    try {
      console.log('[BackendStatus] Checking health...');
      await api.get('/health', { timeout: 3000 });
      setIsOffline(false);
      console.log('[BackendStatus] Backend is online');
    } catch (error) {
      setIsOffline(true);
      console.error('[BackendStatus] Backend is offline or unreachable:', error instanceof Error ? error.message : error);
    } finally {
      setIsInitialCheckDone(true);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds

    // Add interceptor to catch network errors globally
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response) {
          // Network error (backend down)
          setIsOffline(true);
        }
        return Promise.reject(error);
      }
    );

    // Socket listeners for real-time status
    const onConnect = () => setIsOffline(false);
    const onDisconnect = () => setIsOffline(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      clearInterval(interval);
      api.interceptors.response.eject(interceptor);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <BackendStatusContext.Provider value={{ isOffline, isInitialCheckDone, setOffline: setIsOffline }}>
      {!isInitialCheckDone && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4">
            <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t('layout.connecting')}</h3>
              <p className="text-slate-500">{t('layout.verifying_connection')}</p>
            </div>
          </div>
        </div>
      )}
      {isInitialCheckDone && isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center py-2 px-4 font-bold shadow-lg">
          {t('layout.backend_offline')}
        </div>
      )}
      <div className={(isInitialCheckDone && isOffline) ? 'pt-10' : ''}>
        {children}
      </div>
    </BackendStatusContext.Provider>
  );
};
