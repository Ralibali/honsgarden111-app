import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { usePremiumStore } from '../src/store/premiumStore';
import { useThemeStore } from '../src/store/themeStore';

export default function RootLayout() {
  const { initializePremium } = usePremiumStore();
  const { initializeTheme, isDark } = useThemeStore();
  
  useEffect(() => {
    // Initialize theme and premium status on app launch
    initializeTheme();
    initializePremium();
  }, []);
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="paywall" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
      </Stack>
    </>
  );
}
