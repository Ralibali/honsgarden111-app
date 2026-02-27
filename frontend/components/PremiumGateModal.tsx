import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import i18n from '../src/i18n';
import { getOfferings, formatPackagePrice } from '../src/services/revenuecat';
import { PurchasesOffering } from 'react-native-purchases';

// TypeScript interface for props
type PremiumGateModalProps = {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
  featureIcon?: keyof typeof Ionicons.glyphMap;
};

const PREMIUM_FEATURES = [
  { icon: 'document-text', title: 'AI Dagsrapport', titleEn: 'AI Daily Report' },
  { icon: 'trending-up', title: 'Äggprognos 7 dagar', titleEn: '7-Day Forecast' },
  { icon: 'chatbubbles', title: 'AI-rådgivare "Agda"', titleEn: 'AI Advisor "Agda"' },
  { icon: 'cloudy', title: 'Vädertips', titleEn: 'Weather Tips' },
  { icon: 'medkit', title: 'Hälsologg', titleEn: 'Health Log' },
  { icon: 'egg', title: 'Kläckningsmodul', titleEn: 'Hatching Module' },
  { icon: 'leaf', title: 'Foderhantering', titleEn: 'Feed Management' },
  { icon: 'analytics', title: 'Avancerad statistik', titleEn: 'Advanced Statistics' },
];

export default function PremiumGateModal({ 
  visible, 
  onClose, 
  featureName,
  featureIcon = 'star'
}: PremiumGateModalProps) {
  const isSv = i18n.locale.startsWith('sv');
  const router = useRouter();
  
  // State for prices
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  
  // Load prices when modal becomes visible
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      loadPrices();
    }
  }, [visible]);
  
  const loadPrices = async () => {
    setLoadingPrices(true);
    try {
      const offering = await getOfferings();
      if (offering) {
        const monthly = offering.monthly || offering.availablePackages.find(p => p.packageType === 'MONTHLY');
        const yearly = offering.annual || offering.availablePackages.find(p => p.packageType === 'ANNUAL');
        
        if (monthly) {
          setMonthlyPrice(monthly.product.priceString);
        }
        if (yearly) {
          setYearlyPrice(yearly.product.priceString);
        }
      }
    } catch (e) {
      console.log('Could not load prices for modal:', e);
    }
    setLoadingPrices(false);
  };
  
  // Navigate to paywall - this handles both iOS (IAP) and Android (web) correctly
  const handleUpgrade = () => {
    onClose(); // Close modal first
    router.push('/paywall');
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header with gradient effect */}
          <View style={styles.header}>
            <View style={styles.headerGlow} />
            <View style={styles.iconContainer}>
              <Ionicons name="star" size={40} color="#FFD700" />
            </View>
            <Text style={styles.title}>
              {isSv ? 'Uppgradera till Premium' : 'Upgrade to Premium'}
            </Text>
            {featureName && (
              <View style={styles.featureHighlight}>
                <Ionicons name={featureIcon} size={16} color="#f59e0b" />
                <Text style={styles.featureHighlightText}>
                  {isSv ? `Lås upp: ${featureName}` : `Unlock: ${featureName}`}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          
          {/* Features list */}
          <ScrollView style={styles.featuresContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.featuresTitle}>
              {isSv ? 'Allt som ingår:' : 'Everything included:'}
            </Text>
            
            <View style={styles.featuresGrid}>
              {PREMIUM_FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureIconCircle}>
                    <Ionicons 
                      name={feature.icon as keyof typeof Ionicons.glyphMap} 
                      size={20} 
                      color="#4ade80" 
                    />
                  </View>
                  <Text style={styles.featureText}>
                    {isSv ? feature.title : feature.titleEn}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Pricing - simplified for modal, actual prices shown in paywall */}
            <View style={styles.pricingSection}>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>
                  {isSv ? 'Månatlig' : 'Monthly'}
                </Text>
                <Text style={styles.priceAmount}>
                  {isSv ? 'Flexibelt' : 'Flexible'}
                </Text>
              </View>
              
              <View style={[styles.priceCard, styles.priceCardPopular]}>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>
                    {isSv ? 'Populärast' : 'Most popular'}
                  </Text>
                </View>
                <Text style={styles.priceLabel}>
                  {isSv ? 'Årlig' : 'Yearly'}
                </Text>
                <Text style={styles.priceAmount}>
                  {isSv ? 'Bäst värde' : 'Best value'}
                </Text>
              </View>
            </View>
            
            {/* Trial info */}
            <View style={styles.trialInfo}>
              <Ionicons name="gift" size={20} color="#f59e0b" />
              <Text style={styles.trialText}>
                {isSv 
                  ? '7 dagars gratis provperiod för nya användare!' 
                  : '7 days free trial for new users!'}
              </Text>
            </View>
          </ScrollView>
          
          {/* CTA Button */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity 
              style={styles.ctaButton} 
              onPress={handleUpgrade}
            >
              <Ionicons 
                name="star" 
                size={20} 
                color="#000" 
                style={{ marginRight: 8 }} 
              />
              <Text style={styles.ctaButtonText}>
                {isSv ? 'Uppgradera nu' : 'Upgrade now'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterButtonText}>
                {isSv ? 'Kanske senare' : 'Maybe later'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 100,
    backgroundColor: '#f59e0b',
    opacity: 0.1,
    borderRadius: 100,
    transform: [{ scaleX: 2 }],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  featureHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  featureHighlightText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    gap: 10,
  },
  featureIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
  },
  pricingSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  priceCard: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  priceCardSelected: {
    borderColor: '#4ade80',
  },
  priceCardPopular: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#4ade80',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  priceLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
  },
  priceCurrency: {
    color: '#9ca3af',
    fontSize: 14,
    marginLeft: 4,
  },
  priceSubtext: {
    color: '#4ade80',
    fontSize: 12,
    marginTop: 4,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  trialText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '500',
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  ctaButton: {
    backgroundColor: '#4ade80',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  paymentNote: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterButtonText: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
