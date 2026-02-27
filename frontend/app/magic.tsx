import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';

/**
 * Magic Link Consumer Page
 * This page receives the magic link token and redirects to the backend
 * to consume the token and create a session cookie.
 * 
 * Web-only functionality - native app users won't see this.
 */
export default function MagicLinkPage() {
  const { token, next } = useLocalSearchParams<{ token: string; next: string }>();
  const router = useRouter();
  const { colors } = useThemeStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && token) {
      // Redirect to backend to consume the magic link
      const nextPath = next || '/';
      const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const consumeUrl = `${API_URL}/api/auth/magic/consume?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;
      
      // Use window.location for full page redirect (to set cookie)
      window.location.href = consumeUrl;
    } else if (!token) {
      setError('Ingen token hittades. Länken kan vara ogiltig.');
    }
  }, [token, next]);

  // Show loading while redirecting
  if (!error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { color: colors.text }]}>
          Loggar in...
        </Text>
      </View>
    );
  }

  // Show error
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorText, { color: colors.error }]}>
        {error}
      </Text>
      <Text 
        style={[styles.link, { color: colors.primary }]}
        onPress={() => router.replace('/(auth)/login')}
      >
        Gå till inloggning
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
