import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

const ONBOARDING_KEY = '@honsgarden_onboarding_complete';

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  
  useEffect(() => {
    checkOnboarding();
  }, []);
  
  const checkOnboarding = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      setIsOnboardingComplete(value === 'true');
    } catch (e) {
      setIsOnboardingComplete(true); // Skip onboarding if error
    }
  };
  
  // Show loading while checking onboarding status
  if (isOnboardingComplete === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' }}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }
  
  // Show onboarding for new users
  if (!isOnboardingComplete && !isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  
  // Redirect to main app if authenticated
  return <Redirect href="/(tabs)" />;
}
