import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { useAuthStore } from '../../src/store/authStore';
import i18n from '../../src/i18n';

const PREMIUM_WEB_URL = 'https://honsgarden.se/premium';

const PREMIUM_FEATURES = [
  { 
    icon: 'sparkles', 
    title: 'AI Dagsrapport', 
    titleEn: 'AI Daily Report',
    description: 'Få personliga insikter och råd baserat på din hönsgård',
    descriptionEn: 'Get personalized insights based on your coop'
  },
  { 
    icon: 'trending-up', 
    title: 'Äggprognos', 
    titleEn: '7-Day Forecast',
    description: '7 dagars prognos baserad på historik och säsong',
    descriptionEn: '7-day forecast based on history and season'
  },
  { 
    icon: 'chatbubbles', 
    title: 'AI-rådgivare Agda', 
    titleEn: 'AI Advisor Agda',
    description: 'Ställ frågor och få expertråd om hönsskötsel',
    descriptionEn: 'Ask questions and get expert advice'
  },
  { 
    icon: 'medkit', 
    title: 'Hälsologg', 
    titleEn: 'Health Log',
    description: 'Dokumentera och spåra hönornas hälsa',
    descriptionEn: 'Document and track hen health'
  },
  { 
    icon: 'egg', 
    title: 'Kläckningsmodul', 
    titleEn: 'Hatching Module',
    description: 'Håll koll på kläckningar och kycklingar',
    descriptionEn: 'Track hatching and chicks'
  },
  { 
    icon: 'leaf', 
    title: 'Foderhantering', 
    titleEn: 'Feed Management',
    description: 'Spåra foderinköp och förbrukning',
    descriptionEn: 'Track feed purchases and consumption'
  },
  { 
    icon: 'cloudy', 
    title: 'Vädertips', 
    titleEn: 'Weather Tips',
    description: 'Anpassade tips baserat på vädret',
    descriptionEn: 'Custom tips based on weather'
  },
  { 
    icon: 'analytics', 
    title: 'Avancerad statistik', 
    titleEn: 'Advanced Statistics',
    description: 'Djupgående analyser och PDF-export',
    descriptionEn: 'Deep analysis and PDF export'
  },
  { 
    icon: 'infinite', 
    title: 'Obegränsad historik', 
    titleEn: 'Unlimited History',
    description: 'Spara all data utan tidsgräns',
    descriptionEn: 'Save all data without time limits'
  },
  { 
    icon: 'layers', 
    title: 'Obegränsade flockar', 
    titleEn: 'Unlimited Flocks',
    description: 'Hantera flera flockar och hönsgårdar',
    descriptionEn: 'Manage multiple flocks and coops'
  },
];

