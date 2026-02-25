/**
 * Environment Configuration and Validation
 * Validates required environment variables at app startup
 */

import Constants from 'expo-constants';

// Environment types
export type AppEnvironment = 'development' | 'staging' | 'production';

// Configuration interface
export interface AppConfig {
  environment: AppEnvironment;
  apiBaseUrl: string;
  isProduction: boolean;
  debug: boolean;
  
  // Auth
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  
  // RevenueCat
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
  
  // App identifiers
  bundleIdentifier?: string;
  packageName?: string;
}

// Required environment variables
const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_BACKEND_URL',
];

// Get environment variable with fallback
const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] || 
    Constants.expoConfig?.extra?.[key] || 
    fallback;
  return value || '';
};

// Determine environment
const determineEnvironment = (): AppEnvironment => {
  const envValue = getEnv('APP_ENV', 'development');
  
  if (envValue === 'production' || !__DEV__) {
    return 'production';
  } else if (envValue === 'staging') {
    return 'staging';
  }
  return 'development';
};

// Validate environment variables
export const validateEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  for (const key of REQUIRED_ENV_VARS) {
    const value = getEnv(key);
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }
  
  // Validate API URL format
  const apiUrl = getEnv('EXPO_PUBLIC_BACKEND_URL');
  if (apiUrl && !apiUrl.startsWith('http')) {
    errors.push('EXPO_PUBLIC_BACKEND_URL must be a valid URL starting with http:// or https://');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Build app configuration
export const getAppConfig = (): AppConfig => {
  const environment = determineEnvironment();
  const isProduction = environment === 'production';
  
  return {
    environment,
    apiBaseUrl: getEnv('EXPO_PUBLIC_BACKEND_URL'),
    isProduction,
    debug: !isProduction && __DEV__,
    
    // Google Auth
    googleWebClientId: getEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
    googleIosClientId: getEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
    googleAndroidClientId: getEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
    
    // RevenueCat
    revenueCatIosKey: getEnv('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY'),
    revenueCatAndroidKey: getEnv('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'),
    
    // App identifiers
    bundleIdentifier: Constants.expoConfig?.ios?.bundleIdentifier,
    packageName: Constants.expoConfig?.android?.package,
  };
};

// Console logging based on environment
export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (__DEV__) {
      console.debug(...args);
    }
  },
};

// Initialize and validate on import
const config = getAppConfig();
const validation = validateEnvironment();

if (!validation.valid) {
  console.error('Environment validation failed:', validation.errors);
}

export default config;
