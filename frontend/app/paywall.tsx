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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '../src/store/premiumStore';
import { getOfferings, purchasePackage, ENTITLEMENT_ID } from '../src/services/revenuecat';
import i18n from '../src/i18n';

// Try to import RevenueCatUI (only available on native)
let RevenueCatUI: any = null;
let PAYWALL_RESULT: any = null;

try {
  const rcui = require('react-native-purchases-ui');
  RevenueCatUI = rcui.default;
  PAYWALL_RESULT = rcui.PAYWALL_RESULT;
} catch (e) {
  console.log('RevenueCatUI not available (likely on web)');
}

const MONTHLY_PRICE = '19 kr';
const YEARLY_PRICE = '149 kr';
const YEARLY_SAVINGS = 35;

export default function PaywallScreen() {
  const router = useRouter();
  const { setPremiumStatus, restorePurchases, checkPremiumStatus, loading: storeLoading } = usePremiumStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  
  const t = i18n.t.bind(i18n);
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  
  useEffect(() => {
    loadOfferings();
  }, []);
  
  const loadOfferings = async () => {
    if (!isNative) {
      setLoadingOfferings(false);
      return;
    }
    
    try {
      const currentOffering = await getOfferings();
      setOfferings(currentOffering);
    } catch (error) {
      console.error('Failed to load offerings:', error);
    }
    setLoadingOfferings(false);
  };
  
  // Use RevenueCat's built-in paywall if available
  const presentRevenueCatPaywall = async (): Promise<boolean> => {
    if (!RevenueCatUI || !PAYWALL_RESULT) {
      console.log('RevenueCatUI not available');
      return false;
    }
    
    try {
      const paywallResult = await RevenueCatUI.presentPaywall();
      
      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          await checkPremiumStatus();
          return true;
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        case PAYWALL_RESULT.CANCELLED:
        default:
          return false;
      }
    } catch (error) {
      console.error('Paywall presentation error:', error);
      return false;
    }
  };
  
  const handlePurchase = async () => {
    setPurchasing(true);
    
    // Try to use RevenueCat's built-in paywall first (if configured in dashboard)
    if (isNative && RevenueCatUI) {
      const success = await presentRevenueCatPaywall();
      if (success) {
        setPurchasing(false);
        Alert.alert(
          t('common.success'),
          t('premium.purchaseSuccess'),
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
    }
    
    // Fallback: Manual package purchase
    if (isNative && offerings) {
      try {
        const packageId = selectedPlan === 'yearly' ? '$rc_annual' : '$rc_monthly';
        const packageToPurchase = offerings.availablePackages?.find(
          (pkg: any) => pkg.packageType === packageId || pkg.identifier === packageId
        );
        
        if (packageToPurchase) {
          const result = await purchasePackage(packageToPurchase);
          
          if (result.success) {
            await checkPremiumStatus();
            setPurchasing(false);
            Alert.alert(
              t('common.success'),
              t('premium.purchaseSuccess'),
              [{ text: 'OK', onPress: () => router.back() }]
            );
            return;
          } else if (result.error === 'cancelled') {
            setPurchasing(false);
            return;
          }
        }
      } catch (error) {
        console.error('Purchase error:', error);
      }
    }
    
    // Demo mode for web or if no offerings available
    if (!isNative) {
      // Simulate purchase for demo
      setTimeout(() => {
        const expiresAt = new Date();
        if (selectedPlan === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }
        
        setPremiumStatus(true, 'demo_subscription', expiresAt.toISOString(), selectedPlan);
        setPurchasing(false);
        Alert.alert(
          t('common.success'),
          t('premium.purchaseSuccess'),
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }, 1500);
      return;
    }
    
    setPurchasing(false);
    Alert.alert(t('common.error'), t('premium.purchaseError'));
  };
  
  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert(t('common.success'), t('premium.restoreSuccess'), [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert(t('common.error'), t('premium.restoreError'));
    }
  };
  
  const features = [
    {
      key: 'forecast',
      icon: 'analytics',
      title: '🔮 7-dagars prognos',
      description: 'Se hur många ägg du kan förvänta dig',
      premium: true,
    },
    {
      key: 'status',
      icon: 'pulse',
      title: '📊 Produktionsstatus',
      description: 'Normal, Låg eller Hög produktion',
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
      key: 'summary',
      icon: 'document-text',
      title: '📝 Daglig sammanfattning',
      description: 'AI-genererad status för din gård',
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
      key: 'history',
      icon: 'time',
      title: '📈 Obegränsad historik',
      description: 'Spara all statistik för alltid',
      premium: true,
    },
  ];
  
  // Get prices - always use SEK
  const getPrice = (plan: 'monthly' | 'yearly'): string => {
    // Always return SEK prices regardless of RevenueCat
    return plan === 'yearly' ? YEARLY_PRICE : MONTHLY_PRICE;
  };
  
  // Get monthly equivalent for yearly plan
  const getMonthlyEquivalent = (): string => {
    return '12,42 kr/mån';
  };
  
  if (loadingOfferings) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
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
          style={[styles.ctaButton, (purchasing || storeLoading) && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || storeLoading}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.ctaButtonText}>{t('premium.startPremium')}</Text>
          )}
        </TouchableOpacity>
        
        {/* Cancel anytime notice */}
        <Text style={styles.cancelNotice}>{t('premium.cancelAnytime')}</Text>
        
        {/* Restore purchases */}
        <TouchableOpacity 
          style={styles.restoreButton} 
          onPress={handleRestore} 
          disabled={storeLoading}
        >
          <Text style={styles.restoreButtonText}>{t('premium.restorePurchases')}</Text>
        </TouchableOpacity>
        
        {/* Terms notice */}
        <Text style={styles.termsNotice}>
          {t('premium.termsNotice', { store: Platform.OS === 'ios' ? 'App Store' : 'Google Play' })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 12,
    fontSize: 16,
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
  termsNotice: {
    textAlign: 'center',
    color: '#666',
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
});
