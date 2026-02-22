import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface PremiumState {
  isPremium: boolean;
  subscriptionId: string | null;
  expiresAt: string | null;
  plan: 'monthly' | 'yearly' | null;
  loading: boolean;
  
  // Actions
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
  
  checkPremiumStatus: async () => {
    set({ loading: true });
    try {
      // First check local cache
      const cached = await AsyncStorage.getItem('premium_status');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cached status is still valid
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
      
      // Verify with backend
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
        
        // Cache the result
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
    
    // Cache locally
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
      // This would call RevenueCat to restore purchases
      // For now, we'll verify with backend
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
  
  return true; // Free features
};
