import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { identifyUser as identifyRevenueCatUser, logoutUser as logoutRevenueCatUser } from '../services/revenuecat';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Runtime guard - log warning if API_URL is not configured
if (!API_URL) {
  console.error('CRITICAL: EXPO_PUBLIC_BACKEND_URL is not configured. API calls will fail.');
} else if (__DEV__) {
  console.log('[Auth] API_URL:', API_URL);
}

// Global session token for API calls (stored in memory + AsyncStorage)
let sessionToken: string | null = null;

// Grace period flag - prevents logout during bootstrap
let loginInProgress = false;
let lastLoginTime = 0;
const LOGIN_GRACE_PERIOD_MS = 5000; // 5 seconds grace period after login

// Check if we're in grace period
const isInGracePeriod = (): boolean => {
  return loginInProgress || (Date.now() - lastLoginTime < LOGIN_GRACE_PERIOD_MS);
};

// Initialize token from AsyncStorage on app start
AsyncStorage.getItem('session_token').then(token => {
  if (token) {
    sessionToken = token;
    if (__DEV__) {
      console.log('[Auth] Session token restored from storage, last 6 chars:', token.slice(-6));
    }
  }
});

// Export function to get auth headers for API calls
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  return headers;
};

// Export function to check if we have a token
export const hasSessionToken = (): boolean => {
  return sessionToken !== null && sessionToken.length > 0;
};

// Export function to get masked token for logging
export const getMaskedToken = (): string => {
  if (!sessionToken) return 'null';
  return `...${sessionToken.slice(-6)}`;
};

// Export function to set session token
export const setSessionToken = async (token: string | null) => {
  sessionToken = token;
  if (token) {
    await AsyncStorage.setItem('session_token', token);
    lastLoginTime = Date.now();
    if (__DEV__) {
      console.log('[Auth] Session token set, last 6 chars:', token.slice(-6));
    }
  } else {
    await AsyncStorage.removeItem('session_token');
    if (__DEV__) {
      console.log('[Auth] Session token cleared');
    }
  }
};

// Export grace period check for apiFetch
export const shouldIgnore401 = (endpoint: string): boolean => {
  // During grace period, don't logout on 401 from auth/me
  if (isInGracePeriod() && endpoint.includes('/api/auth/me')) {
    if (__DEV__) {
      console.log('[Auth] Ignoring 401 from /api/auth/me during grace period');
    }
    return true;
  }
  return false;
};

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
        loginInProgress = true;
        
        try {
          if (__DEV__) {
            console.log('[Auth] Login attempt to:', API_URL);
          }
          
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            loginInProgress = false;
            set({ isLoading: false, error: data.detail || 'Inloggning misslyckades' });
            return false;
          }
          
          // Save session token for native app auth BEFORE setting state
          if (data.session_token) {
            await setSessionToken(data.session_token);
            if (__DEV__) {
              console.log('[Auth] Login successful, token received and stored');
            }
          } else {
            if (__DEV__) {
              console.warn('[Auth] Login successful but NO session_token in response!');
            }
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
          
          loginInProgress = false;
          return true;
        } catch (error) {
          loginInProgress = false;
          if (__DEV__) {
            console.error('[Auth] Login error:', error);
          }
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
            headers: getAuthHeaders(),
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        // Clear session token
        await setSessionToken(null);
        
        // Logout from RevenueCat
        logoutRevenueCatUser().catch(err => {
          console.warn('RevenueCat logout failed:', err);
        });
        
        set({ user: null, isAuthenticated: false, error: null });
      },
      
      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include',
            headers: getAuthHeaders(),
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
