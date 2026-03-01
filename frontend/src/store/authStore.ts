import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { identifyUser as identifyRevenueCatUser, logoutUser as logoutRevenueCatUser } from '../services/revenuecat';
import config from '../config/env';

const API_URL = config.apiBaseUrl;

// Runtime guard - log warning if API_URL is not configured
if (!API_URL) {
  console.error('CRITICAL: API_URL is not configured. API calls will fail.');
} else if (__DEV__) {
  console.log('[Auth] API_URL:', API_URL);
}

// Global session token for API calls (stored in memory + AsyncStorage)
let sessionToken: string | null = null;

// Grace period flag - prevents logout during bootstrap
let loginInProgress = false;
let lastLoginTime = 0;
const LOGIN_GRACE_PERIOD_MS = 10000; // 10 seconds grace period after login (increased from 5s)

// Track if token has been initialized from storage
let tokenInitialized = false;
let tokenInitPromise: Promise<void> | null = null;

// Check if we're in grace period
const isInGracePeriod = (): boolean => {
  const inGrace = loginInProgress || (Date.now() - lastLoginTime < LOGIN_GRACE_PERIOD_MS);
  if (__DEV__ && inGrace) {
    console.log(`[Auth] Grace period active: loginInProgress=${loginInProgress}, timeSinceLogin=${Date.now() - lastLoginTime}ms`);
  }
  return inGrace;
};

// Initialize token from AsyncStorage on app start
const initializeToken = async (): Promise<void> => {
  try {
    // Check if we're in a browser environment without window (SSR)
    if (typeof window === 'undefined') {
      if (__DEV__) {
        console.log('[Auth] Skipping token initialization (SSR environment)');
      }
      tokenInitialized = true;
      return;
    }
    
    const token = await AsyncStorage.getItem('session_token');
    if (token) {
      sessionToken = token;
      if (__DEV__) {
        console.log('[Auth] Session token restored from storage, last 6 chars:', token.slice(-6));
      }
    } else {
      if (__DEV__) {
        console.log('[Auth] No session token in storage');
      }
    }
  } catch (e) {
    console.error('[Auth] Failed to restore token from storage:', e);
  }
  tokenInitialized = true;
};

// Start initialization immediately (but only in client environment)
if (typeof window !== 'undefined') {
  tokenInitPromise = initializeToken();
} else {
  tokenInitialized = true;
}

// Export function to wait for token initialization
export const waitForTokenInit = async (): Promise<void> => {
  if (tokenInitPromise) {
    await tokenInitPromise;
  }
};

// Export function to get auth headers for API calls (sync version)
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
    if (__DEV__) {
      console.log(`[Auth] getAuthHeaders: Adding Authorization header, token: ...${sessionToken.slice(-6)}`);
    }
  } else {
    if (__DEV__) {
      console.log('[Auth] getAuthHeaders: NO token available');
    }
  }
  return headers;
};

// Export async version that ensures token is loaded from storage first
export const getAuthHeadersAsync = async (): Promise<Record<string, string>> => {
  // If token not initialized yet, wait for it
  if (!tokenInitialized && tokenInitPromise) {
    await tokenInitPromise;
  }
  
  // If still no token in memory, try to load from storage
  if (!sessionToken) {
    try {
      const storedToken = await AsyncStorage.getItem('session_token');
      if (storedToken) {
        sessionToken = storedToken;
        if (__DEV__) {
          console.log(`[Auth] getAuthHeadersAsync: Loaded token from storage: ...${storedToken.slice(-6)}`);
        }
      }
    } catch (e) {
      console.error('[Auth] getAuthHeadersAsync: Failed to load token from storage:', e);
    }
  }
  
  return getAuthHeaders();
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

// Export function to get the raw token (for special cases)
export const getSessionToken = (): string | null => {
  return sessionToken;
};

// Export function to set session token - SYNCHRONOUSLY sets in memory, async for storage
export const setSessionToken = async (token: string | null): Promise<void> => {
  // IMPORTANT: Set in memory FIRST (synchronous) before any async operations
  const previousToken = sessionToken;
  sessionToken = token;
  
  if (token) {
    lastLoginTime = Date.now();
    loginInProgress = true; // Start grace period
    
    if (__DEV__) {
      console.log(`[Auth] Session token set IMMEDIATELY in memory, last 6 chars: ${token.slice(-6)}`);
      console.log(`[Auth] Grace period started at ${lastLoginTime}`);
    }
    
    // Then persist to storage (async)
    try {
      await AsyncStorage.setItem('session_token', token);
      if (__DEV__) {
        console.log('[Auth] Token persisted to AsyncStorage');
      }
    } catch (e) {
      console.error('[Auth] Failed to persist token to AsyncStorage:', e);
    }
    
    // End the loginInProgress flag after a short delay
    setTimeout(() => {
      loginInProgress = false;
      if (__DEV__) {
        console.log('[Auth] loginInProgress flag cleared');
      }
    }, 2000);
  } else {
    if (__DEV__) {
      console.log('[Auth] Session token cleared from memory');
    }
    try {
      await AsyncStorage.removeItem('session_token');
      if (__DEV__) {
        console.log('[Auth] Token removed from AsyncStorage');
      }
    } catch (e) {
      console.error('[Auth] Failed to remove token from AsyncStorage:', e);
    }
  }
};

// Export grace period check for apiFetch
export const shouldIgnore401 = (endpoint: string): boolean => {
  const inGrace = isInGracePeriod();
  
  // During grace period, don't logout on 401 from ANY endpoint
  // This prevents race conditions where token is set but async operations haven't completed
  if (inGrace) {
    if (__DEV__) {
      console.log(`[Auth] IGNORING 401 from ${endpoint} - in grace period`);
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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
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
      
      login: async (email: string, password: string, rememberMe: boolean = false) => {
        set({ isLoading: true, error: null });
        loginInProgress = true;
        
        try {
          if (__DEV__) {
            console.log('[Auth] Login attempt to:', API_URL, 'rememberMe:', rememberMe);
          }
          
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, remember_me: rememberMe }),
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
              console.log('[Auth] Token now in memory, ready for API calls');
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
          
          // NOTE: loginInProgress is cleared by setSessionToken after a delay
          // This ensures grace period remains active for a short while after login completes
          return true;
        } catch (error) {
          // NOTE: loginInProgress is cleared by setSessionToken's timeout
          if (__DEV__) {
            console.error('[Auth] Login error:', error);
          }
          set({ isLoading: false, error: 'Kunde inte ansluta till servern' });
          return false;
        }
      },
      
      register: async (email: string, password: string, name: string, acceptedTerms: boolean, acceptedMarketing: boolean, referralCode?: string) => {
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
              referral_code: referralCode || undefined,
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
          
          // CRITICAL: Save the session token for API calls!
          if (data.session_token) {
            await setSessionToken(data.session_token);
            if (__DEV__) {
              console.log('[Auth] verifyRegistration: Session token saved');
            }
          }
          
          // User is now logged in
          set({
            user: {
              user_id: data.user_id,
              email: data.email,
              name: data.name || '',
              picture: undefined,
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
