// AppContext - stores currentTenant, currentManager; exposes useApp() hook
// Based on TASKS.md Phase 8.8

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getVoiceProviders, authGetMe, authLogout } from '../services/api';
import type { Tenant, Manager, Owner, VoiceProviderCapability, VoiceProviderId } from '../types';

interface AppContextType {
  currentTenant: Tenant | null;
  currentManager: Manager | Owner | null;
  userRole: 'tenant' | 'manager' | 'owner' | null;
  voiceProvider: VoiceProviderId;
  voiceProviders: VoiceProviderCapability[];
  setCurrentTenant: (tenant: Tenant | null) => void;
  setCurrentManager: (manager: Manager | Owner | null) => void;
  setUserRole: (role: 'tenant' | 'manager' | 'owner' | null) => void;
  setVoiceProvider: (provider: VoiceProviderId) => void;
  refreshVoiceProviders: () => Promise<void>;
  clearUser: () => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentManager, setCurrentManager] = useState<Manager | Owner | null>(null);
  const [userRole, setUserRole] = useState<'tenant' | 'manager' | 'owner' | null>(null);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProviderId>('elevenlabs');
  const [voiceProviders, setVoiceProviders] = useState<VoiceProviderCapability[]>([]);

  const refreshVoiceProviders = async () => {
    try {
      const response = await getVoiceProviders();
      const enabledProviders = response.providers.filter((provider) => provider.enabled);
      const savedProvider = localStorage.getItem('voice_provider') as VoiceProviderId | null;
      const selectedProvider = enabledProviders.find((provider) => provider.id === savedProvider)
        ? savedProvider
        : enabledProviders[0]?.id ?? response.default_provider;

      setVoiceProviders(response.providers);
      setVoiceProvider(selectedProvider ?? 'elevenlabs');
    } catch (error) {
      console.error('Failed to load voice providers:', error);
      setVoiceProvider('elevenlabs');
    }
  };

  // Load user data from localStorage on mount
  useEffect(() => {
    const savedTenant = localStorage.getItem('current_tenant');
    const savedManager = localStorage.getItem('current_manager');
    const savedRole = localStorage.getItem('user_role');
    const savedVoiceProvider = localStorage.getItem('voice_provider') as VoiceProviderId | null;

    if (savedTenant) {
      setCurrentTenant(JSON.parse(savedTenant));
    }
    if (savedManager) {
      setCurrentManager(JSON.parse(savedManager));
    }
    if (savedRole) {
      setUserRole(savedRole as 'tenant' | 'manager' | 'owner');
    }
    if (savedVoiceProvider) {
      setVoiceProvider(savedVoiceProvider);
    }

    refreshVoiceProviders();
  }, []);

  // Stale-while-revalidate: if auth_token exists, refresh manager profile from /auth/me in background
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    authGetMe()
      .then((profile) => {
        const role = profile.role as 'manager' | 'owner';
        // Build a manager/owner shape from the profile
        const actor: Manager | Owner = role === 'owner'
          ? {
              id: profile.id,
              name: profile.name,
              email: profile.email ?? '',
              phone: profile.phone ?? '',
              owned_properties: profile.owned_properties ?? [],
            }
          : {
              id: profile.id,
              name: profile.name,
              email: profile.email ?? '',
              phone: profile.phone ?? '',
              managed_properties: profile.managed_properties ?? [],
            };

        localStorage.setItem('current_manager', JSON.stringify(actor));
        localStorage.setItem('user_role', role);
        setCurrentManager(actor);
        setUserRole(role);
      })
      .catch(() => {
        // 401 or network failure — clear auth state but keep voice_provider and tenant session
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('current_manager');
        localStorage.removeItem('user_role');
        setCurrentManager(null);
        setUserRole(null);
      });
  }, []);

  // Persist currentTenant to localStorage when it changes
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

  useEffect(() => {
    localStorage.setItem('voice_provider', voiceProvider);
  }, [voiceProvider]);

  const clearUser = () => {
    setCurrentTenant(null);
    setCurrentManager(null);
    setUserRole(null);
    localStorage.removeItem('current_tenant');
    localStorage.removeItem('current_manager');
    localStorage.removeItem('user_role');
  };

  // Manager/owner logout: invalidates backend session, clears auth state.
  // Does NOT clear tenant session or voice_provider.
  const logout = async (): Promise<void> => {
    await authLogout(); // fire and forget — never throws
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('current_manager');
    localStorage.removeItem('user_role');
    setCurrentManager(null);
    setUserRole(null);
  };

  return (
    <AppContext.Provider
      value={{
        currentTenant,
        currentManager,
        userRole,
        voiceProvider,
        voiceProviders,
        setCurrentTenant,
        setCurrentManager,
        setUserRole,
        setVoiceProvider,
        refreshVoiceProviders,
        clearUser,
        logout
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
