/**
 * usePremium Hook
 * Manages premium status via RevenueCat entitlements
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { getCustomerInfo, ENTITLEMENT_ID } from '../services/revenuecat';

export type PremiumState = {
  isPremium: boolean;
  customerInfo: any | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

function hasPremiumEntitlement(info: any | null): boolean {
  if (!info) return false;
  const active = info.entitlements?.active || {};
  // Check for our specific entitlement or any active entitlement
  return Boolean(active[ENTITLEMENT_ID] || active.premium || active.pro || Object.keys(active).length > 0);
}

export function usePremium(): PremiumState {
  const [customerInfo, setCustomerInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.warn('usePremium: Failed to get customer info:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    
    // On native, set up listener for customer info updates
    if (Platform.OS !== 'web') {
      const setupListener = async () => {
        try {
          const RC = await import('react-native-purchases');
          const Purchases = RC.default;
          const sub = Purchases.addCustomerInfoUpdateListener((info: any) => {
            setCustomerInfo(info);
          });
          return () => sub.remove();
        } catch (e) {
          // RevenueCat not available
        }
      };
      
      const cleanup = setupListener();
      return () => {
        cleanup.then(fn => fn?.());
      };
    }
  }, [refresh]);

  const isPremium = useMemo(() => hasPremiumEntitlement(customerInfo), [customerInfo]);

  return { isPremium, customerInfo, loading, refresh };
}
