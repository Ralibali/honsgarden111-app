import React, { useState, useEffect } from 'react';
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

// RevenueCat imports - kept as backup but not used for primary flow
// Users are redirected to web for subscription management

const MONTHLY_PRICE = '19 kr';
const YEARLY_PRICE = '149 kr';
const YEARLY_SAVINGS = 35;

// Web premium URL - users are redirected here for subscription management
const PREMIUM_WEB_URL = 'https://honsgarden.se/premium';

export default function PaywallScreen() {
  const router = useRouter();
  const { restorePurchases, checkPremiumStatus, loading: storeLoading } = usePremiumStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  
  // Open web browser for premium subscription
  const handleUpgrade = async () => {
    // Show confirmation dialog
    Alert.alert(
      isSv ? 'Prenumerera via webben' : 'Subscribe via web',
      isSv 
        ? 'Du kommer att omdirigeras till honsgarden.se för att hantera din prenumeration. Logga in med samma konto där.'
        : 'You will be redirected to honsgarden.se to manage your subscription. Log in with the same account there.',
      [
        {
          text: isSv ? 'Avbryt' : 'Cancel',
          style: 'cancel',
        },
        {
          text: isSv ? 'Öppna webbsidan' : 'Open website',
          onPress: () => {
            // Open the premium page in external browser
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
    // Check premium status from backend (synced via database)
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
    {
      key: 'ai-advisor',
      icon: 'sparkles',
      title: '🤖 AI-rådgivare "Agda"',
      description: 'Personlig hönsgårdsrådgivning baserat på din data',
      premium: true,
    },
    {
      key: 'daily-report',
      icon: 'document-text',
      title: '📋 AI Dagsrapport',
      description: 'AI-genererad daglig analys av din hönsgård',
      premium: true,
    },
    {
      key: 'forecast',
      icon: 'analytics',
      title: '📈 7-dagars äggprognos',
      description: 'Förutsäg hur många ägg du kan förvänta dig',
      premium: true,
    },
    {
      key: 'weather',
      icon: 'cloudy',
      title: '🌤️ Vädertips',
      description: 'Anpassade hönsskötsel-tips baserat på väder',
      premium: true,
    },
    {
      key: 'health',
      icon: 'medkit',
      title: '🩺 Hälsologg per höna',
      description: 'Logga och följ hälsan för varje höna',
      premium: true,
    },
    {
      key: 'hatching',
      icon: 'egg',
      title: '🐣 Kläckningsmodul',
      description: 'Hantera ruvning och kläckning',
      premium: true,
    },
    {
      key: 'feed',
      icon: 'leaf',
      title: '🌾 Foderhantering',
      description: 'Spåra foderlager och förbrukning',
      premium: true,
    },
    {
      key: 'alerts',
      icon: 'alert-circle',
      title: '⚠️ Avvikelsedetektion',
      description: 'Varning när hönor slutar värpa',
      premium: true,
    },
    {
      key: 'economy',
      icon: 'cash',
      title: '💰 Ekonomijämförelse',
      description: 'Jämför vinst månad för månad',
      premium: true,
    },
    {
      key: 'history',
      icon: 'time',
      title: '📈 Obegränsad historik',
      description: 'Spara all statistik för alltid',
      premium: true,
    },
    {
      key: 'reminders',
      icon: 'notifications',
      title: '📧 E-postpåminnelser',
      description: 'Daglig påminnelse att registrera ägg',
      premium: true,
    },
    {
      key: 'priority',
      icon: 'star',
      title: '⭐ Prioriterad support',
      description: 'Snabbare hjälp när du behöver det',
      premium: true,
    },
  ];
  
  // Get prices - always use SEK
  const getPrice = (plan: 'monthly' | 'yearly'): string => {
    return plan === 'yearly' ? YEARLY_PRICE : MONTHLY_PRICE;
  };
  
  const isSv = i18n.locale.startsWith('sv');
  
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
          <Text style={styles.subtitle}>{t('premium.subtitle')}</Text>
        </View>
        
        {/* Features List */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Premium innehåller:</Text>
          
          {features.map((feature) => (
            <View key={feature.key} style={styles.featureRow}>
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
        
        {/* Plan Selection */}
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>
                Spara {YEARLY_SAVINGS}%
              </Text>
            </View>
            <View style={styles.planRadio}>
              <View style={[
                styles.radioOuter,
                selectedPlan === 'yearly' && styles.radioOuterSelected,
              ]}>
                {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Årsprenumeration</Text>
              <Text style={styles.planPrice}>{getPrice('yearly')}{t('common.perYear')}</Text>
              <Text style={styles.planMonthly}>(~12 kr{t('common.perMonth')})</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planRadio}>
              <View style={[
                styles.radioOuter,
                selectedPlan === 'monthly' && styles.radioOuterSelected,
              ]}>
                {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Månadsprenumeration</Text>
              <Text style={styles.planPrice}>{getPrice('monthly')}{t('common.perMonth')}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, storeLoading && styles.ctaButtonDisabled]}
          onPress={handleUpgrade}
          disabled={storeLoading}
        >
          {storeLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="globe-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.ctaButtonText}>
                {isSv ? 'Prenumerera via honsgarden.se' : 'Subscribe via honsgarden.se'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Info notice about web subscription */}
        <View style={styles.webNotice}>
          <Ionicons name="information-circle" size={18} color="#8E8E93" />
          <Text style={styles.webNoticeText}>
            {isSv 
              ? 'Prenumerationen hanteras via vår hemsida för enklare betalning och hantering.'
              : 'Subscription is managed via our website for easier payment and management.'}
          </Text>
        </View>
        
        {/* Restore purchases / Check status */}
        <TouchableOpacity 
          style={styles.restoreButton} 
          onPress={handleRestore} 
          disabled={storeLoading}
        >
          <Text style={styles.restoreButtonText}>
            {isSv ? 'Redan prenumerant? Kontrollera status' : 'Already subscribed? Check status'}
          </Text>
        </TouchableOpacity>
        
        {/* Privacy & Terms links */}
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
  featuresHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    marginBottom: 8,
  },
  featureColumn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#4CAF50',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingsText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planRadio: {
    marginRight: 16,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#4CAF50',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  planMonthly: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelNotice: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 12,
  },
  restoreButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  restoreButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
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
