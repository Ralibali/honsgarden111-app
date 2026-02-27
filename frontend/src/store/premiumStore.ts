import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  initRevenueCat,
  checkPremiumEntitlement,
  restorePurchases as rcRestorePurchases,
  addCustomerInfoListener,
  purchasePackage,
  ENTITLEMENT_ID,
} from '../services/revenuecat';
import { useAuthStore, getAuthHeaders, setSessionToken, hasSessionToken, getMaskedToken, shouldIgnore401, getSessionToken } from './authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Robust API fetch helper with auth handling and logging
const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Build headers using a fresh Headers object for robustness
  const headers = new Headers();
  
  // Always set Content-Type first
  headers.set('Content-Type', 'application/json');
  
  // Get the current token DIRECTLY (not through getAuthHeaders to ensure freshness)
  const currentToken = getSessionToken();
  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }
  
  // Merge in any additional headers from options
  if (options.headers) {
    const optHeaders = options.headers instanceof Headers 
      ? options.headers 
      : new Headers(options.headers as Record<string, string>);
    optHeaders.forEach((value, key) => {
      if (key.toLowerCase() !== 'authorization' || !currentToken) {
        headers.set(key, value);
      }
    });
  }
  
  const endpoint = url.replace(API_URL, '');
  
  // DEV logging
  if (__DEV__) {
    console.log(`[premiumFetch] ${options.method || 'GET'} ${endpoint}`);
    console.log(`[premiumFetch] Token: ${currentToken ? `...${currentToken.slice(-6)}` : 'NULL'}`);
    console.log(`[premiumFetch] Auth header: ${headers.has('Authorization') ? 'present' : 'MISSING'}`);
  }
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: headers,
  });
  
  // Handle 401 - user needs to login
  if (response.status === 401) {
    if (__DEV__) {
      console.warn(`[premiumFetch] 401 from ${endpoint}`);
    }
    
    // Check if we should ignore this 401 (grace period)
    if (shouldIgnore401(endpoint)) {
      throw new Error('AUTH_REQUIRED_GRACE');
    }
    
    await setSessionToken(null);
    useAuthStore.getState().setUser(null);
    throw new Error('AUTH_REQUIRED');
  }
  
  return response;
};

export interface PremiumState {
  isPremium: boolean;
  subscriptionId: string | null;
  expiresAt: string | null;
  plan: 'monthly' | 'yearly' | null;
  platform: 'ios' | 'android' | 'web' | null;
  loading: boolean;
  initialized: boolean;
  
  // Actions
  initializePremium: () => Promise<void>;
  checkPremiumStatus: () => Promise<void>;
  setPremiumStatus: (status: boolean, subscriptionId?: string, expiresAt?: string, plan?: 'monthly' | 'yearly') => void;
  clearPremiumStatus: () => void;
  restorePurchases: () => Promise<boolean>;
  verifyPurchaseWithBackend: (platform: string, receiptData: string, productId: string, transactionId?: string) => Promise<boolean>;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: false,
  subscriptionId: null,
  expiresAt: null,
  plan: null,
  platform: null,
  loading: false,
  initialized: false,
  
