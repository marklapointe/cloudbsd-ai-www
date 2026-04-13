import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'ad';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  message: string;
  details?: string;
  link?: string;
  timestamp: Date;
  is_read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  highPriorityNotifications: Notification[];
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const mapped = res.data.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp),
        is_read: n.is_read === 1 || n.is_read === true
      }));
      setNotifications(mapped);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    // Only persistent notifications (numeric IDs) can be marked as read in backend
    if (!isNaN(Number(id))) {
      try {
        await api.post(`/notifications/read/${id}`);
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }
    
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ));
  };

  const dismissNotification = async (id: string) => {
    try {
      await api.post(`/notifications/dismiss/${id}`);
    } catch (err) {
      console.error('Failed to dismiss notification', err);
    }
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const deleteNotification = async (id: string) => {
    if (!isNaN(Number(id))) {
      try {
        await api.delete(`/notifications/${id}`);
      } catch (err) {
        console.error('Failed to delete notification', err);
      }
    }
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const highPriorityNotifications = notifications.filter(n => n.priority === 'high' && !n.is_read);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      highPriorityNotifications,
      loading, 
      refreshNotifications,
      markAsRead,
      dismissNotification,
      deleteNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
