import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { useThemeStore, ThemeColors } from '../../src/store/themeStore';
import i18n, { formatCurrency } from '../../src/i18n';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

export default function HomeScreen() {
  const router = useRouter();
  const {
    coopSettings,
    todayStats,
    summaryStats,
    insights,
    fetchCoopSettings,
    fetchTodayStats,
    fetchSummaryStats,
    fetchInsights,
    addEggRecord,
    undoLastAction,
    lastAction,
    loading,
  } = useAppStore();
  
  const { isPremium } = usePremiumStore();
  const { colors, isDark } = useThemeStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [eggCount, setEggCount] = useState('');
  const [showUndo, setShowUndo] = useState(false);
  const [lastRegisteredCount, setLastRegisteredCount] = useState(0);
  
  // Data limits state
  const [dataLimits, setDataLimits] = useState<any>(null);
  const [productivityAlerts, setProductivityAlerts] = useState<any>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  
  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  
  useEffect(() => {
    loadData();
    loadDataLimits();
    loadProductivityAlerts();
  }, []);
  
  const loadDataLimits = async () => {
    try {
      const res = await fetch(`${API_URL}/api/account/data-limits`);
      if (res.ok) {
        const data = await res.json();
        setDataLimits(data);
      }
    } catch (error) {
      console.error('Failed to load data limits:', error);
    }
  };
  
  const loadProductivityAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/hens/productivity-alerts`);
      if (res.ok) {
        const data = await res.json();
        setProductivityAlerts(data);
      }
    } catch (error) {
      console.error('Failed to load productivity alerts:', error);
    }
  };
  
  useEffect(() => {
    if (lastAction && lastAction.type === 'egg_record') {
      showUndoSnackbar(lastAction.data.count);
    }
  }, [lastAction]);
  
  const loadData = async () => {
    await Promise.all([
      fetchCoopSettings(),
      fetchTodayStats(),
      fetchSummaryStats(),
      fetchInsights(),
    ]);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const showUndoSnackbar = (count: number) => {
    setLastRegisteredCount(count);
    setShowUndo(true);
    
    Animated.timing(undoOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    // Clear existing timeout
    if (undoTimeout.current) {
      clearTimeout(undoTimeout.current);
    }
    
    // Hide after 5 seconds
    undoTimeout.current = setTimeout(() => {
      hideUndoSnackbar();
    }, 5000);
  };
  
  const hideUndoSnackbar = () => {
    Animated.timing(undoOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowUndo(false);
    });
  };
  
  const handleUndo = async () => {
    const success = await undoLastAction();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    hideUndoSnackbar();
  };
  
  const handleQuickAdd = async (count: number) => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    const today = format(new Date(), 'yyyy-MM-dd');
    await addEggRecord(today, count);
    setShowQuickAdd(false);
    setEggCount('');
  };
  
  const handleCustomAdd = async () => {
    const count = parseInt(eggCount);
    if (isNaN(count) || count < 0) return;
    await handleQuickAdd(count);
  };
  
  const getLocale = () => i18n.locale.startsWith('sv') ? sv : enUS;
  const today = new Date();
  const dateString = format(today, 'EEEE d MMMM yyyy', { locale: getLocale() });
  const t = i18n.t.bind(i18n);
  
  const styles = createStyles(colors, isDark);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{coopSettings?.coop_name || 'Min Hönsgård'}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
          <Text style={styles.date}>{dateString}</Text>
        </View>
        
        {/* Data Limits Banner for Free Users */}
        {dataLimits && !dataLimits.is_premium && !dismissedBanner && (
          (dataLimits.upcoming_deletion?.within_7_days > 0 || dataLimits.data_at_risk?.total > 0) && (
            <View style={[
              styles.dataLimitsBanner,
              dataLimits.upcoming_deletion?.within_7_days > 0 ? styles.urgentBanner : styles.warningBanner
            ]}>
              <Text style={styles.bannerEmoji}>
                {dataLimits.upcoming_deletion?.within_7_days > 0 ? '⚠️' : '📊'}
              </Text>
              <View style={styles.bannerContent}>
                {dataLimits.upcoming_deletion?.within_7_days > 0 ? (
                  <>
                    <Text style={styles.bannerTitle}>Data raderas snart!</Text>
                    <Text style={styles.bannerText}>
                      {dataLimits.upcoming_deletion.within_7_days} poster raderas inom 7 dagar
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.bannerTitle}>Gratis: {dataLimits.data_limit_days} dagars historik</Text>
                    <Text style={styles.bannerText}>{dataLimits.message}</Text>
                  </>
                )}
                <View style={styles.bannerActions}>
                  <TouchableOpacity 
                    style={styles.upgradeBannerBtn}
                    onPress={() => router.push('/paywall')}
                  >
                    <Text style={styles.upgradeBannerText}>🌟 Premium</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.dismissBtn}
                    onPress={() => setDismissedBanner(true)}
                  >
                    <Text style={styles.dismissText}>Avfärda</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        )}
        
        {/* Productivity Alerts */}
        {productivityAlerts && productivityAlerts.total_alerts > 0 && (
          <TouchableOpacity 
            style={styles.productivityAlertBanner}
            onPress={() => router.push('/(tabs)/hens')}
          >
            <Text style={styles.alertBannerEmoji}>🥚</Text>
            <View style={styles.alertBannerContent}>
              <Text style={styles.alertBannerTitle}>Produktivitetsvarning</Text>
              <Text style={styles.alertBannerText}>
                {productivityAlerts.total_alerts} höna{productivityAlerts.total_alerts === 1 ? '' : 'r'} har ej värpt på {productivityAlerts.threshold_days}+ dagar
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#92400e" />
          </TouchableOpacity>
        )}
        
        {/* Quick Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.henCard]}>
            <Ionicons name="heart" size={28} color={colors.error} />
            <Text style={styles.statValue}>{todayStats?.hen_count || 0}</Text>
            <Text style={styles.statLabel}>{t('home.hens')}</Text>
          </View>
          
          <View style={[styles.statCard, styles.eggCard]}>
            <Ionicons name="egg" size={28} color={colors.warning} />
            <Text style={styles.statValue}>{todayStats?.egg_count || 0}</Text>
            <Text style={styles.statLabel}>{t('home.eggsToday')}</Text>
          </View>
        </View>
        
        {/* Quick Add Eggs Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.quickAddButton}
            onPress={() => setShowQuickAdd(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color="#FFF" />
            <Text style={styles.quickAddText}>{t('home.registerEggs')}</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Monthly Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('home.thisMonth')}</Text>
          <View style={styles.monthlyStats}>
            <View style={styles.monthStat}>
              <Text style={styles.monthValue}>{summaryStats?.this_month.eggs || 0}</Text>
              <Text style={styles.monthLabel}>{t('home.eggs')}</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStat}>
              <Text style={[styles.monthValue, { color: colors.error }]}>
                {formatCurrency(summaryStats?.this_month.costs || 0)}
              </Text>
              <Text style={styles.monthLabel}>{t('home.costs')}</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStat}>
              <Text style={[styles.monthValue, { color: colors.success }]}>
                {formatCurrency(summaryStats?.this_month.sales || 0)}
              </Text>
              <Text style={styles.monthLabel}>{t('home.sales')}</Text>
            </View>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>{t('home.net')}:</Text>
            <Text style={[
              styles.netValue,
              { color: (summaryStats?.this_month.net || 0) >= 0 ? colors.success : colors.error }
            ]}>
              {(summaryStats?.this_month.net || 0) >= 0 ? '+' : ''}
              {formatCurrency(summaryStats?.this_month.net || 0)}
            </Text>
          </View>
        </View>
        
        {/* All-time Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('home.total')}</Text>
          <View style={styles.totalRow}>
            <View style={styles.totalItem}>
              <Ionicons name="egg-outline" size={20} color={colors.warning} />
              <Text style={styles.totalValue}>{summaryStats?.total_eggs_all_time || 0}</Text>
              <Text style={styles.totalLabel}>{t('home.totalEggs')}</Text>
            </View>
            <View style={styles.totalItem}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
              <Text style={styles.totalValue}>{formatCurrency(summaryStats?.total_sales_all_time || 0)}</Text>
              <Text style={styles.totalLabel}>{t('home.income')}</Text>
            </View>
            <View style={styles.totalItem}>
              <Ionicons name="trending-down" size={20} color={colors.error} />
              <Text style={styles.totalValue}>{formatCurrency(summaryStats?.total_costs_all_time || 0)}</Text>
              <Text style={styles.totalLabel}>{t('home.expenses')}</Text>
            </View>
          </View>
        </View>
        
        {/* Insights Section */}
        {insights && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 {t('home.insights', { defaultValue: 'Insikter' })}</Text>
            <View style={styles.insightsGrid}>
              <View style={styles.insightItem}>
                <Text style={styles.insightIcon}>💰</Text>
                <View style={styles.insightData}>
                  <Text style={styles.insightValue}>{insights.cost_per_egg} kr</Text>
                  <Text style={styles.insightLabel}>{t('home.costPerEgg', { defaultValue: 'Kostnad/ägg' })}</Text>
                </View>
              </View>
              {insights.top_hen && (
                <View style={[styles.insightItem, styles.insightTopHen]}>
                  <Text style={styles.insightIcon}>🏆</Text>
                  <View style={styles.insightData}>
                    <Text style={styles.insightValue}>{insights.top_hen.name}</Text>
                    <Text style={styles.insightLabel}>{t('home.topHen', { defaultValue: 'Toppvärpare' })} ({insights.top_hen.eggs})</Text>
                  </View>
                </View>
              )}
              <View style={styles.insightItem}>
                <Text style={styles.insightIcon}>📈</Text>
                <View style={styles.insightData}>
                  <Text style={styles.insightValue}>{insights.productivity_index}%</Text>
                  <Text style={styles.insightLabel}>{t('home.productivity', { defaultValue: 'Produktivitet' })}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        
        {/* Premium Insights */}
        {isPremium && insights?.premium && (
          <View style={styles.premiumInsightsCard}>
            <View style={styles.premiumCardHeader}>
              <Text style={styles.cardTitle}>⭐ Premium Insikter</Text>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            </View>
            
            {/* Summary */}
            <View style={styles.premiumSummary}>
              <Text style={styles.premiumSummaryText}>{insights.premium.summary}</Text>
            </View>
            
            {/* Status + Forecast Row */}
            <View style={styles.premiumStatsRow}>
              <View style={[
                styles.statusCard, 
                insights.premium.production_status === 'normal' && styles.statusNormal,
                insights.premium.production_status === 'low' && styles.statusLow,
                insights.premium.production_status === 'high' && styles.statusHigh,
              ]}>
                <Text style={styles.statusText}>{insights.premium.production_text}</Text>
                <Text style={styles.statusDetail}>
                  {insights.premium.deviation_percent > 0 ? '+' : ''}{insights.premium.deviation_percent}%
                </Text>
              </View>
              <View style={styles.forecastCard}>
                <Text style={styles.forecastIcon}>🔮</Text>
                <View style={styles.forecastData}>
                  <Text style={styles.forecastValue}>~{insights.premium.forecast_7_days}</Text>
                  <Text style={styles.forecastLabel}>ägg nästa 7d</Text>
                </View>
              </View>
            </View>
            
            {/* Deviating Hens Alert */}
            {insights.premium.deviating_hens.length > 0 && (
              <View style={styles.alertSection}>
                <Text style={styles.alertTitle}>⚠️ Avvikelser</Text>
                {insights.premium.deviating_hens.map(hen => (
                  <TouchableOpacity 
                    key={hen.id} 
                    style={styles.henAlert}
                    onPress={() => router.push('/hens')}
                  >
                    <Text style={styles.alertIcon}>🐔</Text>
                    <Text style={styles.alertText}>{hen.alert}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Economy Comparison */}
            <View style={styles.economySection}>
              <Text style={styles.economyTitle}>💰 Ekonomi</Text>
              <View style={styles.economyCards}>
                <View style={styles.economyCard}>
                  <Text style={styles.economyLabel}>Denna månad</Text>
                  <Text style={[
                    styles.economyValue,
                    insights.premium.economy.this_month.profit >= 0 ? styles.economyPositive : styles.economyNegative
                  ]}>
                    {insights.premium.economy.this_month.profit >= 0 ? '+' : ''}{insights.premium.economy.this_month.profit} kr
                  </Text>
                </View>
                <View style={[styles.economyCard, styles.economyCardFaded]}>
                  <Text style={styles.economyLabel}>Förra månaden</Text>
                  <Text style={styles.economyValue}>
                    {insights.premium.economy.last_month.profit >= 0 ? '+' : ''}{insights.premium.economy.last_month.profit} kr
                  </Text>
                </View>
              </View>
              <View style={[
                styles.economyChange,
                insights.premium.economy.change >= 0 ? styles.economyChangePositive : styles.economyChangeNegative
              ]}>
                <Text style={styles.economyChangeText}>
                  {insights.premium.economy.change >= 0 ? '📈' : '📉'} {insights.premium.economy.change >= 0 ? '+' : ''}{insights.premium.economy.change} kr ({insights.premium.economy.change_percent}%)
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Premium Banner (if not premium) */}
        {!isPremium && (
          <TouchableOpacity 
            style={styles.premiumBanner}
            onPress={() => router.push('/paywall')}
          >
            <View style={styles.premiumBannerContent}>
              <Ionicons name="star" size={24} color={colors.warning} />
              <View style={styles.premiumBannerText}>
                <Text style={styles.premiumBannerTitle}>{t('common.upgrade')} till Premium</Text>
                <Text style={styles.premiumBannerSubtitle}>Prognos, varningar, ekonomijämförelse</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Undo Snackbar */}
      {showUndo && (
        <Animated.View style={[styles.undoSnackbar, { opacity: undoOpacity }]}>
          <Text style={styles.undoText}>
            {t('home.eggsRegistered', { count: lastRegisteredCount })}
          </Text>
          <TouchableOpacity onPress={handleUndo} style={styles.undoButton}>
            <Text style={styles.undoButtonText}>{t('common.undo')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {/* Quick Add Modal */}
      <Modal
        visible={showQuickAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuickAdd(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('home.registerEggs')}</Text>
            <Text style={styles.modalDate}>{dateString}</Text>
            
            {/* Quick Add Buttons */}
            <Text style={styles.quickAddLabel}>{t('eggs.quickAdd')}</Text>
            <View style={styles.quickButtonsRow}>
              {[1, 2, 3, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.quickButton}
                  onPress={() => handleQuickAdd(num)}
                >
                  <Text style={styles.quickButtonText}>+{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Custom Amount */}
            <Text style={styles.quickAddLabel}>{t('eggs.customAmount')}</Text>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => {
                  const current = parseInt(eggCount) || 0;
                  if (current > 0) setEggCount((current - 1).toString());
                }}
              >
                <Ionicons name="remove" size={28} color="#FFF" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.countInput}
                value={eggCount}
                onChangeText={setEggCount}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => {
                  const current = parseInt(eggCount) || 0;
                  setEggCount((current + 1).toString());
                }}
              >
                <Ionicons name="add" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowQuickAdd(false);
                  setEggCount('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!eggCount || loading) && styles.saveButtonDisabled,
                ]}
                onPress={handleCustomAdd}
                disabled={!eggCount || loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? t('common.loading') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  henCard: {
    borderColor: colors.error + '33',
    borderWidth: 1,
  },
  eggCard: {
    borderColor: colors.warning + '33',
    borderWidth: 1,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  quickAddText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  monthlyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  monthStat: {
    alignItems: 'center',
    flex: 1,
  },
  monthDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  monthValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  monthLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  netLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  netValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
    flex: 1,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warning + '33',
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  premiumBannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  undoSnackbar: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  undoText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  undoButton: {
    marginLeft: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  undoButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  modalDate: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  quickAddLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 24,
    marginBottom: 12,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  countButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    minWidth: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Insights styles
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  insightItem: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
  },
  insightTopHen: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  insightIcon: {
    fontSize: 22,
  },
  insightData: {
    flex: 1,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  insightLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Premium Insights Card
  premiumInsightsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  premiumCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: '#1a1a2e',
    fontSize: 11,
    fontWeight: '600',
  },
  premiumSummary: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  premiumSummaryText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  premiumStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statusCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statusNormal: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  statusLow: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  statusHigh: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  statusDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  forecastCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
  },
  forecastIcon: {
    fontSize: 26,
  },
  forecastData: {
    flex: 1,
  },
  forecastValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  forecastLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  alertSection: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  henAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  alertIcon: {
    fontSize: 18,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  economySection: {
    marginTop: 4,
  },
  economyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  economyCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  economyCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  economyCardFaded: {
    opacity: 0.6,
  },
  economyLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  economyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  economyPositive: {
    color: '#4ade80',
  },
  economyNegative: {
    color: '#ef4444',
  },
  economyChange: {
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  economyChangePositive: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  economyChangeNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  economyChangeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  // Data Limits Banner Styles
  dataLimitsBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  warningBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  urgentBanner: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 10,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  upgradeBannerBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeBannerText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  dismissBtn: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dismissText: {
    color: '#6b7280',
    fontSize: 13,
  },
  // Productivity Alert Banner Styles
  productivityAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
    gap: 12,
  },
  alertBannerEmoji: {
    fontSize: 28,
  },
  alertBannerContent: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  alertBannerText: {
    fontSize: 13,
    color: '#78350f',
  },
});