  initializePremium: async () => {
    if (get().initialized) return;
    
    try {
      // Initialize RevenueCat (only on native platforms)
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await initRevenueCat();
        
        // Add listener for subscription changes
        addCustomerInfoListener(async (customerInfo) => {
          const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
          if (entitlement) {
            // Sync with backend when purchase detected
            const platform = Platform.OS as 'ios' | 'android';
            await get().verifyPurchaseWithBackend(
              platform,
              JSON.stringify(customerInfo),
              entitlement.productIdentifier,
              customerInfo.originalAppUserId
            );
            
            set({
              isPremium: true,
              expiresAt: entitlement.expirationDate || null,
              subscriptionId: entitlement.productIdentifier,
              plan: entitlement.productIdentifier?.includes('yearly') ? 'yearly' : 'monthly',
              platform,
            });
          } else {
            set({
              isPremium: false,
              expiresAt: null,
              subscriptionId: null,
              plan: null,
              platform: null,
            });
          }
        });
      }
      
      set({ initialized: true, platform: Platform.OS as any });
      
      // Check current status
      await get().checkPremiumStatus();
    } catch (error) {
      console.error('Failed to initialize premium:', error);
      set({ initialized: true });
    }
  },
  
  checkPremiumStatus: async () => {
    set({ loading: true });
    try {
      // For native platforms, use RevenueCat
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const result = await checkPremiumEntitlement();
        set({
          isPremium: result.isPremium,
          expiresAt: result.expiresAt,
          subscriptionId: result.productId,
          plan: result.productId?.includes('yearly') ? 'yearly' : result.productId ? 'monthly' : null,
          loading: false,
        });
        
        // Cache locally
        await AsyncStorage.setItem('premium_status', JSON.stringify({
          isPremium: result.isPremium,
          expiresAt: result.expiresAt,
          subscriptionId: result.productId,
        }));
        
        return;
      }
      
      // For web, check local cache first
      const cached = await AsyncStorage.getItem('premium_status');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          set({
            isPremium: parsed.isPremium,
            subscriptionId: parsed.subscriptionId,
            expiresAt: parsed.expiresAt,
            plan: parsed.plan,
            loading: false,
          });
          return;
        }
      }
      
      // Fallback: verify with backend
      try {
        const response = await apiFetch(`${API_URL}/api/premium/status`);
        if (response.ok) {
          const data = await response.json();
          set({
            isPremium: data.is_premium,
            subscriptionId: data.subscription_id,
            expiresAt: data.expires_at,
            plan: data.plan,
            loading: false,
          });
          
          await AsyncStorage.setItem('premium_status', JSON.stringify({
            isPremium: data.is_premium,
            subscriptionId: data.subscription_id,
            expiresAt: data.expires_at,
            plan: data.plan,
          }));
        } else {
          set({ loading: false });
        }
      } catch (error: any) {
        if (error.message === 'AUTH_REQUIRED') {
          // User not logged in - premium status is false
          set({ isPremium: false, loading: false });
        } else {
          console.error('Failed to check premium status:', error);
          set({ loading: false });
        }
      }
    } catch (error) {
      console.error('Failed to check premium status:', error);
      set({ loading: false });
    }
  },
  
  setPremiumStatus: (status, subscriptionId, expiresAt, plan) => {
    set({
      isPremium: status,
      subscriptionId: subscriptionId || null,
      expiresAt: expiresAt || null,
      plan: plan || null,
    });
    
    AsyncStorage.setItem('premium_status', JSON.stringify({
      isPremium: status,
      subscriptionId,
      expiresAt,
      plan,
    }));
  },
  
  clearPremiumStatus: () => {
    set({
      isPremium: false,
      subscriptionId: null,
      expiresAt: null,
      plan: null,
    });
    AsyncStorage.removeItem('premium_status');
  },
  
  restorePurchases: async () => {
    set({ loading: true });
    try {
      // For native platforms, use RevenueCat
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const result = await rcRestorePurchases();
        
        if (result.success && result.isPremium) {
          await get().checkPremiumStatus();
          set({ loading: false });
          return true;
        }
        
        set({ loading: false });
        return false;
      }
      
      // For web, verify with backend
      try {
        const response = await apiFetch(`${API_URL}/api/premium/restore`, {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.is_premium) {
            set({
              isPremium: true,
              subscriptionId: data.subscription_id,
              expiresAt: data.expires_at,
              plan: data.plan,
              loading: false,
            });
            return true;
          }
        }
      } catch (error: any) {
        if (error.message === 'AUTH_REQUIRED') {
          set({ loading: false });
          return false;
        }
        throw error;
      }
      
      set({ loading: false });
      return false;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      set({ loading: false });
      return false;
    }
  },
  
  verifyPurchaseWithBackend: async (platform: string, receiptData: string, productId: string, transactionId?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/iap/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform,
          receipt_data: receiptData,
          product_id: productId,
          transaction_id: transactionId,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.is_premium) {
          set({
            isPremium: true,
            plan: data.plan,
            expiresAt: data.expires_at,
          });
          
          // Cache locally
          await AsyncStorage.setItem('premium_status', JSON.stringify({
            isPremium: true,
            plan: data.plan,
            expiresAt: data.expires_at,
          }));
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to verify purchase with backend:', error);
      return false;
    }
  },
}));

// Helper hooks for feature gating
export type PremiumFeature = 
  | 'ai_daily_report'
  | 'ai_forecast_7'
  | 'ai_forecast_14'
  | 'ai_forecast_30'
  | 'health_log'
  | 'health_alerts'
  | 'advanced_stats'
  | 'incubation_log'
  | 'incubation_stats'
  | 'pdf_export'
  | 'smart_reminders'
  | 'sharing_family'
  | 'weather_tips'
  | 'feed_management'
  | 'unlimited_history'
  | 'multiple_coops';

// All premium features list
export const PREMIUM_FEATURES: PremiumFeature[] = [
  'ai_daily_report',
  'ai_forecast_7',
  'ai_forecast_14',
  'ai_forecast_30',
  'health_log',
  'health_alerts',
  'advanced_stats',
  'incubation_log',
  'incubation_stats',
  'pdf_export',
  'smart_reminders',
  'sharing_family',
  'weather_tips',
  'feed_management',
  'unlimited_history',
  'multiple_coops',
];

/**
 * Central feature access check
 * Use this everywhere to check if user can access a feature
 */
export const canAccess = (feature: PremiumFeature, isPremium: boolean): boolean => {
  return isPremium || !PREMIUM_FEATURES.includes(feature);
};

/**
 * Hook for checking feature access
 */
export const useCanAccessFeature = (feature: PremiumFeature): boolean => {
  const isPremium = usePremiumStore((state) => state.isPremium);
  return canAccess(feature, isPremium);
};

/**
 * Hook that returns both access status and a function to show upgrade modal
 */
export const useFeatureAccess = (feature: PremiumFeature) => {
  const isPremium = usePremiumStore((state) => state.isPremium);
  const hasAccess = canAccess(feature, isPremium);
  
  return {
    hasAccess,
    isPremium,
    requiresPremium: PREMIUM_FEATURES.includes(feature),
  };
};
