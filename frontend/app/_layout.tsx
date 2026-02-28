import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useCallback, useState } from 'react';
import { View, ActivityIndicator, Platform, Text, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { 
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold 
} from '@expo-google-fonts/playfair-display';
import { 
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold 
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremiumStore } from '../src/store/premiumStore';
import { useThemeStore } from '../src/store/themeStore';
import { useAuthStore } from '../src/store/authStore';
import config, { validateEnvironment } from '../src/config/env';

const ONBOARDING_KEY = '@honsgarden_onboarding_complete';

// Validate environment on startup
const envValidation = validateEnvironment();

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initializePremium, checkPremiumStatus } = usePremiumStore();
  const { initializeTheme, isDark, colors } = useThemeStore();
  const { checkAuth, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if user has seen onboarding
        if (Platform.OS !== 'web') {
          const value = await AsyncStorage.getItem(ONBOARDING_KEY);
          if (__DEV__) console.log('Onboarding check result:', value);
          setHasSeenOnboarding(value === 'true');
        } else {
          // On web, skip onboarding by default (web users go to /api/web separately)
          setHasSeenOnboarding(true);
        }
        
        // Initialize theme and premium status on app launch
        await initializeTheme();
        await initializePremium();
        await checkAuth();
        
        setIsInitialized(true);
      } catch (e) {
        if (__DEV__) console.log('Initialization error:', e);
        setHasSeenOnboarding(true); // Default to skipping onboarding on error
        setIsInitialized(true);
      }
    };
    
    initialize();
  }, []);
  
  // Handle navigation based on auth state and onboarding
  useEffect(() => {
    // Wait for initialization to complete
    if (!isInitialized || hasSeenOnboarding === null) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    
    if (__DEV__) console.log('Navigation check:', { hasSeenOnboarding, isAuthenticated, inAuthGroup, inOnboarding, inTabs, authLoading });
    
    // If hasn't seen onboarding and not already there, go to onboarding
    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    }
    // If authenticated and not in tabs, go to tabs
    else if (isAuthenticated && !inTabs && !inOnboarding) {
      // Refresh premium status after authentication
      checkPremiumStatus().catch(err => console.warn('Premium check failed:', err));
      router.replace('/(tabs)');
    }
    // Only redirect to login if not already in auth group and not in onboarding
    else if (hasSeenOnboarding && !isAuthenticated && !inAuthGroup && !inOnboarding) {
      router.replace('/(auth)/login');
    }
  }, [isInitialized, hasSeenOnboarding, isAuthenticated]);
  
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);
  
  if (!fontsLoaded || !isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' }}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }
  
  // Show configuration error screen if environment validation failed
  if (!envValidation.valid) {
    return (
      <View style={configErrorStyles.container}>
        <Text style={configErrorStyles.icon}>⚠️</Text>
        <Text style={configErrorStyles.title}>Konfigurationsfel</Text>
        <Text style={configErrorStyles.message}>
          Appen kunde inte startas på grund av saknad konfiguration.
        </Text>
        <Text style={configErrorStyles.details}>
          Kontakta support om problemet kvarstår.
        </Text>
        {__DEV__ && (
          <View style={configErrorStyles.devInfo}>
            <Text style={configErrorStyles.devTitle}>Debug info:</Text>
            {envValidation.errors.map((error, index) => (
              <Text key={index} style={configErrorStyles.errorText}>{error}</Text>
            ))}
          </View>
        )}
      </View>
    );
  }
  
  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="paywall" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
      </Stack>
    </View>
  );
}
