/**
 * RevenueCat Integration for Hönsgården
 * Full subscription management with Paywall and Customer Center support
 */
import { Platform } from 'react-native';
import Purchases, { 
  LOG_LEVEL, 
  CustomerInfo, 
  PurchasesOffering,
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import Constants from 'expo-constants';

// RevenueCat API Key - Use your test key
const REVENUECAT_API_KEY = 'test_hyDYIzhCbqNxMdjcHEIfFjEFJpO';

// Can also be configured per-platform via env
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || REVENUECAT_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || REVENUECAT_API_KEY;

// Environment check
const IS_PRODUCTION = !__DEV__ || Constants.expoConfig?.extra?.APP_ENV === 'production';

// Entitlement ID - MUST match your RevenueCat dashboard
export const ENTITLEMENT_ID = 'Hönsgården app Pro';

// Product IDs - MUST match your RevenueCat dashboard
export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export const initRevenueCat = async (): Promise<boolean> => {
  if (isConfigured) return true;
  
  // Web platform - use mock mode
  if (Platform.OS === 'web') {
    console.log('RevenueCat: Web platform detected, using mock mode');
    isConfigured = true;
    return true;
  }
  
  try {
    // Set log level based on environment
    Purchases.setLogLevel(IS_PRODUCTION ? LOG_LEVEL.ERROR : LOG_LEVEL.VERBOSE);
    
    // Get platform-specific API key
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;
    
    if (!apiKey) {
      console.error('RevenueCat: No API key configured for', Platform.OS);
      return false;
    }
    
    // Configure RevenueCat
    await Purchases.configure({ apiKey });
    
    isConfigured = true;
    console.log(`RevenueCat initialized for ${Platform.OS}`);
    return true;
  } catch (error) {
    console.error('RevenueCat initialization failed:', error);
    return false;
  }
};

/**
 * Identify user with RevenueCat (for cross-platform sync)
 * Call after user logs in
 */
export const identifyUser = async (userId: string): Promise<CustomerInfo | null> => {
  if (Platform.OS === 'web') return null;
  
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    console.log('RevenueCat: User identified:', userId);
    return customerInfo;
  } catch (error) {
    console.error('RevenueCat identify error:', error);
    return null;
  }
};

/**
 * Logout user from RevenueCat
 * Call when user logs out
 */
export const logoutUser = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  
  try {
    await Purchases.logOut();
    console.log('RevenueCat: User logged out');
  } catch (error) {
    console.error('RevenueCat logout error:', error);
  }
};

/**
 * Get current customer info
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (Platform.OS === 'web') return null;
  
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
};

/**
 * Check if user has premium entitlement
 */
export const checkPremiumEntitlement = async (): Promise<{
  isPremium: boolean;
  expiresAt: string | null;
  productId: string | null;
  willRenew: boolean;
}> => {
  if (Platform.OS === 'web') {
    return { isPremium: false, expiresAt: null, productId: null, willRenew: false };
  }
  
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (entitlement) {
      return {
        isPremium: true,
        expiresAt: entitlement.expirationDate || null,
        productId: entitlement.productIdentifier,
        willRenew: entitlement.willRenew,
      };
    }
    
    return { isPremium: false, expiresAt: null, productId: null, willRenew: false };
  } catch (error) {
    console.error('Entitlement check failed:', error);
    return { isPremium: false, expiresAt: null, productId: null, willRenew: false };
  }
};

/**
 * Get available offerings (subscription packages)
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (Platform.OS === 'web') return null;
  
  try {
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current) {
      console.log('RevenueCat offerings loaded:', offerings.current.identifier);
      return offerings.current;
    }
    
    console.warn('No current offering available');
    return null;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
};

/**
 * Get all available offerings
 */
export const getAllOfferings = async (): Promise<{ [key: string]: PurchasesOffering }> => {
  if (Platform.OS === 'web') return {};
  
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.all;
  } catch (error) {
    console.error('Failed to get all offerings:', error);
    return {};
  }
};

/**
 * Purchase a package
 */
export const purchasePackage = async (pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
  userCancelled?: boolean;
}> => {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Purchases not available on web' };
  }
  
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    // Verify the entitlement was granted
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    return {
      success: isPremium,
      customerInfo,
    };
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, userCancelled: true };
    }
    
    // Handle other specific errors
    if (error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      // User already has this product - restore it
      const restoreResult = await restorePurchases();
      return {
        success: restoreResult.isPremium,
        error: restoreResult.isPremium ? undefined : 'Already purchased but restore failed',
      };
    }
    
    console.error('Purchase error:', error);
    return {
      success: false,
      error: error.message || 'Purchase failed',
    };
  }
};

/**
 * Restore previous purchases
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  isPremium: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> => {
  if (Platform.OS === 'web') {
    return { success: false, isPremium: false, error: 'Not available on web' };
  }
  
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    return {
      success: true,
      isPremium,
      customerInfo,
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
 * Add listener for customer info changes
 * Returns unsubscribe function
 */
export const addCustomerInfoListener = (
  callback: (customerInfo: CustomerInfo) => void
): (() => void) => {
  if (Platform.OS === 'web') {
    return () => {};
  }
  
  const listener = Purchases.addCustomerInfoUpdateListener(callback);
  return () => listener.remove();
};

/**
 * Get subscription management URL (for "Manage Subscription" button)
 */
export const getManagementURL = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return null;
  
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
  } catch (error) {
    console.error('Error getting management URL:', error);
    return null;
  }
};

/**
 * Check if RevenueCat is configured
 */
export const isRevenueCatConfigured = (): boolean => {
  return isConfigured;
};

/**
 * Format price for display
 */
export const formatPackagePrice = (pkg: PurchasesPackage): string => {
  const price = pkg.product.priceString;
  const period = pkg.packageType;
  
  switch (period) {
    case 'MONTHLY':
      return `${price}/månad`;
    case 'ANNUAL':
      return `${price}/år`;
    default:
      return price;
  }
};

/**
 * Calculate savings percentage for yearly vs monthly
 */
export const calculateYearlySavings = (
  monthlyPkg: PurchasesPackage | undefined,
  yearlyPkg: PurchasesPackage | undefined
): number => {
  if (!monthlyPkg || !yearlyPkg) return 0;
  
  const monthlyPrice = monthlyPkg.product.price;
  const yearlyPrice = yearlyPkg.product.price;
  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  
  if (monthlyPrice <= 0) return 0;
  
  const savings = ((monthlyPrice - yearlyMonthlyEquivalent) / monthlyPrice) * 100;
  return Math.round(savings);
};
