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
  Share,
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
import PremiumGateModal from '../../components/PremiumGateModal';

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
  
  // Hens for egg registration
  const [hens, setHens] = useState<any[]>([]);
  const [selectedHenId, setSelectedHenId] = useState<string>('');
  
  // Weather state
  const [weather, setWeather] = useState<any>(null);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  
  // Premium Gate Modal state
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = useState('');
  const [premiumFeatureIcon, setPremiumFeatureIcon] = useState<keyof typeof Ionicons.glyphMap>('star');
  
  // AI Report & Forecast state
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [showAiReportModal, setShowAiReportModal] = useState(false);
  const [eggForecast, setEggForecast] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  
  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  
  useEffect(() => {
    loadData();
    loadDataLimits();
    loadProductivityAlerts();
    loadHens();
    loadWeather();
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
  
  const loadHens = async () => {
    try {
      const res = await fetch(`${API_URL}/api/hens?active_only=true`);
      if (res.ok) {
        const data = await res.json();
        setHens(data);
      }
    } catch (error) {
      console.error('Failed to load hens:', error);
    }
  };
  
  const loadWeather = async () => {
    try {
      const res = await fetch(`${API_URL}/api/weather`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (error) {
      console.error('Failed to load weather:', error);
    }
  };
  
  // Load AI Daily Report
  const loadAiReport = async () => {
    if (!isPremium) return;
    setAiReportLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/daily-report`);
      if (res.ok) {
        const data = await res.json();
        setAiReport(data);
      }
    } catch (error) {
      console.error('Failed to load AI report:', error);
    } finally {
      setAiReportLoading(false);
    }
  };
  
  // Load Egg Forecast
  const loadEggForecast = async () => {
    if (!isPremium) return;
    setForecastLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/egg-forecast`);
      if (res.ok) {
        const data = await res.json();
        setEggForecast(data);
      }
    } catch (error) {
      console.error('Failed to load egg forecast:', error);
    } finally {
      setForecastLoading(false);
    }
  };
  
  // Handle AI Report card click
  const handleAiReportPress = () => {
    if (!isPremium) {
      showPremiumGate(isSv ? 'AI Dagsrapport' : 'AI Daily Report', 'document-text');
      return;
    }
    if (!aiReport) {
      loadAiReport();
    }
    setShowAiReportModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Handle Forecast card click
  const handleForecastPress = () => {
    if (!isPremium) {
      showPremiumGate(isSv ? 'Äggprognos' : 'Egg Forecast', 'trending-up');
      return;
    }
    if (!eggForecast) {
      loadEggForecast();
    }
    setShowForecastModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  
  // Helper to show premium gate modal with feature info
  const showPremiumGate = (featureName: string, icon: keyof typeof Ionicons.glyphMap = 'star') => {
    setPremiumFeatureName(featureName);
    setPremiumFeatureIcon(icon);
    setShowPremiumModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  
  // Share Statistics function
  const handleShareStatistics = async () => {
    try {
      const coopName = coopSettings?.coop_name || 'Min Hönsgård';
      const henCount = todayStats?.hen_count || 0;
      const monthEggs = summaryStats?.this_month.eggs || 0;
      const totalEggs = summaryStats?.total_eggs_all_time || 0;
      const productivity = insights?.productivity_index || 0;
      
      const message = isSv 
        ? `🐔 ${coopName} - Statistik\n\n🥚 ${monthEggs} ägg denna månad\n📊 ${totalEggs} ägg totalt\n💪 ${productivity}% produktivitet\n🐓 ${henCount} hönor\n\nSpåra din hönsgård med Hönsgården-appen! 🌾`
        : `🐔 ${coopName} - Statistics\n\n🥚 ${monthEggs} eggs this month\n📊 ${totalEggs} eggs total\n💪 ${productivity}% productivity\n🐓 ${henCount} hens\n\nTrack your chicken coop with Hönsgården app! 🌾`;
      
      await Share.share({
        message,
        title: isSv ? 'Min hönsgårdsstatistik' : 'My chicken coop statistics',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
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
    await addEggRecord(today, count, undefined, selectedHenId || undefined);
    setShowQuickAdd(false);
    setEggCount('');
    setSelectedHenId('');
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
  const isSv = i18n.locale.startsWith('sv');
  
  // Helper function to get weather icon based on description
  const getWeatherIcon = (description: string): string => {
    const desc = description?.toLowerCase() || '';
    if (desc.includes('sol') || desc.includes('klar') || desc.includes('clear') || desc.includes('sun')) return '☀️';
    if (desc.includes('moln') || desc.includes('cloud') || desc.includes('över')) return '☁️';
    if (desc.includes('regn') || desc.includes('rain') || desc.includes('dugg')) return '🌧️';
    if (desc.includes('snö') || desc.includes('snow')) return '❄️';
    if (desc.includes('dimma') || desc.includes('fog') || desc.includes('dis')) return '🌫️';
    if (desc.includes('åska') || desc.includes('thunder') || desc.includes('storm')) return '⛈️';
    if (desc.includes('delvis') || desc.includes('partly')) return '⛅';
    return '🌤️'; // Default
  };
  
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
        {/* Header with Weather Widget */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleSection}>
              <Text style={styles.title}>{coopSettings?.coop_name || 'Min Hönsgård'}</Text>
              <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
            </View>
            
            {/* Compact Weather Widget */}
            {weather && (
              <TouchableOpacity 
                style={styles.weatherWidget}
                onPress={() => setShowWeatherModal(true)}
                data-testid="weather-widget"
              >
                <Text style={styles.weatherWidgetIcon}>
                  {getWeatherIcon(weather.description)}
                </Text>
                <Text style={styles.weatherWidgetTemp}>{Math.round(weather.temperature)}°</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.date}>{dateString}</Text>
        </View>
        
        {/* Data Limits Banner for Free Users - Hidden Data Card */}
        {dataLimits && !dataLimits.is_premium && !dismissedBanner && dataLimits.hidden_data?.months_of_history > 0 && (
          <TouchableOpacity 
            style={styles.hiddenDataCard}
            onPress={() => showPremiumGate(isSv ? 'Statistikhistorik' : 'Statistics History', 'analytics')}
            activeOpacity={0.9}
          >
            <View style={styles.hiddenDataOverlay}>
              <View style={styles.hiddenDataLock}>
                <Ionicons name="lock-closed" size={24} color="#FFF" />
              </View>
              <View style={styles.hiddenDataContent}>
                <Text style={styles.hiddenDataTitle}>🔒 Gömd statistik</Text>
                <Text style={styles.hiddenDataMessage}>
                  Du har {dataLimits.hidden_data.months_of_history} månaders data sparad
                </Text>
                <Text style={styles.hiddenDataSubtext}>
                  Uppgradera till Premium för att låsa upp all din historik
                </Text>
              </View>
            </View>
            <View style={styles.hiddenDataBlur}>
              <Text style={styles.blurredText}>██ ägg</Text>
              <Text style={styles.blurredText}>██ kr</Text>
            </View>
            <View style={styles.unlockButton}>
              <Ionicons name="star" size={16} color="#FFF" />
              <Text style={styles.unlockButtonText}>Lås upp</Text>
            </View>
          </TouchableOpacity>
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
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>📊 {t('home.insights', { defaultValue: 'Insikter' })}</Text>
              <Text style={styles.scrollHint}>← svep →</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true} 
              style={styles.insightsScrollView}
              contentContainerStyle={styles.insightsScrollContent}
            >
              <View style={styles.insightCard}>
                <Text style={styles.insightIcon}>💰</Text>
                <Text style={styles.insightValueLarge}>{insights.cost_per_egg} kr</Text>
                <Text style={styles.insightLabelFull}>{t('home.costPerEgg', { defaultValue: 'Kostnad per ägg' })}</Text>
              </View>
              {insights.top_hen && (
                <View style={[styles.insightCard, styles.insightTopHenCard]}>
                  <Text style={styles.insightIcon}>🏆</Text>
                  <Text style={styles.insightValueLarge}>{insights.top_hen.name}</Text>
                  <Text style={styles.insightLabelFull}>Toppvärpare ({insights.top_hen.eggs} ägg)</Text>
                </View>
              )}
              <View style={styles.insightCard}>
                <Text style={styles.insightIcon}>📈</Text>
                <Text style={styles.insightValueLarge}>{insights.productivity_index}%</Text>
                <Text style={styles.insightLabelFull}>{t('home.productivity', { defaultValue: 'Produktivitet' })}</Text>
              </View>
            </ScrollView>
          </View>
        )}
        
        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.cardTitle}>⚡ {isSv ? 'Snabbåtgärder' : 'Quick Actions'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/feed')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="nutrition" size={20} color="#FFF" />
              </View>
              <Text style={styles.quickActionLabel}>{isSv ? 'Foder' : 'Feed'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/hatching')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="egg" size={20} color="#FFF" />
              </View>
              <Text style={styles.quickActionLabel}>{isSv ? 'Kläckning' : 'Hatching'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleShareStatistics}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="share-social" size={20} color="#FFF" />
              </View>
              <Text style={styles.quickActionLabel}>{isSv ? 'Dela' : 'Share'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/statistics')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="stats-chart" size={20} color="#FFF" />
              </View>
              <Text style={styles.quickActionLabel}>{isSv ? 'Statistik' : 'Stats'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Weather Card */}
        {weather && (
          <TouchableOpacity 
            style={styles.weatherCard}
            onPress={() => isPremium ? setShowWeatherModal(true) : showPremiumGate(isSv ? 'Vädertips' : 'Weather Tips', 'cloudy')}
          >
            <View style={styles.weatherHeader}>
              <Text style={styles.cardTitle}>🌤️ {isSv ? 'Väder' : 'Weather'}</Text>
              {!isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              )}
            </View>
            <View style={styles.weatherContent}>
              <View style={styles.weatherMain}>
                <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
                <Text style={styles.weatherDesc}>{weather.description}</Text>
              </View>
              <View style={styles.weatherDetails}>
                <Text style={styles.weatherDetail}>💧 {weather.humidity}%</Text>
                <Text style={styles.weatherDetail}>💨 {weather.wind_speed} m/s</Text>
              </View>
            </View>
            {isPremium && weather.tips && weather.tips.length > 0 && (
              <View style={styles.weatherTips}>
                <Text style={styles.weatherTipsTitle}>{isSv ? 'Tips för idag:' : 'Tips for today:'}</Text>
                {weather.tips.slice(0, 2).map((tip: string, idx: number) => (
                  <Text key={idx} style={styles.weatherTip}>💡 {tip}</Text>
                ))}
              </View>
            )}
            {!isPremium && (
              <View style={styles.weatherLocked}>
                <Ionicons name="lock-closed" size={16} color="#f59e0b" />
                <Text style={styles.weatherLockedText}>
                  {isSv ? 'Uppgradera för vädertips' : 'Upgrade for weather tips'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
        
        {/* AI Premium Features Section - Blurred for free users */}
        <View style={styles.aiPremiumSection}>
          <View style={styles.aiSectionHeader}>
            <Text style={styles.aiSectionTitle}>🤖 AI-funktioner</Text>
            {!isPremium && (
              <View style={styles.premiumBadgeSmall}>
                <Ionicons name="lock-closed" size={12} color="#f59e0b" />
                <Text style={styles.premiumBadgeSmallText}>Premium</Text>
              </View>
            )}
          </View>
          
          {/* AI Daily Report Card */}
          <TouchableOpacity 
            style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}
            onPress={handleAiReportPress}
            activeOpacity={0.7}
          >
            <View style={styles.aiCardIcon}>
              <Ionicons name="document-text" size={24} color={isPremium ? colors.primary : '#9ca3af'} />
            </View>
            <View style={styles.aiCardContent}>
              <Text style={styles.aiCardTitle}>{isSv ? 'AI Dagsrapport' : 'AI Daily Report'}</Text>
              {isPremium ? (
                <Text style={styles.aiCardDescription}>
                  {isSv ? 'Tryck för att se din personliga AI-analys' : 'Tap to see your personal AI analysis'}
                </Text>
              ) : (
                <Text style={styles.aiCardDescriptionBlurred}>
                  {isSv ? 'Uppgradera för daglig AI-analys...' : 'Upgrade for daily AI analysis...'}
                </Text>
              )}
            </View>
            {isPremium ? (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            ) : (
              <View style={styles.unlockButton}>
                <Text style={styles.unlockButtonText}>{isSv ? 'Lås upp' : 'Unlock'}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Egg Forecast Card */}
          <TouchableOpacity 
            style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}
            onPress={handleForecastPress}
            activeOpacity={0.7}
          >
            <View style={styles.aiCardIcon}>
              <Ionicons name="trending-up" size={24} color={isPremium ? colors.success : '#9ca3af'} />
            </View>
            <View style={styles.aiCardContent}>
              <Text style={styles.aiCardTitle}>{isSv ? 'Äggprognos 7 dagar' : '7-Day Egg Forecast'}</Text>
              {isPremium ? (
                <Text style={styles.aiCardDescription}>
                  {isSv ? 'Tryck för att se din prognos' : 'Tap to see your forecast'}
                </Text>
              ) : (
                <Text style={styles.aiCardDescriptionBlurred}>
                  {isSv ? 'Se vad du kan förvänta dig...' : 'See what to expect...'}
                </Text>
              )}
            </View>
            {isPremium ? (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            ) : (
              <View style={styles.unlockButton}>
                <Text style={styles.unlockButtonText}>{isSv ? 'Lås upp' : 'Unlock'}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Blurred overlay hint for free users */}
          {!isPremium && (
            <TouchableOpacity 
              style={styles.aiUpgradeHint}
              onPress={() => showPremiumGate(isSv ? 'AI-funktioner' : 'AI Features', 'sparkles')}
            >
              <Ionicons name="sparkles" size={16} color="#f59e0b" />
              <Text style={styles.aiUpgradeHintText}>
                {isSv ? 'Uppgradera för full AI-upplevelse' : 'Upgrade for full AI experience'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Premium Banner (if not premium) - simplified version */}
        {!isPremium && (
          <TouchableOpacity 
            style={styles.premiumBanner}
            onPress={() => showPremiumGate('', 'star')}
          >
            <View style={styles.premiumBannerContent}>
              <Ionicons name="star" size={24} color={colors.warning} />
              <View style={styles.premiumBannerText}>
                <Text style={styles.premiumBannerTitle}>{t('common.upgrade')} till Premium</Text>
                <Text style={styles.premiumBannerSubtitle}>AI-rapporter, prognos, hälsologg & mer</Text>
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
              {[1, 2, 3, 5, 10].map((num) => (
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
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customEggInput}
                value={eggCount}
                onChangeText={setEggCount}
                keyboardType="number-pad"
                placeholder={isSv ? 'Eget antal...' : 'Custom amount...'}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={[styles.customAddButton, !eggCount && styles.customAddButtonDisabled]}
                onPress={handleCustomAdd}
                disabled={!eggCount || loading}
              >
                <Text style={styles.customAddButtonText}>{isSv ? 'Lägg till' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Per-Hen Selection (Optional) */}
            {hens.length > 0 && (
              <>
                <Text style={styles.quickAddLabel}>Vilken höna la äggen? (valfritt)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.henSelectScroll}>
                  <TouchableOpacity
                    style={[styles.henSelectBtn, !selectedHenId && styles.henSelectBtnActive]}
                    onPress={() => setSelectedHenId('')}
                  >
                    <Text style={styles.henSelectEmoji}>🥚</Text>
                    <Text style={[styles.henSelectText, !selectedHenId && styles.henSelectTextActive]}>Okänd</Text>
                  </TouchableOpacity>
                  {hens.map((hen) => (
                    <TouchableOpacity
                      key={hen.id}
                      style={[styles.henSelectBtn, selectedHenId === hen.id && styles.henSelectBtnActive]}
                      onPress={() => setSelectedHenId(hen.id)}
                    >
                      <Text style={styles.henSelectEmoji}>🐔</Text>
                      <Text style={[styles.henSelectText, selectedHenId === hen.id && styles.henSelectTextActive]}>
                        {hen.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowQuickAdd(false);
                  setEggCount('');
                  setSelectedHenId('');
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
      
      {/* AI Daily Report Modal */}
      <Modal
        visible={showAiReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAiReportModal(false)}
      >
        <SafeAreaView style={[styles.aiModalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.aiModalHeader}>
            <TouchableOpacity onPress={() => setShowAiReportModal(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.aiModalTitle, { color: colors.text }]}>
              {isSv ? 'AI Dagsrapport' : 'AI Daily Report'}
            </Text>
            <TouchableOpacity onPress={loadAiReport}>
              <Ionicons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.aiModalContent} contentContainerStyle={{ padding: 16 }}>
            {aiReportLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingEmoji}>🤖</Text>
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {isSv ? 'Genererar din AI-rapport...' : 'Generating your AI report...'}
                </Text>
              </View>
            ) : aiReport ? (
              <View>
                <View style={[styles.reportCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.reportDate, { color: colors.textMuted }]}>
                    {format(new Date(), 'd MMMM yyyy', { locale: isSv ? sv : enUS })}
                  </Text>
                  <Text style={[styles.reportText, { color: colors.text }]}>
                    {aiReport.report || aiReport.message || (isSv ? 'Ingen rapport tillgänglig' : 'No report available')}
                  </Text>
                </View>
                
                {aiReport.tips && aiReport.tips.length > 0 && (
                  <View style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.tipsTitle, { color: colors.text }]}>
                      💡 {isSv ? 'Tips för idag' : 'Tips for today'}
                    </Text>
                    {aiReport.tips.map((tip: string, index: number) => (
                      <View key={index} style={styles.tipRow}>
                        <Text style={styles.tipBullet}>•</Text>
                        <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity style={[styles.loadReportBtn, { backgroundColor: colors.primary }]} onPress={loadAiReport}>
                <Text style={styles.loadReportBtnText}>
                  {isSv ? 'Ladda rapport' : 'Load Report'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Egg Forecast Modal */}
      <Modal
        visible={showForecastModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForecastModal(false)}
      >
        <SafeAreaView style={[styles.aiModalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.aiModalHeader}>
            <TouchableOpacity onPress={() => setShowForecastModal(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.aiModalTitle, { color: colors.text }]}>
              {isSv ? 'Äggprognos' : 'Egg Forecast'}
            </Text>
            <TouchableOpacity onPress={loadEggForecast}>
              <Ionicons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.aiModalContent} contentContainerStyle={{ padding: 16 }}>
            {forecastLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingEmoji}>📈</Text>
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {isSv ? 'Beräknar prognos...' : 'Calculating forecast...'}
                </Text>
              </View>
            ) : eggForecast ? (
              <View>
                {/* 7-day forecast summary */}
                <View style={[styles.forecastSummaryCard, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={styles.forecastSummaryIcon}>🥚</Text>
                  <Text style={[styles.forecastSummaryValue, { color: colors.primary }]}>
                    ~{eggForecast.forecast_7_days || eggForecast.total || 0}
                  </Text>
                  <Text style={[styles.forecastSummaryLabel, { color: colors.text }]}>
                    {isSv ? 'ägg förväntade kommande 7 dagar' : 'eggs expected in the next 7 days'}
                  </Text>
                </View>
                
                {/* Daily breakdown */}
                {eggForecast.daily_forecast && (
                  <View style={[styles.dailyForecastCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.dailyForecastTitle, { color: colors.text }]}>
                      {isSv ? 'Daglig prognos' : 'Daily Forecast'}
                    </Text>
                    {eggForecast.daily_forecast.map((day: any, index: number) => (
                      <View key={index} style={styles.dailyForecastRow}>
                        <Text style={[styles.dailyForecastDay, { color: colors.textSecondary }]}>
                          {day.day || format(new Date(Date.now() + index * 86400000), 'EEE', { locale: isSv ? sv : enUS })}
                        </Text>
                        <View style={styles.dailyForecastBar}>
                          <View style={[styles.dailyForecastBarFill, { 
                            width: `${Math.min((day.eggs / (eggForecast.max_daily || 10)) * 100, 100)}%`,
                            backgroundColor: colors.primary 
                          }]} />
                        </View>
                        <Text style={[styles.dailyForecastValue, { color: colors.text }]}>
                          {day.eggs}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Confidence note */}
                <View style={[styles.confidenceNote, { backgroundColor: colors.surface }]}>
                  <Ionicons name="information-circle" size={18} color={colors.textMuted} />
                  <Text style={[styles.confidenceNoteText, { color: colors.textMuted }]}>
                    {isSv 
                      ? 'Prognosen baseras på de senaste 14 dagarnas data och kan variera beroende på väder och andra faktorer.'
                      : 'Forecast is based on the last 14 days of data and may vary depending on weather and other factors.'}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[styles.loadReportBtn, { backgroundColor: colors.primary }]} onPress={loadEggForecast}>
                <Text style={styles.loadReportBtnText}>
                  {isSv ? 'Ladda prognos' : 'Load Forecast'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Premium Gate Modal */}
      <PremiumGateModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        featureName={premiumFeatureName}
        featureIcon={premiumFeatureIcon}
      />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleSection: {
    flex: 1,
  },
  // Weather widget in header
  weatherWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weatherWidgetIcon: {
    fontSize: 20,
  },
  weatherWidgetTemp: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scrollHint: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
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
  
  // AI Premium Features Section
  aiPremiumSection: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.3)',
  },
  aiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  premiumBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  aiCardBlurred: {
    opacity: 0.6,
  },
  aiCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiCardContent: {
    flex: 1,
  },
  aiCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  aiCardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  aiCardDescriptionBlurred: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  unlockButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unlockButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  aiUpgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  aiUpgradeHintText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '500',
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
  insightsScrollView: {
    marginTop: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  insightsScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  insightCard: {
    width: 140,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  insightTopHenCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  insightIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  insightValueLarge: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  insightLabelFull: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Legacy insight styles (keeping for compatibility)
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
  // Quick Actions Section
  quickActionsSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  quickActionsScroll: {
    marginTop: 12,
    marginHorizontal: -8,
  },
  quickActionCard: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Weather Card
  weatherCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherMain: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  weatherDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  weatherDetails: {
    alignItems: 'flex-end',
  },
  weatherDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  weatherTips: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  weatherTipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  weatherTip: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  weatherLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  weatherLockedText: {
    fontSize: 13,
    color: '#f59e0b',
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
  // Hidden Data Card (Premium upsell)
  hiddenDataCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  hiddenDataOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 2,
  },
  hiddenDataLock: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenDataContent: {
    flex: 1,
  },
  hiddenDataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  hiddenDataMessage: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 2,
  },
  hiddenDataSubtext: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.7,
  },
  hiddenDataBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: colors.surfaceSecondary,
    opacity: 0.5,
  },
  blurredText: {
    fontSize: 14,
    color: colors.textMuted,
    letterSpacing: 2,
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
  // Custom egg input styles
  customInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  customEggInput: {
    flex: 1,
    height: 56,
    minWidth: 140,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  customAddButton: {
    height: 50,
    paddingHorizontal: 24,
    backgroundColor: colors.success,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddButtonDisabled: {
    opacity: 0.5,
  },
  customAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Hen Select styles
  henSelectScroll: {
    marginBottom: 16,
  },
  henSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  henSelectBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  henSelectEmoji: {
    fontSize: 18,
  },
  henSelectText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  henSelectTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  // AI Report Modal styles
  aiModalContainer: {
    flex: 1,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  aiModalContent: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  reportCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  reportDate: {
    fontSize: 13,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  reportText: {
    fontSize: 15,
    lineHeight: 24,
  },
  tipsCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  loadReportBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  loadReportBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Forecast Modal styles
  forecastSummaryCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  forecastSummaryIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  forecastSummaryValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  forecastSummaryLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  dailyForecastCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  dailyForecastTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  dailyForecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyForecastDay: {
    width: 40,
    fontSize: 13,
  },
  dailyForecastBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  dailyForecastBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  dailyForecastValue: {
    width: 24,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  confidenceNote: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  confidenceNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
