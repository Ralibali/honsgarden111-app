/**
 * Apple Sign-In Service for iOS
 * Uses expo-apple-authentication
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import config from '../config/env';
const API_URL = config.apiBaseUrl;

export interface AppleAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string | null;
    fullName: string | null;
  };
  token?: string;
  error?: string;
}

/**
 * Check if Apple Sign-In is available on this device
 */
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
};

/**
 * Sign in with Apple
 */
export const signInWithApple = async (): Promise<AppleAuthResult> => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Build user name from components
    let fullName = null;
    if (credential.fullName) {
      const parts = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ].filter(Boolean);
      fullName = parts.length > 0 ? parts.join(' ') : null;
    }

    // Authenticate with our backend
    const backendResponse = await fetch(`${API_URL}/api/auth/apple/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        apple_id: credential.user,
        email: credential.email,
        name: fullName,
        identity_token: credential.identityToken,
        authorization_code: credential.authorizationCode,
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || 'Backend authentication failed');
    }

    const backendData = await backendResponse.json();

    return {
      success: true,
      user: {
        id: credential.user,
        email: credential.email,
        fullName,
      },
      token: backendData.token,
    };
  } catch (error: any) {
    // User cancelled
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return {
        success: false,
        error: 'cancelled',
      };
    }
    
    console.error('Apple Sign-In error:', error);
    return {
      success: false,
      error: error.message || 'Apple Sign-In failed',
    };
  }
};

/**
 * Get credential state for an Apple user
 */
export const getAppleCredentialState = async (
  userId: string
): Promise<'authorized' | 'revoked' | 'not_found' | 'transferred'> => {
  try {
    const state = await AppleAuthentication.getCredentialStateAsync(userId);
    
    switch (state) {
      case AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED:
        return 'authorized';
      case AppleAuthentication.AppleAuthenticationCredentialState.REVOKED:
        return 'revoked';
      case AppleAuthentication.AppleAuthenticationCredentialState.NOT_FOUND:
        return 'not_found';
      case AppleAuthentication.AppleAuthenticationCredentialState.TRANSFERRED:
        return 'transferred';
      default:
        return 'not_found';
    }
  } catch {
    return 'not_found';
  }
};