export default function PremiumScreen() {
  const { colors } = useThemeStore();
  const { isPremium, plan, expiresAt, loading, checkPremiumStatus } = usePremiumStore();
  const { user } = useAuthStore();
  const isSv = i18n.locale.startsWith('sv');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  
  useEffect(() => {
    checkPremiumStatus();
  }, []);
  
  const handleSubscribe = () => {
    Alert.alert(
      isSv ? 'Prenumerera via webben' : 'Subscribe via web',
      isSv 
        ? 'Du kommer att omdirigeras till honsgarden.se för att slutföra din prenumeration. Logga in med samma konto där.'
        : 'You will be redirected to honsgarden.se to complete your subscription. Log in with the same account there.',
      [
        {
          text: isSv ? 'Avbryt' : 'Cancel',
          style: 'cancel',
        },
        {
          text: isSv ? 'Öppna webbsidan' : 'Open website',
          onPress: () => {
            Linking.openURL(PREMIUM_WEB_URL).catch(() => {
              Alert.alert(
                isSv ? 'Fel' : 'Error',
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
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  const styles = createStyles(colors);
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  
  // If user is already premium, show status
  if (isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
            <Text style={styles.title}>
              {isSv ? 'Du har Premium!' : 'You have Premium!'}
            </Text>
            <Text style={styles.subtitle}>
              {isSv ? 'Tack för att du stöttar Hönsgården' : 'Thank you for supporting Hönsgården'}
            </Text>
          </View>
          
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>{isSv ? 'Plan' : 'Plan'}</Text>
              <Text style={styles.statusValue}>
                {plan === 'yearly' ? (isSv ? 'Årlig' : 'Yearly') : (isSv ? 'Månatlig' : 'Monthly')}
              </Text>
            </View>
            {expiresAt && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{isSv ? 'Förnyas' : 'Renews'}</Text>
                <Text style={styles.statusValue}>{formatDate(expiresAt)}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.sectionTitle}>
            {isSv ? 'Dina premium-funktioner' : 'Your premium features'}
          </Text>
          
          <View style={styles.featuresGrid}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Ionicons 
                    name={feature.icon as keyof typeof Ionicons.glyphMap} 
                    size={24} 
                    color="#4ade80" 
                  />
                </View>
                <Text style={styles.featureTitle}>
                  {isSv ? feature.title : feature.titleEn}
                </Text>
                <Text style={styles.featureDescription}>
                  {isSv ? feature.description : feature.descriptionEn}
                </Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => Linking.openURL(PREMIUM_WEB_URL)}
          >
            <Ionicons name="settings-outline" size={20} color={colors.text} />
            <Text style={styles.manageButtonText}>
              {isSv ? 'Hantera prenumeration' : 'Manage subscription'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  // Non-premium user - show upgrade screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIconContainer}>
            <Ionicons name="star" size={48} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>
            {isSv ? 'Uppgradera till Premium' : 'Upgrade to Premium'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isSv 
              ? 'Lås upp alla funktioner och få ut det mesta av din hönsgård'
              : 'Unlock all features and get the most out of your coop'}
          </Text>
        </View>
        
        {/* Pricing Cards */}
        <View style={styles.pricingSection}>
          <TouchableOpacity 
            style={[
              styles.priceCard, 
              selectedPlan === 'monthly' && styles.priceCardSelected
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.priceCardHeader}>
              <Text style={styles.priceCardTitle}>{isSv ? 'Månatlig' : 'Monthly'}</Text>
              {selectedPlan === 'monthly' && (
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
              )}
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>19</Text>
              <Text style={styles.priceCurrency}>kr/mån</Text>
            </View>
            <Text style={styles.priceSubtext}>
              {isSv ? 'Flexibelt, avsluta när som helst' : 'Flexible, cancel anytime'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.priceCard, 
              styles.priceCardPopular,
              selectedPlan === 'yearly' && styles.priceCardSelected
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>
                {isSv ? 'SPARA 35%' : 'SAVE 35%'}
              </Text>
            </View>
            <View style={styles.priceCardHeader}>
              <Text style={styles.priceCardTitle}>{isSv ? 'Årlig' : 'Yearly'}</Text>
              {selectedPlan === 'yearly' && (
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
              )}
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>149</Text>
              <Text style={styles.priceCurrency}>kr/år</Text>
            </View>
            <Text style={styles.priceHighlight}>
              {isSv ? '12,42 kr/mån - bäst värde!' : '12.42 kr/month - best value!'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Trial Info */}
        <View style={styles.trialBanner}>
          <Ionicons name="gift" size={24} color="#f59e0b" />
          <View style={styles.trialTextContainer}>
            <Text style={styles.trialTitle}>
              {isSv ? '7 dagars gratis provperiod!' : '7 days free trial!'}
            </Text>
            <Text style={styles.trialSubtext}>
              {isSv 
                ? 'Nya användare får prova Premium gratis i 7 dagar'
                : 'New users get to try Premium free for 7 days'}
            </Text>
          </View>
        </View>
        
        {/* Features List */}
        <Text style={styles.sectionTitle}>
          {isSv ? 'Allt som ingår i Premium' : 'Everything included in Premium'}
        </Text>
        
        <View style={styles.featuresGrid}>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons 
                  name={feature.icon as keyof typeof Ionicons.glyphMap} 
                  size={24} 
                  color="#4ade80" 
                />
              </View>
              <Text style={styles.featureTitle}>
                {isSv ? feature.title : feature.titleEn}
              </Text>
              <Text style={styles.featureDescription}>
                {isSv ? feature.description : feature.descriptionEn}
              </Text>
            </View>
          ))}
        </View>
        
        {/* CTA Button */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleSubscribe}>
            <Ionicons name="globe-outline" size={22} color="#000" />
            <Text style={styles.ctaButtonText}>
              {isSv ? 'Prenumerera via honsgarden.se' : 'Subscribe via honsgarden.se'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.ctaNote}>
            {isSv 
              ? 'Betalning hanteras säkert via Stripe på vår webbplats'
              : 'Payment handled securely via Stripe on our website'}
          </Text>
        </View>
        
        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>
            {isSv ? 'Vanliga frågor' : 'FAQ'}
          </Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              {isSv ? 'Varför betalar jag via webben?' : 'Why do I pay via web?'}
            </Text>
            <Text style={styles.faqAnswer}>
              {isSv 
                ? 'Genom att hantera betalningar via vår webbplats kan vi erbjuda lägre priser och bättre support.'
                : 'By handling payments via our website, we can offer lower prices and better support.'}
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              {isSv ? 'Kan jag avsluta när som helst?' : 'Can I cancel anytime?'}
            </Text>
            <Text style={styles.faqAnswer}>
              {isSv 
                ? 'Ja! Du kan avsluta din prenumeration när som helst via honsgarden.se.'
                : 'Yes! You can cancel your subscription anytime via honsgarden.se.'}
            </Text>
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  premiumBadgeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 20,
    width: 200,
    height: 200,
    backgroundColor: '#f59e0b',
    opacity: 0.1,
    borderRadius: 100,
  },
  heroIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  pricingSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  priceCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priceCardSelected: {
    borderColor: '#4ade80',
  },
  priceCardPopular: {
    position: 'relative',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#4ade80',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  saveBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  priceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
  },
  priceCurrency: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  priceSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceHighlight: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '500',
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
    gap: 12,
  },
  trialTextContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 2,
  },
  trialSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  ctaSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ade80',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  ctaNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 40,
  },
  manageButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  faqSection: {
    paddingHorizontal: 20,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
