import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import Constants from 'expo-constants';

// RevenueCat API Keys from environment variables
const REVENUECAT_IOS_API_KEY = Constants.expoConfig?.extra?.REVENUECAT_IOS_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
const REVENUECAT_ANDROID_API_KEY = Constants.expoConfig?.extra?.REVENUECAT_ANDROID_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';

// Entitlement ID from RevenueCat dashboard
export const ENTITLEMENT_ID = 'aurora media AB Pro';

// Product IDs (configure these in RevenueCat dashboard)
export const PRODUCT_IDS = {
  MONTHLY: 'honshus_monthly',
  YEARLY: 'honshus_yearly',
};

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export const initRevenueCat = async (): Promise<void> => {
  if (isConfigured) return;
  
  try {
    // Set log level for debugging (change to SILENT in production)
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    
    // Configure with platform-specific API key
    if (Platform.OS === 'ios') {
      await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
    } else if (Platform.OS === 'android') {
      await Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY });
    } else {
      // Web - RevenueCat doesn't support web, so we skip
      console.log('RevenueCat: Web platform not supported');
      return;
    }
    
    isConfigured = true;
    console.log('RevenueCat configured successfully');
  } catch (error) {
    console.error('Failed to configure RevenueCat:', error);
  }
};

/**
 * Check if user has active premium subscription
 */
export const checkPremiumEntitlement = async (): Promise<{
  isPremium: boolean;
  expiresAt: string | null;
  productId: string | null;
}> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (entitlement) {
      return {
        isPremium: true,
        expiresAt: entitlement.expirationDate || null,
        productId: entitlement.productIdentifier,
      };
    }
    
    return {
      isPremium: false,
      expiresAt: null,
      productId: null,
    };
  } catch (error) {
    console.error('Failed to check entitlement:', error);
    return {
      isPremium: false,
      expiresAt: null,
      productId: null,
    };
  }
};

/**
 * Get available offerings (products)
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
};

/**
 * Purchase a package
 */
export const purchasePackage = async (packageToPurchase: any): Promise<{
  success: boolean;
  customerInfo: CustomerInfo | null;
  error: string | null;
}> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return {
      success: true,
      customerInfo,
      error: null,
    };
  } catch (error: any) {
    // Check if user cancelled
    if (error.userCancelled) {
      return {
        success: false,
        customerInfo: null,
        error: 'cancelled',
      };
    }
    console.error('Purchase failed:', error);
    return {
      success: false,
      customerInfo: null,
      error: error.message || 'Purchase failed',
    };
  }
};

/**
 * Restore purchases
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  isPremium: boolean;
  error: string | null;
}> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    return {
      success: true,
      isPremium: !!entitlement,
      error: null,
    };
  } catch (error: any) {
    console.error('Restore failed:', error);
    return {
      success: false,
      isPremium: false,
      error: error.message || 'Restore failed',
    };
  }
};

/**
 * Add listener for customer info updates
 */
export const addCustomerInfoListener = (
  callback: (info: CustomerInfo) => void
): (() => void) => {
  const listener = Purchases.addCustomerInfoUpdateListener(callback);
  return () => listener.remove();
};
