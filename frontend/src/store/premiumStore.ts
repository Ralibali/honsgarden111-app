import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  initRevenueCat,
  checkPremiumEntitlement,
  restorePurchases as rcRestorePurchases,
  addCustomerInfoListener,
  ENTITLEMENT_ID,
} from '../services/revenuecat';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface PremiumState {
  isPremium: boolean;
  subscriptionId: string | null;
  expiresAt: string | null;
  plan: 'monthly' | 'yearly' | null;
  loading: boolean;
  initialized: boolean;
  
  // Actions
  initializePremium: () => Promise<void>;
  checkPremiumStatus: () => Promise<void>;
  setPremiumStatus: (status: boolean, subscriptionId?: string, expiresAt?: string, plan?: 'monthly' | 'yearly') => void;
  clearPremiumStatus: () => void;
  restorePurchases: () => Promise<boolean>;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: false,
  subscriptionId: null,
  expiresAt: null,
  plan: null,
  loading: false,
  initialized: false,
  
  initializePremium: async () => {
    if (get().initialized) return;
    
    try {
      // Initialize RevenueCat (only on native platforms)
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await initRevenueCat();
        
        // Add listener for subscription changes
        addCustomerInfoListener((customerInfo) => {
          const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
          if (entitlement) {
            set({
              isPremium: true,
              expiresAt: entitlement.expirationDate || null,
              subscriptionId: entitlement.productIdentifier,
              plan: entitlement.productIdentifier?.includes('yearly') ? 'yearly' : 'monthly',
            });
          } else {
            set({
              isPremium: false,
              expiresAt: null,
              subscriptionId: null,
              plan: null,
            });
          }
        });
      }
      
      set({ initialized: true });
      
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
      const response = await fetch(`${API_URL}/api/premium/status`);
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
      const response = await fetch(`${API_URL}/api/premium/restore`, {
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
      
      set({ loading: false });
      return false;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      set({ loading: false });
      return false;
    }
  },
}));

// Helper hooks for feature gating
export const useCanAccessFeature = (feature: 'yearStats' | 'pdfExport' | 'reminders' | 'unlimitedHistory' | 'multipleCoops'): boolean => {
  const isPremium = usePremiumStore((state) => state.isPremium);
  
  const premiumFeatures = ['yearStats', 'pdfExport', 'reminders', 'unlimitedHistory', 'multipleCoops'];
  
  if (premiumFeatures.includes(feature)) {
    return isPremium;
  }
  
  return true;
};
