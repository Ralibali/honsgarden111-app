/**
 * Community tab has been deprecated.
 * Redirect to home screen.
 */
import { Redirect } from 'expo-router';

export default function CommunityRedirect() {
  return <Redirect href="/(tabs)" />;
}
