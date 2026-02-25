import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  
  // Redirect to login if not authenticated, otherwise to main app
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  
  return <Redirect href="/(tabs)" />;
}
