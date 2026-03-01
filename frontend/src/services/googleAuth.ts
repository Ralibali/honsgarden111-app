/**
 * Google OAuth Service for Expo (iOS + Android)
 * Uses expo-auth-session for authentication flow
 */
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Environment config
const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID || 
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.GOOGLE_IOS_CLIENT_ID || 
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.GOOGLE_ANDROID_CLIENT_ID || 
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

import config from '../config/env';
const API_URL = config.apiBaseUrl;

export interface GoogleAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  token?: string;
  error?: string;
}

/**
 * Hook for Google Sign-In
 * Returns request, response, and promptAsync function
 */
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  return { request, response, promptAsync };
};

/**
 * Exchange Google auth code for user info and authenticate with backend
 */
export const authenticateWithGoogle = async (
  accessToken: string
): Promise<GoogleAuthResult> => {
  try {
    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/userinfo/v2/me',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const googleUser = await userInfoResponse.json();

    // Authenticate with our backend
    const backendResponse = await fetch(`${API_URL}/api/auth/google/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        google_id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        access_token: accessToken,
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
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
      token: backendData.token,
    };
  } catch (error: any) {
    console.error('Google authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed',
    };
  }
};

/**
 * Check if Google auth is properly configured
 */
export const isGoogleAuthConfigured = (): boolean => {
  if (Platform.OS === 'ios') {
    return !!GOOGLE_IOS_CLIENT_ID;
  } else if (Platform.OS === 'android') {
    return !!GOOGLE_ANDROID_CLIENT_ID;
  } else {
    return !!GOOGLE_WEB_CLIENT_ID;
  }
};
