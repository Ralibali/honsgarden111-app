import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '../src/store/premiumStore';
import i18n, { formatCurrency } from '../src/i18n';

const MONTHLY_PRICE = 19;
const YEARLY_PRICE = 149;
const YEARLY_SAVINGS = Math.round((1 - (YEARLY_PRICE / (MONTHLY_PRICE * 12))) * 100);

export default function PaywallScreen() {
  const router = useRouter();
  const { setPremiumStatus, restorePurchases, loading } = usePremiumStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  
  const t = i18n.t.bind(i18n);
  
  const handlePurchase = async () => {
    setPurchasing(true);
    
    // TODO: Integrate with RevenueCat
    // For now, simulate purchase
    try {
      // In production, this would call RevenueCat
      // const { customerInfo } = await Purchases.purchasePackage(package);
      
      // Simulate successful purchase for demo
      setTimeout(() => {
        setPremiumStatus(true, 'demo_subscription', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), selectedPlan);
        setPurchasing(false);
        Alert.alert(
          t('common.success'),
          t('premium.purchaseSuccess'),
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }, 1500);
    } catch (error) {
      setPurchasing(false);
      Alert.alert(t('common.error'), t('premium.purchaseError'));
    }
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
      key: 'coops',
      icon: 'home',
      title: t('premium.features.coops'),
      free: t('premium.features.coopsFree'),
      premium: t('premium.features.coopsPremium'),
    },
    {
      key: 'history',
      icon: 'time',
      title: t('premium.features.history'),
      free: t('premium.features.historyFree'),
      premium: t('premium.features.historyPremium'),
    },
    {
      key: 'monthStats',
      icon: 'calendar',
      title: t('premium.features.monthStats'),
      free: true,
      premium: true,
    },
    {
      key: 'yearStats',
      icon: 'stats-chart',
      title: t('premium.features.yearStats'),
      free: false,
      premium: true,
    },
    {
      key: 'pdfExport',
      icon: 'document-text',
      title: t('premium.features.pdfExport'),
      free: false,
      premium: true,
    },
    {
      key: 'reminders',
      icon: 'notifications',
      title: t('premium.features.reminders'),
      free: false,
      premium: true,
    },
    {
      key: 'noAds',
      icon: 'eye-off',
      title: t('premium.features.noAds'),
      free: false,
      premium: true,
    },
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
          <Text style={styles.subtitle}>{t('premium.subtitle')}</Text>
        </View>
        
        {/* Features Comparison */}
        <View style={styles.featuresCard}>
          <View style={styles.featuresHeader}>
            <View style={styles.featureColumn} />
            <View style={styles.planColumn}>
              <Text style={styles.planLabel}>{t('common.free')}</Text>
            </View>
            <View style={styles.planColumn}>
              <Text style={[styles.planLabel, styles.premiumLabel]}>{t('common.premium')}</Text>
            </View>
          </View>
          
          {features.map((feature) => (
            <View key={feature.key} style={styles.featureRow}>
              <View style={styles.featureColumn}>
                <Ionicons name={feature.icon as any} size={18} color="#8E8E93" />
                <Text style={styles.featureTitle}>{feature.title}</Text>
              </View>
              <View style={styles.planColumn}>
                {typeof feature.free === 'boolean' ? (
                  <Ionicons
                    name={feature.free ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={feature.free ? '#4CAF50' : '#666'}
                  />
                ) : (
                  <Text style={styles.featureValue}>{feature.free}</Text>
                )}
              </View>
              <View style={styles.planColumn}>
                {typeof feature.premium === 'boolean' ? (
                  <Ionicons
                    name={feature.premium ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={feature.premium ? '#4CAF50' : '#666'}
                  />
                ) : (
                  <Text style={[styles.featureValue, styles.premiumValue]}>{feature.premium}</Text>
                )}
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
            {YEARLY_SAVINGS > 0 && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>
                  {t('premium.yearlySavings', { percent: YEARLY_SAVINGS })}
                </Text>
              </View>
            )}
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
              <Text style={styles.planPrice}>{YEARLY_PRICE} kr{t('common.perYear')}</Text>
              <Text style={styles.planMonthly}>({Math.round(YEARLY_PRICE / 12)} kr{t('common.perMonth')})</Text>
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
              <Text style={styles.planPrice}>{MONTHLY_PRICE} kr{t('common.perMonth')}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          <Text style={styles.ctaButtonText}>
            {purchasing ? t('common.loading') : t('premium.startPremium')}
          </Text>
        </TouchableOpacity>
        
        {/* Cancel anytime notice */}
        <Text style={styles.cancelNotice}>{t('premium.cancelAnytime')}</Text>
        
        {/* Restore purchases */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={loading}>
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
  planColumn: {
    flex: 1,
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  premiumLabel: {
    color: '#FFD93D',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  featureTitle: {
    fontSize: 14,
    color: '#FFF',
  },
  featureValue: {
    fontSize: 12,
    color: '#8E8E93',
  },
  premiumValue: {
    color: '#4CAF50',
    fontWeight: '500',
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
