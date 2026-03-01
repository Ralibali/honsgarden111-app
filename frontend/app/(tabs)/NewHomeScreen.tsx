/**
 * NewHomeScreen Component
 * Matches the web app's new dashboard design
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppStore, apiFetch } from '../../src/store/appStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface YesterdaySummary {
  eggs_yesterday: number;
  hen_count: number;
  laying_percentage: number;
  eggs_this_week: number;
  estimated_monthly_value: number;
}

export default function NewHomeScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const { coopSettings, todayStats, fetchCoopSettings, fetchTodayStats, addEggRecord } = useAppStore();
  const { isPremium, checkPremiumStatus } = usePremiumStore();

  const [refreshing, setRefreshing] = useState(false);
  const [yesterdaySummary, setYesterdaySummary] = useState<YesterdaySummary | null>(null);
  const [hens, setHens] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [showEggModal, setShowEggModal] = useState(false);
  const [eggCount, setEggCount] = useState('');
  const [selectedHen, setSelectedHen] = useState('');
  const [saving, setSaving] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [flockStats, setFlockStats] = useState<any>(null);

  // Animations
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useFocusEffect(
    useCallback(() => {
      loadAllData();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  const loadAllData = async () => {
    try {
      await Promise.all([
        fetchCoopSettings(),
        fetchTodayStats(),
        checkPremiumStatus(),
        loadYesterdaySummary(),
        loadHens(),
        loadWeather(),
        loadFlockStats(),
      ]);
      setIsVisible(true);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadYesterdaySummary = async () => {
    try {
      const res = await apiFetch('/api/stats/yesterday-summary');
      if (res.ok) {
        setYesterdaySummary(await res.json());
      }
    } catch (e) {}
  };

  const loadHens = async () => {
    try {
      const res = await apiFetch('/api/hens?active_only=true');
      if (res.ok) {
        setHens(await res.json());
      }
    } catch (e) {}
  };

  const loadWeather = async () => {
    try {
      const res = await apiFetch('/api/weather');
      if (res.ok) {
        setWeather(await res.json());
      }
    } catch (e) {}
  };

  const loadFlockStats = async () => {
    try {
      const res = await apiFetch('/api/flock/statistics');
      if (res.ok) {
        setFlockStats(await res.json());
      }
    } catch (e) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleQuickAdd = async (count: number) => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const body: any = { count, date: format(new Date(), 'yyyy-MM-dd') };
      if (selectedHen) body.hen_id = selectedHen;

      const res = await apiFetch('/api/eggs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadAllData();
        setEggCount('');
        setSelectedHen('');
        setShowEggModal(false);
      }
    } catch (error) {
      console.error('Failed to add eggs:', error);
    } finally {
      setSaving(false);
    }
  };

  // Helpers
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'God morgon';
    if (hour < 12) return 'God förmiddag';
    if (hour < 18) return 'God eftermiddag';
    return 'God kväll';
  };

  const getSwedishDate = () => {
    const today = new Date();
    const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
    const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                    'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
    return `${days[today.getDay()].charAt(0).toUpperCase() + days[today.getDay()].slice(1)} ${today.getDate()} ${months[today.getMonth()]}`;
  };

  const getLayingPercentage = (): string => {
    const henCount = yesterdaySummary?.hen_count ?? 0;
    const eggsYesterday = yesterdaySummary?.eggs_yesterday ?? 0;
    if (henCount <= 0) return '—';
    if (eggsYesterday > henCount) return '—';
    const pct = Math.round((eggsYesterday / henCount) * 100);
    return `${pct}%`;
  };

  const getPreviewInsight = () => {
    const eggsYesterday = yesterdaySummary?.eggs_yesterday ?? 0;
    const henCount = yesterdaySummary?.hen_count ?? 0;
    if (henCount === 0) return "Lägg till dina hönor för personlig analys.";
    if (eggsYesterday === 0) return "Registrera ägg för att få AI-analys.";
    const pct = Math.round((eggsYesterday / henCount) * 100);
    if (pct >= 80) return "Äggproduktionen ser stabil ut idag.";
    if (pct >= 50) return "Produktionen är normal för årstiden.";
    return "Vi ser potential för optimering.";
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ══════════════════════════════════════════════════════════════════
            SEKTION 1: Header + Kompakt Stat-rad
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerGreeting}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.headerTitle}>{coopSettings?.coop_name || 'Min Hönsgård'}</Text>
              <Text style={styles.headerDate}>{getSwedishDate()}</Text>
            </View>
            {weather?.current && (
              <TouchableOpacity 
                style={styles.weatherPill}
                onPress={() => setShowWeatherModal(true)}
              >
                <Text style={styles.weatherEmoji}>
                  {weather.current.temp < 5 ? '❄️' : weather.current.temp < 15 ? '🌥️' : '☀️'}
                </Text>
                <Text style={styles.weatherTemp}>{Math.round(weather.current.temp)}°</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Kompakt horisontell stat-rad */}
          <View style={styles.statStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🥚</Text>
              <Text style={styles.statValue}>{yesterdaySummary?.eggs_yesterday ?? 0}</Text>
              <Text style={styles.statLabel}>igår</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🐔</Text>
              <Text style={styles.statValue}>{yesterdaySummary?.hen_count ?? hens.length}</Text>
              <Text style={styles.statLabel}>hönor</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>📅</Text>
              <Text style={styles.statValue}>{yesterdaySummary?.eggs_this_week ?? 0}</Text>
              <Text style={styles.statLabel}>veckan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={[styles.statItem, styles.statItemHighlight]}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={[styles.statValue, styles.statValueSuccess]}>+{yesterdaySummary?.estimated_monthly_value ?? 0}</Text>
              <Text style={styles.statLabel}>kr/mån</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SEKTION 2: Primär CTA - Registrera ägg
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.primaryCtaSection}>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => setShowEggModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaIcon}>🥚</Text>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>Registrera ägg</Text>
              <Text style={styles.ctaSubtitle}>
                {(todayStats?.egg_count ?? 0) > 0
                  ? `${todayStats?.egg_count} ägg idag`
                  : 'Tryck för att lägga till'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SEKTION 3: Premium Teaser (aspirational)
        ══════════════════════════════════════════════════════════════════ */}
        {!isPremium && (
          <View style={styles.premiumTeaserSection}>
            <View style={styles.aiPreviewCard}>
              <View style={styles.aiPreviewHeader}>
                <Text style={styles.aiRobot}>🤖</Text>
                <Text style={styles.aiLabel}>AI-INSIKT</Text>
              </View>
              <Text style={styles.aiPreviewText}>"{getPreviewInsight()}"</Text>
              <TouchableOpacity
                style={styles.unlockBtn}
                onPress={() => router.push('/paywall')}
                activeOpacity={0.8}
              >
                <Text style={styles.unlockBtnIcon}>⭐</Text>
                <Text style={styles.unlockBtnText}>Lås upp djupare analys</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.premiumFeaturesPreview}>
              <TouchableOpacity 
                style={styles.featurePreview}
                onPress={() => router.push('/paywall')}
              >
                <Text>📈</Text>
                <Text style={styles.featurePreviewText}>Se 7-dagars prognos</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.featurePreview}
                onPress={() => router.push('/paywall')}
              >
                <Text>🐔</Text>
                <Text style={styles.featurePreviewText}>Få smart flockråd</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Premium users: Full AI access */}
        {isPremium && (
          <View style={styles.aiSectionPremium}>
            <View style={styles.aiGrid}>
              <TouchableOpacity 
                style={styles.aiCardPremium}
                onPress={() => router.push('/ai-advisor')}
              >
                <Text style={styles.aiCardIcon}>🐔</Text>
                <View style={styles.aiCardInfo}>
                  <Text style={styles.aiCardTitle}>Fråga Agda</Text>
                  <Text style={styles.aiCardDesc}>Din AI-rådgivare</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.aiCardPremium}
                onPress={() => router.push('/daily-tip')}
              >
                <Text style={styles.aiCardIcon}>💡</Text>
                <View style={styles.aiCardInfo}>
                  <Text style={styles.aiCardTitle}>Dagens tips</Text>
                  <Text style={styles.aiCardDesc}>Dagligt hönstips</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.aiCardPremium}
                onPress={() => router.push('/daily-report')}
              >
                <Text style={styles.aiCardIcon}>📋</Text>
                <View style={styles.aiCardInfo}>
                  <Text style={styles.aiCardTitle}>Dagsrapport</Text>
                  <Text style={styles.aiCardDesc}>Personlig AI-analys</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.aiCardPremium}
                onPress={() => router.push('/forecast')}
              >
                <Text style={styles.aiCardIcon}>📈</Text>
                <View style={styles.aiCardInfo}>
                  <Text style={styles.aiCardTitle}>7-dagars prognos</Text>
                  <Text style={styles.aiCardDesc}>Förutsäg produktion</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SEKTION 4: Min Flock
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.flockSection}>
          <Text style={styles.sectionTitle}>MIN FLOCK</Text>
          <View style={styles.flockGrid}>
            <TouchableOpacity 
              style={styles.flockCard}
              onPress={() => router.push('/(tabs)/hens')}
            >
              <Text style={styles.cardIcon}>🐔</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Mina hönor</Text>
                <Text style={styles.cardMeta}>{hens.length} st</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.flockCard}
              onPress={() => router.push('/(tabs)/hens')}
            >
              <Text style={styles.cardIcon}>➕</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Lägg till höna</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Flockråd inline */}
          {flockStats?.recommendations && flockStats.recommendations.length > 0 && (
            <View style={styles.flockTips}>
              {flockStats.recommendations.slice(0, 2).map((rec: any, idx: number) => (
                <View 
                  key={idx} 
                  style={[
                    styles.flockTip,
                    rec.type === 'warning' && styles.flockTipWarning,
                    rec.type === 'success' && styles.flockTipSuccess,
                  ]}
                >
                  <Text>{rec.type === 'success' ? '✅' : rec.type === 'warning' ? '⚠️' : '💡'}</Text>
                  <Text style={styles.flockTipText}>{rec.message}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SEKTION 5: Analys & Ekonomi
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.secondarySection}>
          <Text style={styles.sectionTitle}>ANALYS & EKONOMI</Text>
          <View style={styles.secondaryGrid}>
            <TouchableOpacity 
              style={styles.secondaryCard}
              onPress={() => router.push('/(tabs)/statistics')}
            >
              <Text style={styles.secondaryCardIcon}>📊</Text>
              <Text style={styles.secondaryCardTitle}>Statistik</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryCard}
              onPress={() => router.push('/(tabs)/finance')}
            >
              <Text style={styles.secondaryCardIcon}>💰</Text>
              <Text style={styles.secondaryCardTitle}>Ekonomi</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryCard}
              onPress={() => router.push('/(tabs)/eggs')}
            >
              <Text style={styles.secondaryCardIcon}>🥚</Text>
              <Text style={styles.secondaryCardTitle}>Ägglogg</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryCard}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <Text style={styles.secondaryCardIcon}>⚙️</Text>
              <Text style={styles.secondaryCardTitle}>Inställn.</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer for bottom nav */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          EGG MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showEggModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEggModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🥚 Registrera ägg</Text>
              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => setShowEggModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {hens.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Välj höna (valfritt)</Text>
                <View style={styles.henPicker}>
                  <TouchableOpacity
                    style={[styles.henOption, !selectedHen && styles.henOptionSelected]}
                    onPress={() => setSelectedHen('')}
                  >
                    <Text style={styles.henOptionText}>Alla</Text>
                  </TouchableOpacity>
                  {hens.slice(0, 5).map(hen => (
                    <TouchableOpacity
                      key={hen.id}
                      style={[styles.henOption, selectedHen === hen.id && styles.henOptionSelected]}
                      onPress={() => setSelectedHen(hen.id)}
                    >
                      <Text style={styles.henOptionText}>{hen.name?.substring(0, 8)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.quickButtons}>
              {[1, 2, 3, 5, 10].map(num => (
                <TouchableOpacity
                  key={num}
                  style={styles.quickBtn}
                  onPress={() => handleQuickAdd(num)}
                  disabled={saving}
                >
                  <Text style={styles.quickBtnText}>+{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customInput}>
              <TextInput
                style={styles.input}
                placeholder="Annat antal"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={eggCount}
                onChangeText={setEggCount}
              />
              <TouchableOpacity
                style={[styles.addBtn, (!eggCount || saving) && styles.addBtnDisabled]}
                onPress={() => eggCount && handleQuickAdd(parseInt(eggCount))}
                disabled={!eggCount || saving}
              >
                <Text style={styles.addBtnText}>Lägg till</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weather Modal */}
      <Modal
        visible={showWeatherModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWeatherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌤️ Väder & tips</Text>
              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => setShowWeatherModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {weather?.current && (
              <View style={styles.weatherDetails}>
                <Text style={styles.weatherTempLarge}>{Math.round(weather.current.temp)}°C</Text>
                <Text style={styles.weatherDesc}>{weather.current.description}</Text>
                <Text style={styles.weatherLoc}>{weather.current.location}</Text>
                {weather.tips && weather.tips.length > 0 && (
                  <View style={styles.weatherTips}>
                    <Text style={styles.weatherTipsTitle}>Tips för idag:</Text>
                    {weather.tips.map((tip: any, i: number) => (
                      <Text key={i} style={styles.weatherTip}>{tip.message}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // Header
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerGreeting: {
    gap: 2,
  },
  greetingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  headerDate: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weatherEmoji: {
    fontSize: 16,
  },
  weatherTemp: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Stat Strip
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItemHighlight: {},
  statIcon: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statValueSuccess: {
    color: colors.success || '#6B8E5A',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },

  // Primary CTA
  primaryCtaSection: {
    marginBottom: 20,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: colors.success || '#6B8E5A',
    borderRadius: 12,
  },
  ctaIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // Premium Teaser
  premiumTeaserSection: {
    marginBottom: 20,
  },
  aiPreviewCard: {
    padding: 16,
    backgroundColor: '#FDF6EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D9C8',
    marginBottom: 12,
  },
  aiPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  aiRobot: {
    fontSize: 18,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  aiPreviewText: {
    fontSize: 15,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 14,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#C9A66B',
    borderRadius: 8,
  },
  unlockBtnIcon: {
    fontSize: 16,
  },
  unlockBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  premiumFeaturesPreview: {
    flexDirection: 'row',
    gap: 8,
  },
  featurePreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featurePreviewText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },

  // Premium AI Section
  aiSectionPremium: {
    marginBottom: 20,
  },
  aiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiCardPremium: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#FDF6EE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D9C8',
  },
  aiCardIcon: {
    fontSize: 22,
  },
  aiCardInfo: {},
  aiCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  aiCardDesc: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Flock Section
  flockSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  flockGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  flockCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardInfo: {},
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  flockTips: {
    gap: 6,
  },
  flockTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  flockTipWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  flockTipSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  flockTipText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },

  // Secondary Section
  secondarySection: {
    marginBottom: 20,
  },
  secondaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryCardIcon: {
    fontSize: 20,
  },
  secondaryCardTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  formGroup: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  henPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  henOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  henOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  henOptionText: {
    fontSize: 13,
    color: colors.text,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  customInput: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  addBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.success || '#6B8E5A',
    borderRadius: 8,
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Weather Modal
  weatherDetails: {
    padding: 20,
    alignItems: 'center',
  },
  weatherTempLarge: {
    fontSize: 48,
    fontWeight: '600',
    color: colors.text,
  },
  weatherDesc: {
    fontSize: 16,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  weatherLoc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  weatherTips: {
    marginTop: 20,
    alignSelf: 'stretch',
  },
  weatherTipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  weatherTip: {
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 13,
    color: colors.text,
  },
});
