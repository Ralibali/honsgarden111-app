import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { usePremiumStore } from '../src/store/premiumStore';

export default function RootLayout() {
  const { checkPremiumStatus } = usePremiumStore();
  
  useEffect(() => {
    // Check premium status on app launch
    checkPremiumStatus();
  }, []);
  
  return (
    <>
      <StatusBar style="light" />
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
