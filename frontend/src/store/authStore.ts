import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { identifyUser as identifyRevenueCatUser, logoutUser as logoutRevenueCatUser } from '../services/revenuecat';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Runtime guard - log warning if API_URL is not configured
if (!API_URL) {
  console.error('CRITICAL: EXPO_PUBLIC_BACKEND_URL is not configured. API calls will fail.');
}

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, acceptedTerms: boolean, acceptedMarketing: boolean) => Promise<{ success: boolean; message?: string; requiresVerification?: boolean; email?: string }>;
  verifyRegistration: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyResetCode: (email: string, code: string) => Promise<{ success: boolean; message: string; token?: string }>;
  resetPasswordWithCode: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            set({ isLoading: false, error: data.detail || 'Inloggning misslyckades' });
            return false;
          }
          
          set({
            user: {
              user_id: data.user_id,
              email: data.email,
              name: data.name || '',
              picture: data.picture,
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // Identify user with RevenueCat for subscription sync
          if (data.user_id) {
            identifyRevenueCatUser(data.user_id).catch(err => {
              console.warn('RevenueCat identify failed:', err);
            });
          }
          
          return true;
        } catch (error) {
          set({ isLoading: false, error: 'Kunde inte ansluta till servern' });
          return false;
        }
      },
      
      register: async (email: string, password: string, name: string, acceptedTerms: boolean, acceptedMarketing: boolean) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email,
              password,
              name,
              accepted_terms: acceptedTerms,
              accepted_marketing: acceptedMarketing,
            }),
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            set({ isLoading: false, error: data.detail || 'Registrering misslyckades' });
            return { success: false, message: data.detail };
          }
          
          // Check if verification is required
          if (data.requires_verification) {
            set({ isLoading: false, error: null });
            return { 
              success: true, 
              requiresVerification: true,
              email: data.email,
              message: data.message 
            };
          }
          
          // Legacy flow: direct login after register
          set({
            user: {
              user_id: data.user_id,
              email: data.email,
              name: data.name || '',
              picture: data.picture,
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, message: data.message };
        } catch (error) {
          set({ isLoading: false, error: 'Kunde inte ansluta till servern' });
          return { success: false, message: 'Kunde inte ansluta till servern' };
        }
      },
      
      verifyRegistration: async (email: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_URL}/api/auth/verify-registration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, code }),
          });
          
          const data = await res.json();
          set({ isLoading: false });
          
          if (!res.ok) {
            return { success: false, message: data.detail || 'Verifiering misslyckades' };
          }
          
          // User is now logged in
          set({
            user: {
              user_id: data.user_id,
              email: data.email,
              name: data.name || '',
              picture: null,
            },
            isAuthenticated: true,
            error: null,
          });
          
          return { success: true, message: data.message || 'Kontot skapat!' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, message: 'Kunde inte ansluta till servern' };
        }
      },
      
      resendVerification: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          
          const data = await res.json();
          set({ isLoading: false });
          
          if (!res.ok) {
            return { success: false, message: data.detail || 'Kunde inte skicka ny kod' };
          }
          
          return { success: true, message: data.message || 'Ny kod skickad!' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, message: 'Kunde inte ansluta till servern' };
        }
      },
      
      logout: async () => {
        try {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({ user: null, isAuthenticated: false, error: null });
      },
      
      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include',
          });
          
          if (res.ok) {
            const data = await res.json();
            set({
              user: {
                user_id: data.user_id,
                email: data.email,
                name: data.name || '',
                picture: data.picture,
              },
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
      
      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          
          const data = await res.json();
          set({ isLoading: false });
          
          // Always return success to not reveal if email exists
          // The user will find out when they try to verify the code
          return { 
            success: true, 
            message: data.message || 'Om e-postadressen finns kommer du få en kod.',
            codeSent: data.code_sent === true
          };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, message: 'Kunde inte ansluta till servern' };
        }
      },
      
      verifyResetCode: async (email: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
          });
          
          const data = await res.json();
          set({ isLoading: false });
          
          if (!res.ok) {
            return { success: false, message: data.detail || 'Felaktig kod' };
          }
          
          return { 
            success: true, 
            token: data.token,
            message: data.message || 'Koden verifierad!' 
          };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, message: 'Kunde inte ansluta till servern' };
        }
      },
      
      resetPasswordWithCode: async (token: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_URL}/api/auth/reset-password-with-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword }),
          });
          
          const data = await res.json();
          set({ isLoading: false });
          
          if (!res.ok) {
            return { success: false, message: data.detail || 'Kunde inte ändra lösenord' };
          }
          
          return { 
            success: true, 
            message: data.message || 'Lösenordet har ändrats!' 
          };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, message: 'Kunde inte ansluta till servern' };
        }
      },
      
      clearError: () => set({ error: null }),
      
      setUser: (user: User | null) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
