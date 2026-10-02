import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Notification } from '../types';
import { authService, AuthResponse } from '../services/authService';
import { notificationService } from '../services/notificationService';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  allUsers: User[];
  notifications: Notification[];
  unreadNotifsCount: number;
  login: (email: string, password?: string) => Promise<AuthResponse>;
  signup: (data: {
    name: string;
    email: string;
    employeeId: string;
    department: string;
    organization: string;
    phone?: string;
  }) => Promise<AuthResponse>;
  requestDemoOtp: (email: string) => Promise<AuthResponse>;
  verifyDemoOtp: (email: string, otp: string) => Promise<AuthResponse>;
  switchUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadInitialState = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await authService.getCurrentUser();
      const users = await authService.getAllUsers();
      setCurrentUser(user);
      setAllUsers(users);
      if (user) {
        const notifs = await notificationService.getNotifications(user.id);
        setNotifications(notifs);
      } else {
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialState();
  }, [loadInitialState]);

  const refreshNotifications = async () => {
    if (currentUser) {
      const notifs = await notificationService.getNotifications(currentUser.id);
      setNotifications(notifs);
    }
  };

  const login = async (email: string, password?: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        const notifs = await notificationService.getNotifications(res.user.id);
        setNotifications(notifs);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: {
    name: string;
    email: string;
    employeeId: string;
    department: string;
    organization: string;
    phone?: string;
  }): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const res = await authService.signup(data);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        const users = await authService.getAllUsers();
        setAllUsers(users);
        const notifs = await notificationService.getNotifications(res.user.id);
        setNotifications(notifs);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const requestDemoOtp = async (email: string): Promise<AuthResponse> => {
    return authService.requestDemoOtp(email);
  };

  const verifyDemoOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const res = await authService.verifyDemoOtp(email, otp);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        const notifs = await notificationService.getNotifications(res.user.id);
        setNotifications(notifs);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const user = await authService.switchUser(userId);
      setCurrentUser(user);
      if (user) {
        const notifs = await notificationService.getNotifications(user.id);
        setNotifications(notifs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setCurrentUser(null);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDemoData = async () => {
    setIsLoading(true);
    try {
      await authService.resetData();
      await loadInitialState();
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = async () => {
    if (currentUser) {
      await notificationService.markAllAsRead(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        allUsers,
        notifications,
        unreadNotifsCount,
        login,
        signup,
        requestDemoOtp,
        verifyDemoOtp,
        switchUser,
        logout,
        resetDemoData,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
