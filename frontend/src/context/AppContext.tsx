// AppContext - stores currentTenant, currentManager; exposes useApp() hook
// Based on TASKS.md Phase 8.8

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Tenant, Manager } from '../types';

interface AppContextType {
  currentTenant: Tenant | null;
  currentManager: Manager | null;
  userRole: 'tenant' | 'manager' | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  setCurrentManager: (manager: Manager | null) => void;
  setUserRole: (role: 'tenant' | 'manager' | null) => void;
  clearUser: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentManager, setCurrentManager] = useState<Manager | null>(null);
  const [userRole, setUserRole] = useState<'tenant' | 'manager' | null>(null);

  // Load user data from localStorage on mount
  useEffect(() => {
    const savedTenant = localStorage.getItem('current_tenant');
    const savedManager = localStorage.getItem('current_manager');
    const savedRole = localStorage.getItem('user_role');

    if (savedTenant) {
      setCurrentTenant(JSON.parse(savedTenant));
    }
    if (savedManager) {
      setCurrentManager(JSON.parse(savedManager));
    }
    if (savedRole) {
      setUserRole(savedRole as 'tenant' | 'manager');
    }
  }, []);

  // Save user data to localStorage when it changes
  useEffect(() => {
    if (currentTenant) {
      localStorage.setItem('current_tenant', JSON.stringify(currentTenant));
    } else {
      localStorage.removeItem('current_tenant');
    }
  }, [currentTenant]);

  useEffect(() => {
    if (currentManager) {
      localStorage.setItem('current_manager', JSON.stringify(currentManager));
    } else {
      localStorage.removeItem('current_manager');
    }
  }, [currentManager]);

  useEffect(() => {
    if (userRole) {
      localStorage.setItem('user_role', userRole);
    } else {
      localStorage.removeItem('user_role');
    }
  }, [userRole]);

  const clearUser = () => {
    setCurrentTenant(null);
    setCurrentManager(null);
    setUserRole(null);
    localStorage.removeItem('current_tenant');
    localStorage.removeItem('current_manager');
    localStorage.removeItem('user_role');
  };

  return (
    <AppContext.Provider
      value={{
        currentTenant,
        currentManager,
        userRole,
        setCurrentTenant,
        setCurrentManager,
        setUserRole,
        clearUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
