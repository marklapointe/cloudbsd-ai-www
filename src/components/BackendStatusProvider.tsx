import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import socket from '../api/socket';

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
  const [isOffline, setIsOffline] = useState(false);

  const checkHealth = async () => {
    try {
      await api.get('/health', { timeout: 3000 });
      setIsOffline(false);
    } catch (error) {
      setIsOffline(true);
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
    <BackendStatusContext.Provider value={{ isOffline, setOffline: setIsOffline }}>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center py-2 px-4 font-bold shadow-lg">
          Backend is offline. Some features may be unavailable. Retrying...
        </div>
      )}
      <div className={isOffline ? 'pt-10' : ''}>
        {children}
      </div>
    </BackendStatusContext.Provider>
  );
};
