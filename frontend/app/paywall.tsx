import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '../src/store/premiumStore';
import i18n from '../src/i18n';
import { RevenueCatPaywall } from '../src/components/RevenueCatPaywall';
import Constants from 'expo-constants';

// Web premium URL - only used for Web platform (Stripe checkout)
const PREMIUM_WEB_URL = 'https://honsgarden.se/premium';

export default function PaywallScreen() {
  const router = useRouter();
  const { checkPremiumStatus, loading: storeLoading } = usePremiumStore();
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  
  // Determine if we should use native IAP
  // iOS & Android = RevenueCat (In-App Purchase)
  // Web = Stripe (Web redirect)
  // Use multiple methods to detect native vs web
  const isNative = useMemo(() => {
    // Method 1: Platform.OS check
    const platformCheck = Platform.OS === 'ios' || Platform.OS === 'android';
    
    // Method 2: Check if running in Expo Go or standalone native app
    const expoCheck = Constants.executionEnvironment === 'storeClient' || 
                      Constants.executionEnvironment === 'standalone' ||
                      Constants.appOwnership === 'expo';
    
    // Method 3: Web detection - if window/document exist in a certain way
    const isWeb = typeof document !== 'undefined' && Platform.OS === 'web';
    
    console.log('[Paywall] Platform.OS:', Platform.OS);
    console.log('[Paywall] Constants.executionEnvironment:', Constants.executionEnvironment);
    console.log('[Paywall] Constants.appOwnership:', Constants.appOwnership);
    console.log('[Paywall] platformCheck:', platformCheck);
    console.log('[Paywall] expoCheck:', expoCheck);
    console.log('[Paywall] isWeb:', isWeb);
    
    // If Platform.OS says iOS or Android, trust it
    // Otherwise check Expo constants
    return platformCheck || (expoCheck && !isWeb);
  }, []);
  
  const useNativeIAP = isNative;
  
  // Handle successful purchase - navigate back
  const handlePurchaseComplete = () => {
    router.back();
  };
  
  // For iOS & Android: Use RevenueCatPaywall component
  if (useNativeIAP) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <RevenueCatPaywall 
          onClose={() => router.back()}
          onPurchaseComplete={handlePurchaseComplete}
        />
      </SafeAreaView>
    );
  }
  
  // For Web only: Show web redirect flow (Stripe)
  const handleUpgrade = async () => {
    Alert.alert(
      isSv ? 'Prenumerera via webben' : 'Subscribe via web',
      isSv 
        ? 'Du kommer att omdirigeras till honsgarden.se för att slutföra din prenumeration.'
        : 'You will be redirected to honsgarden.se to complete your subscription.',
      [
        {
          text: isSv ? 'Avbryt' : 'Cancel',
          style: 'cancel',
        },
        {
          text: isSv ? 'Öppna webbsidan' : 'Open website',
          onPress: () => {
            Linking.openURL(PREMIUM_WEB_URL).catch((err) => {
              console.error('Failed to open URL:', err);
              Alert.alert(
                t('common.error'),
                isSv 
                  ? 'Kunde inte öppna webbläsaren. Besök honsgarden.se/premium manuellt.'
                  : 'Could not open browser. Visit honsgarden.se/premium manually.'
              );
            });
          },
        },
      ]
    );
  };
  
  const handleRestore = async () => {
    await checkPremiumStatus();
    const { isPremium } = usePremiumStore.getState();
    
    if (isPremium) {
      Alert.alert(
        t('common.success'), 
        isSv ? 'Din Premium-status har återställts!' : 'Your Premium status has been restored!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        isSv ? 'Ingen prenumeration hittad' : 'No subscription found',
        isSv 
          ? 'Vi kunde inte hitta någon aktiv prenumeration kopplad till ditt konto.'
          : 'We could not find any active subscription linked to your account.'
      );
    }
  };
  
  const features = [
    { icon: 'sparkles', title: 'AI-rådgivare "Agda"', description: 'Personlig hönsgårdsrådgivning' },
    { icon: 'document-text', title: 'AI Dagsrapport', description: 'Daglig analys av din hönsgård' },
    { icon: 'analytics', title: '7-dagars äggprognos', description: 'Förutsäg äggproduktionen' },
    { icon: 'cloudy', title: 'Vädertips', description: 'Anpassade hönsskötsel-tips' },
    { icon: 'medkit', title: 'Hälsologg', description: 'Följ hälsan för varje höna' },
    { icon: 'egg', title: 'Kläckningsmodul', description: 'Hantera ruvning och kläckning' },
    { icon: 'time', title: 'Obegränsad historik', description: 'Spara all statistik för alltid' },
  ];
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="star" size={48} color="#FFD93D" />
          </View>
          <Text style={styles.title}>{t('premium.title')}</Text>
          <Text style={styles.subtitle}>
            {isSv ? 'Lås upp alla funktioner' : 'Unlock all features'}
          </Text>
        </View>
        
        {/* Features List */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>
            {isSv ? 'Premium innehåller:' : 'Premium includes:'}
          </Text>
          
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon as any} size={22} color="#fbbf24" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
        
        {/* Pricing */}
        <View style={styles.pricingCard}>
          <View style={styles.priceRow}>
            <View style={styles.priceOption}>
              <Text style={styles.priceLabel}>{isSv ? 'Månatlig' : 'Monthly'}</Text>
              <Text style={styles.priceAmount}>19 kr</Text>
              <Text style={styles.priceSubtext}>{isSv ? '/månad' : '/month'}</Text>
            </View>
            <View style={[styles.priceOption, styles.priceOptionHighlight]}>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>{isSv ? 'Spara 35%' : 'Save 35%'}</Text>
              </View>
              <Text style={styles.priceLabel}>{isSv ? 'Årlig' : 'Yearly'}</Text>
              <Text style={styles.priceAmount}>149 kr</Text>
              <Text style={styles.priceSubtext}>{isSv ? '/år (~12 kr/mån)' : '/year (~12 kr/mo)'}</Text>
            </View>
          </View>
          <Text style={styles.webPriceNote}>
            {isSv 
              ? 'Priser i SEK via Stripe webbkassa' 
              : 'Prices in SEK via Stripe checkout'}
          </Text>
        </View>
        
        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, storeLoading && styles.ctaButtonDisabled]}
          onPress={handleUpgrade}
          disabled={storeLoading}
        >
          {storeLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="globe-outline" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.ctaButtonText}>
                {isSv ? 'Prenumerera via honsgarden.se' : 'Subscribe via honsgarden.se'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Info notice */}
        <View style={styles.webNotice}>
          <Ionicons name="information-circle" size={18} color="#8E8E93" />
          <Text style={styles.webNoticeText}>
            {isSv 
              ? 'På Android hanteras betalning via vår webbplats med Stripe för enklare hantering.'
              : 'On Android, payment is handled via our website with Stripe for easier management.'}
          </Text>
        </View>
        
        {/* Restore */}
        <TouchableOpacity 
          style={styles.restoreButton} 
          onPress={handleRestore} 
          disabled={storeLoading}
        >
          <Text style={styles.restoreButtonText}>
            {isSv ? 'Redan prenumerant? Kontrollera status' : 'Already subscribed? Check status'}
          </Text>
        </TouchableOpacity>
        
        {/* Legal Links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://honsgarden.se/privacy')}>
            <Text style={styles.legalLinkText}>{isSv ? 'Integritetspolicy' : 'Privacy Policy'}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://honsgarden.se/terms')}>
            <Text style={styles.legalLinkText}>{isSv ? 'Användarvillkor' : 'Terms of Service'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD93D22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  featuresCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 12,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  pricingCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceOption: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  priceOptionHighlight: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderWidth: 2,
    borderColor: '#4ade80',
    position: 'relative',
  },
  priceLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  priceSubtext: {
    fontSize: 12,
    color: '#4ade80',
    marginTop: 4,
  },
  webPriceNote: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#4ade80',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  savingsText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  ctaButton: {
    backgroundColor: '#4ade80',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  webNoticeText: {
    flex: 1,
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
  },
  restoreButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  restoreButtonText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '500',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  legalLinkText: {
    color: '#666',
    fontSize: 12,
  },
  legalSeparator: {
    color: '#666',
    fontSize: 12,
  },
});
