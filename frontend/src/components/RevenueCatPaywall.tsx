/**
 * RevenueCat Paywall Component for Hönsgården
 * Modern subscription paywall with package selection
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getManagementURL,
  ENTITLEMENT_ID,
  formatPackagePrice,
  calculateYearlySavings,
} from '../services/revenuecat';
import { usePremiumStore } from '../store/premiumStore';
import { useThemeStore } from '../store/themeStore';

interface PaywallProps {
  onClose?: () => void;
  onPurchaseComplete?: () => void;
}

export const RevenueCatPaywall: React.FC<PaywallProps> = ({
  onClose,
  onPurchaseComplete,
}) => {
  const { colors, isDark } = useThemeStore();
  const { isPremium, checkPremiumStatus } = usePremiumStore();
  
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Premium features list
  const premiumFeatures = [
    { icon: 'sparkles', text: 'AI-rådgivare "Agda"' },
    { icon: 'analytics', text: '7-dagars äggprognos' },
    { icon: 'document-text', text: 'AI Dagsrapport' },
    { icon: 'cloudy', text: 'Vädertips för hönsskötsel' },
    { icon: 'medkit', text: 'Hälsologg per höna' },
    { icon: 'egg', text: 'Kläckningsmodul' },
    { icon: 'nutrition', text: 'Foderhantering' },
    { icon: 'time', text: 'Obegränsad historik' },
    { icon: 'notifications', text: 'Smarta påminnelser' },
  ];
  
  useEffect(() => {
    loadOfferings();
  }, []);
  
  const loadOfferings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentOffering = await getOfferings();
      
      if (currentOffering) {
        setOffering(currentOffering);
        
        // DEV: Log package pricing details for debugging
        if (__DEV__) {
          console.log('=== RevenueCat Pricing Debug ===');
          currentOffering.availablePackages.forEach((pkg) => {
            const product = pkg.product;
            console.log(`Package: ${pkg.identifier}`);
            console.log(`  ProductId: ${product.identifier}`);
            console.log(`  Price: ${product.priceString}`);
            console.log(`  Currency: ${product.currencyCode}`);
            console.log(`  Price (raw): ${product.price}`);
            console.log('---');
          });
          console.log('================================');
        }
        
        // Select yearly by default (best value)
        const yearlyPkg = currentOffering.annual || currentOffering.availablePackages.find(p => p.packageType === 'ANNUAL');
        const monthlyPkg = currentOffering.monthly || currentOffering.availablePackages.find(p => p.packageType === 'MONTHLY');
        setSelectedPackage(yearlyPkg || monthlyPkg || currentOffering.availablePackages[0]);
      } else {
        setError('Inga prenumerationer tillgängliga just nu');
      }
    } catch (e: any) {
      setError('Kunde inte ladda prenumerationer');
      console.error('Load offerings error:', e);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePurchase = async () => {
    if (!selectedPackage) return;
    
    setPurchasing(true);
    setError(null);
    
    try {
      const result = await purchasePackage(selectedPackage);
      
      if (result.success) {
        await checkPremiumStatus();
        Alert.alert(
          '🎉 Välkommen till Premium!',
          'Du har nu tillgång till alla premium-funktioner.',
          [{ text: 'Fantastiskt!', onPress: () => onPurchaseComplete?.() }]
        );
      } else if (result.userCancelled) {
        // User cancelled - do nothing
      } else if (result.error) {
        setError(result.error);
      }
    } catch (e: any) {
      setError('Köpet misslyckades. Försök igen.');
      console.error('Purchase error:', e);
    } finally {
      setPurchasing(false);
    }
  };
  
  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    
    try {
      const result = await restorePurchases();
      
      if (result.isPremium) {
        await checkPremiumStatus();
        Alert.alert(
          '✅ Köp återställda!',
          'Dina tidigare köp har återställts.',
          [{ text: 'OK', onPress: () => onPurchaseComplete?.() }]
        );
      } else {
        Alert.alert(
          'Inga köp hittades',
          'Vi kunde inte hitta några tidigare köp för detta konto.'
        );
      }
    } catch (e: any) {
      setError('Kunde inte återställa köp');
    } finally {
      setRestoring(false);
    }
  };
  
  const handleManageSubscription = async () => {
    const url = await getManagementURL();
    if (url) {
      Linking.openURL(url);
    } else {
      // Fallback to platform-specific URL
      if (Platform.OS === 'ios') {
        Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    }
  };
  
  const styles = createStyles(colors, isDark);
  
  // If already premium, show management view
  if (isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.premiumActiveContainer}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={48} color="#FFD700" />
          </View>
          <Text style={styles.premiumActiveTitle}>Du är Premium! ⭐</Text>
          <Text style={styles.premiumActiveSubtitle}>
            Tack för att du stödjer Hönsgården
          </Text>
          
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageSubscription}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
            <Text style={styles.manageButtonText}>Hantera prenumeration</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>⭐</Text>
        <Text style={styles.heroTitle}>Hönsgården Premium</Text>
        <Text style={styles.heroSubtitle}>
          Lås upp alla funktioner och ta din hönsgård till nästa nivå
        </Text>
      </View>
      
      {/* Features */}
      <View style={styles.featuresContainer}>
        {premiumFeatures.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon as any} size={20} color={colors.primary} />
            </View>
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>
      
      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Laddar prenumerationer...</Text>
        </View>
      )}
      
      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={24} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOfferings}>
            <Text style={styles.retryButtonText}>Försök igen</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Package Selection */}
      {!loading && offering && (
        <View style={styles.packagesContainer}>
          {offering.availablePackages.map((pkg) => {
            const isSelected = selectedPackage?.identifier === pkg.identifier;
            const isYearly = pkg.packageType === 'ANNUAL';
            const savings = isYearly ? calculateYearlySavings(offering.monthly, pkg) : 0;
            
            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.packageCard,
                  isSelected && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedPackage(pkg)}
              >
                {isYearly && savings > 0 && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>Spara {savings}%</Text>
                  </View>
                )}
                
                <View style={styles.packageRadio}>
                  <View style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>
                
                <View style={styles.packageInfo}>
                  <Text style={styles.packageTitle}>
                    {isYearly ? 'Årsplan' : 'Månadsplan'}
                  </Text>
                  <Text style={styles.packagePrice}>
                    {formatPackagePrice(pkg)}
                  </Text>
                  {isYearly && (
                    <Text style={styles.packageSubtext}>
                      Bäst värde - betala för 12 månader
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      
      {/* Purchase Button */}
      {!loading && selectedPackage && (
        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Fortsätt med {selectedPackage.product.priceString}
            </Text>
          )}
        </TouchableOpacity>
      )}
      
      {/* Restore Purchases */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={restoring}
      >
        {restoring ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Text style={styles.restoreButtonText}>Återställ köp</Text>
        )}
      </TouchableOpacity>
      
      {/* Legal */}
      <Text style={styles.legalText}>
        Prenumerationen förnyas automatiskt om den inte avbryts minst 24 timmar
        innan den aktuella perioden slutar. Du kan hantera och avbryta din
        prenumeration i {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}.
      </Text>
      
      <View style={styles.legalLinks}>
        <TouchableOpacity onPress={() => Linking.openURL('https://honsgarden.se/privacy.html')}>
          <Text style={styles.legalLink}>Integritetspolicy</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>•</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://honsgarden.se/terms.html')}>
          <Text style={styles.legalLink}>Användarvillkor</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 24,
    borderRadius: 12,
  },
  errorText: {
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  packagesContainer: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  packageRadio: {
    marginRight: 16,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  packageInfo: {
    flex: 1,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  packageSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  purchaseButton: {
    marginHorizontal: 24,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  restoreButtonText: {
    color: colors.primary,
    fontSize: 15,
  },
  legalText: {
    paddingHorizontal: 24,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    color: colors.primary,
  },
  legalSeparator: {
    color: colors.textSecondary,
  },
  premiumActiveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumBadge: {
    marginBottom: 16,
  },
  premiumActiveTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  premiumActiveSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  manageButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default RevenueCatPaywall;
