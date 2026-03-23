import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import socket from '../api/socket';
import { useTranslation } from 'react-i18next';

interface BackendStatusContextType {
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
}

const BackendStatusContext = createContext<BackendStatusContextType>({ 
  isOffline: false,
  setOffline: () => {}
});

export const useBackendStatus = () => useContext(BackendStatusContext);

export const BackendStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Add interceptor to catch network errors globally
    const interceptor = api.interceptors.response.use(
      (response) => {
        setIsOffline(false);
        return response;
      },
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
      api.interceptors.response.eject(interceptor);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <BackendStatusContext.Provider value={{ isOffline, setOffline: setIsOffline }}>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center py-2 px-4 font-bold shadow-lg">
          {t('layout.backend_offline')}
        </div>
      )}
      <div className={isOffline ? 'pt-10' : ''}>
        {children}
      </div>
    </BackendStatusContext.Provider>
  );
};
