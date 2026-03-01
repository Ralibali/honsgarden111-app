import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Share,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore, apiFetch } from '../../src/store/appStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { useThemeStore, ThemeColors } from '../../src/store/themeStore';
import { useGoalsStore } from '../../src/store/goalsStore';
import { useAnalyticsStore } from '../../src/store/analyticsStore';
import i18n, { formatCurrency } from '../../src/i18n';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import PremiumGateModal from '../../components/PremiumGateModal';
import { TrialBadge } from '../../src/components/TrialBadge';
import DailySummaryPopup from '../../src/components/DailySummaryPopup';
import { scheduleDailyChoresReminder } from '../../src/services/notifications';
import { useAuthStore, getAuthHeaders } from '../../src/store/authStore';
import config from '../../src/config/env';
import CompactDashboard from '../../src/components/CompactDashboard';

// Key for tracking if daily summary was shown today
const DAILY_SUMMARY_SHOWN_KEY = '@honsgarden_daily_summary_shown';

// API URL from centralized config
const API_URL = config.apiBaseUrl;

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
  
  const { isPremium, isTrial, daysRemaining, trialExpiryWarning, checkPremiumStatus } = usePremiumStore();
  const { colors, isDark } = useThemeStore();
  const { user } = useAuthStore();
  const { goals, progress, loadGoals, calculateProgress } = useGoalsStore();
  const { data: analyticsData, loadAnalytics, trackEggRegistration, getConversionTrigger } = useAnalyticsStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [eggCount, setEggCount] = useState('');
  const [showUndo, setShowUndo] = useState(false);
  const [lastRegisteredCount, setLastRegisteredCount] = useState(0);
  
  // Trial expiry warning modal
  const [showTrialWarning, setShowTrialWarning] = useState(false);
  const [trialWarningDismissed, setTrialWarningDismissed] = useState(false);
  
  // Daily chores state
  const [dailyChores, setDailyChores] = useState<any[]>([]);
  const [showChoresModal, setShowChoresModal] = useState(false);
  const [hasSeenChoresFirstTime, setHasSeenChoresFirstTime] = useState(false);
  const [choresAutoPopupEnabled, setChoresAutoPopupEnabled] = useState(true);
  
  // Community preview state
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  
  // Streak & gamification state
  const [streak, setStreak] = useState(0);
  const [eggPopAnim] = useState(new Animated.Value(1));
  const [showEggPop, setShowEggPop] = useState(false);
  
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
  
  // AI Daily Tip state
  const [dailyTip, setDailyTip] = useState<string>('');
  const [dailyTipLoading, setDailyTipLoading] = useState(false);
  const [showDailyTipModal, setShowDailyTipModal] = useState(false);
  
  // Fråga Agda (AI Advisor) state
  const [showAgdaModal, setShowAgdaModal] = useState(false);
  const [agdaQuestion, setAgdaQuestion] = useState('');
  const [agdaAnswer, setAgdaAnswer] = useState('');
  const [agdaLoading, setAgdaLoading] = useState(false);
  
  // Daily Summary Popup state
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(true);
  
  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Always check premium status when home screen mounts
    checkPremiumStatus().catch(err => console.warn('Premium check failed:', err));
    
    loadData();
    loadDataLimits();
    loadProductivityAlerts();
    loadHens();
    loadWeather();
    loadDailyChores();
    loadCommunityPosts();
    loadEggForecast(); // Load forecast on mount
    checkAndShowDailySummary(); // Check if we should show daily summary
  }, []);
  
  // Refresh data when screen gets focus (e.g., after login or returning to tab)
  useFocusEffect(
    useCallback(() => {
      loadCommunityPosts();
      loadEggForecast();
    }, [])
  );
  
  // Show trial expiry warning when needed
  useEffect(() => {
    if (trialExpiryWarning && !trialWarningDismissed) {
      setShowTrialWarning(true);
    }
  }, [trialExpiryWarning, trialWarningDismissed]);
  
  const loadCommunityPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/community/posts?limit=3`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCommunityPosts(data.posts?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Failed to load community posts:', error);
    }
  };
  
  // Check if daily summary should be shown
  const checkAndShowDailySummary = async () => {
    try {
      // Check if it was already shown today
      const today = new Date().toISOString().split('T')[0];
      const lastShown = await AsyncStorage.getItem(DAILY_SUMMARY_SHOWN_KEY);
      
      if (lastShown === today) {
        // Already shown today, don't show again
        return;
      }
      
      // Check user preference
      const response = await apiFetch(`${API_URL}/api/feature-preferences`);
      if (response.ok) {
        const prefs = await response.json();
        if (prefs.show_daily_summary_popup === false) {
          setDailySummaryEnabled(false);
          return;
        }
      }
      
      // Show the popup after a short delay for better UX
      setTimeout(() => {
        setShowDailySummary(true);
        // Mark as shown today
        AsyncStorage.setItem(DAILY_SUMMARY_SHOWN_KEY, today);
      }, 800);
      
    } catch (error) {
      if (__DEV__) console.error('Failed to check daily summary:', error);
    }
  };
  
  const closeDailySummary = () => {
    setShowDailySummary(false);
  };
  
  const loadDailyChores = async () => {
    try {
      const res = await fetch(`${API_URL}/api/daily-chores`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDailyChores(data.chores || []);
        
        // Check if we should auto-show the chores modal
        const hasSeenBefore = await AsyncStorage.getItem('chores_seen_first_time');
        const autoPopupDisabled = await AsyncStorage.getItem('chores_auto_popup_disabled');
        
        setHasSeenChoresFirstTime(hasSeenBefore === 'true');
        setChoresAutoPopupEnabled(autoPopupDisabled !== 'true');
        
        // Schedule daily push notification (7:30 AM) - always enabled
        if (Platform.OS !== 'web') {
          try {
            await scheduleDailyChoresReminder(7, 30, true);
          } catch (notifError) {
            if (__DEV__) console.log('Could not schedule chores notification:', notifError);
          }
        }
        
        // Mark as seen first time (for tracking, but no auto-popup)
        if (!hasSeenBefore) {
          AsyncStorage.setItem('chores_seen_first_time', 'true');
          setHasSeenChoresFirstTime(true);
        }
      }
    } catch (error) {
      console.error('Failed to load daily chores:', error);
    }
  };
  
  const toggleChoreComplete = async (choreId: string, completed: boolean) => {
    try {
      if (completed) {
        await fetch(`${API_URL}/api/daily-chores/${choreId}/complete`, { 
          method: 'DELETE',
          headers: getAuthHeaders(),
          credentials: 'include' 
        });
      } else {
        await fetch(`${API_URL}/api/daily-chores/${choreId}/complete`, { 
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include'
        });
      }
      await loadDailyChores();
    } catch (error) {
      console.error('Failed to toggle chore:', error);
    }
  };
  
  const loadDataLimits = async () => {
    try {
      const res = await fetch(`${API_URL}/api/account/data-limits`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
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
      const res = await fetch(`${API_URL}/api/hens/productivity-alerts`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
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
      const res = await fetch(`${API_URL}/api/hens?active_only=true`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
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
      const res = await fetch(`${API_URL}/api/weather`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
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
    setAiReportLoading(true);
    setShowAiReportModal(true);
    try {
      const res = await apiFetch(`${API_URL}/api/ai/daily-report`);
      const data = await res.json();
      
      // Check if user is not premium
      if (data.is_premium === false) {
        setShowAiReportModal(false);
        showPremiumGate(isSv ? 'AI Dagsrapport' : 'AI Daily Report', 'analytics');
        return;
      }
      
      if (res.ok && data.report) {
        setAiReport(data);
      } else {
        if (__DEV__) console.error('AI Report issue:', res.status, data);
        // Set error state so UI can show fallback
        setAiReport({ error: true, message: isSv ? 'Rapporten kunde inte genereras just nu.' : 'The report could not be generated right now.' });
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to load AI report:', error);
      setAiReport({ error: true, message: isSv ? 'Ett tillfälligt fel uppstod.' : 'A temporary error occurred.' });
    } finally {
      setAiReportLoading(false);
    }
  };
  
  // Load Egg Forecast
  const loadEggForecast = async () => {
    if (__DEV__) console.log('[loadEggForecast] Starting...');
    setForecastLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/api/ai/egg-forecast`);
      const data = await res.json();
      
      if (__DEV__) console.log('[loadEggForecast] Response:', res.status);
      
      // Check if user is not premium
      if (data.is_premium === false) {
        showPremiumGate(isSv ? 'Äggprognos' : 'Egg Forecast', 'trending-up');
        return;
      }
      
      if (res.ok && data.forecast) {
        setEggForecast({
          ...data.forecast,
          forecast_7_days: data.forecast.total_predicted,
          daily_forecast: data.forecast.daily_predictions
        });
      } else {
        if (__DEV__) console.error('[loadEggForecast] Issue:', res.status, data);
      }
    } catch (error) {
      if (__DEV__) console.error('[loadEggForecast] Error:', error);
    } finally {
      setForecastLoading(false);
    }
  };
  
  // Handle AI Report card click
  const handleAiReportPress = () => {
    // Don't block on frontend premium check - loadAiReport will handle it
    if (!aiReport) {
      loadAiReport();
    } else {
      setShowAiReportModal(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Handle Forecast card click
  const handleForecastPress = () => {
    // Don't block on frontend premium check - loadEggForecast will handle it
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
  
  // Load Daily Tip
  const loadDailyTip = async () => {
    setDailyTipLoading(true);
    setShowDailyTipModal(true);
    
    try {
      const response = await apiFetch(`${API_URL}/api/ai/daily-tip`);
      const data = await response.json();
      
      // Check if user is not premium (backend returns is_premium field)
      if (data.is_premium === false) {
        setShowDailyTipModal(false);
        showPremiumGate(isSv ? 'Dagens tips' : 'Daily Tip', 'bulb');
        return;
      }
      
      if (response.ok && data.tip) {
        setDailyTip(data.tip);
      } else {
        if (__DEV__) console.error('Daily tip response issue:', response.status, data);
        setDailyTip(isSv ? 'Kunde inte ladda dagens tips. Försök igen senare.' : 'Could not load daily tip. Please try again later.');
      }
    } catch (error) {
      if (__DEV__) console.error('Daily tip error:', error);
      setDailyTip(isSv ? 'Ett tillfälligt fel uppstod. Kontrollera din internetanslutning.' : 'A temporary error occurred. Check your internet connection.');
    } finally {
      setDailyTipLoading(false);
    }
  };
  
  // Ask Agda (AI Advisor)
  // State for free user teaser
  const [showFreeAgdaTeaser, setShowFreeAgdaTeaser] = useState(false);
  const [freeTeaserTip, setFreeTeaserTip] = useState('');
  const [freeTeaserLoading, setFreeTeaserLoading] = useState(false);
  
  const askAgda = async () => {
    if (!agdaQuestion.trim()) return;
    
    setAgdaLoading(true);
    
    try {
      const response = await apiFetch(`${API_URL}/api/ai/advisor`, {
        method: 'POST',
        body: JSON.stringify({ question: agdaQuestion })
      });
      
      const data = await response.json();
      
      // Check if user is not premium
      if (data.is_premium === false) {
        setShowAgdaModal(false);
        showPremiumGate(isSv ? 'Fråga Agda' : 'Ask Agda', 'chatbubble-ellipses');
        return;
      }
      
      if (response.ok && data.answer) {
        setAgdaAnswer(data.answer);
      } else {
        if (__DEV__) console.error('Agda response issue:', response.status, data);
        setAgdaAnswer(isSv ? 'Agda kunde inte svara just nu. Försök igen om en stund.' : 'Agda could not respond right now. Please try again shortly.');
      }
    } catch (error) {
      if (__DEV__) console.error('Agda error:', error);
      setAgdaAnswer(isSv ? 'Ett tillfälligt fel uppstod. Kontrollera din internetanslutning.' : 'A temporary error occurred. Check your internet connection.');
    } finally {
      setAgdaLoading(false);
    }
  };
  
  // Get a free teaser tip for free users
  const getFreeTeaserTip = async () => {
    setFreeTeaserLoading(true);
    try {
      // Use a simple tip endpoint that gives a short teaser
      const response = await fetch(`${API_URL}/api/ai/free-tip`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setFreeTeaserTip(data.tip || (isSv 
          ? 'Visste du att höns behöver 14-16 timmar ljus per dygn för optimal värpning? Uppgradera för fler tips!'
          : 'Did you know hens need 14-16 hours of light per day for optimal laying? Upgrade for more tips!'));
      } else {
        setFreeTeaserTip(isSv 
          ? 'Visste du att höns behöver 14-16 timmar ljus per dygn för optimal värpning? Uppgradera för fler tips!'
          : 'Did you know hens need 14-16 hours of light per day for optimal laying? Upgrade for more tips!');
      }
    } catch (error) {
      setFreeTeaserTip(isSv 
        ? 'Visste du att höns behöver 14-16 timmar ljus per dygn för optimal värpning? Uppgradera för fler tips!'
        : 'Did you know hens need 14-16 hours of light per day for optimal laying? Upgrade for more tips!');
    }
    setFreeTeaserLoading(false);
  };
  
  const openAgdaModal = () => {
    // Don't block on frontend premium check - backend will handle authorization
    // This ensures the modal opens properly
    setAgdaQuestion('');
    setAgdaAnswer('');
    setShowAgdaModal(true);
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
    
    // Pop animation on egg card
    Animated.sequence([
      Animated.timing(eggPopAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(eggPopAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    const today = format(new Date(), 'yyyy-MM-dd');
    await addEggRecord(today, count, undefined, selectedHenId || undefined);
    
    // Show undo option
    setLastRegisteredCount(count);
    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 5000);
    
    setShowQuickAdd(false);
    setEggCount('');
    setSelectedHenId('');
    
    // Refresh data
    await Promise.all([fetchTodayStats(), fetchSummaryStats()]);
  };
  
  // One-tap quick add (directly from card)
  const handleOneTapAdd = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Pop animation
    Animated.sequence([
      Animated.timing(eggPopAnim, {
        toValue: 1.4,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(eggPopAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    const today = format(new Date(), 'yyyy-MM-dd');
    await addEggRecord(today, 1, undefined, undefined);
    
    setLastRegisteredCount(1);
    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 5000);
    
    // Refresh data
    await Promise.all([fetchTodayStats(), fetchSummaryStats()]);
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
        {/* ========== SECTION 1: HEADER (Compact) ========== */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleSection}>
              <Text style={styles.title}>{coopSettings?.coop_name || 'Min Hönsgård'}</Text>
              <Text style={styles.date}>{dateString}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Avatar - Settings Button */}
              <TouchableOpacity 
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => router.push('/(tabs)/settings')}
                data-testid="avatar-settings-btn"
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* ========== TRIAL BADGE (Only during trial) ========== */}
        {isTrial && (
          <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
            <TrialBadge showUpgradeOnExpiring={true} />
          </View>
        )}
        
        {/* ========== PROGRESSION DISPLAY ========== */}
        {(summaryStats?.total_eggs_all_time > 0 || summaryStats?.streak > 0) && (
          <View style={{
            flexDirection: 'row',
            marginHorizontal: 16,
            marginBottom: 12,
            gap: 10,
          }}>
            {/* Total eggs registered */}
            {summaryStats?.total_eggs_all_time > 0 && (
              <View style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
                <Text style={{ fontSize: 20 }}>🥚</Text>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {summaryStats.total_eggs_all_time}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {isSv ? 'totalt' : 'total'}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Streak */}
            {summaryStats?.streak > 0 && (
              <View style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: summaryStats.streak >= 7 ? 2 : 0,
                borderColor: summaryStats.streak >= 7 ? colors.warning : 'transparent',
              }}>
                <Text style={{ fontSize: 20 }}>🔥</Text>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {summaryStats.streak} {isSv ? 'dagar' : 'days'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {isSv ? 'i rad' : 'streak'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Progression milestone messages */}
        {summaryStats?.total_eggs_all_time >= 10 && summaryStats?.total_eggs_all_time < 30 && (
          <View style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: colors.primary + '10',
            borderRadius: 12,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}>
            <Text style={{ fontSize: 13, color: colors.text }}>
              🌱 {isSv 
                ? 'Nu börjar vi se mönster i din produktion!' 
                : 'We\'re starting to see patterns in your production!'}
            </Text>
          </View>
        )}
        
        {summaryStats?.total_eggs_all_time >= 30 && !isPremium && (
          <TouchableOpacity 
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              backgroundColor: colors.warning + '15',
              borderRadius: 12,
              padding: 12,
              borderLeftWidth: 3,
              borderLeftColor: colors.warning,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => router.push('/paywall')}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                📊 {isSv 
                  ? `${summaryStats.total_eggs_all_time} ägg registrerade!` 
                  : `${summaryStats.total_eggs_all_time} eggs registered!`}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {isSv 
                  ? 'Du har nog data för trend-analys och prognoser.' 
                  : 'You have enough data for trend analysis and forecasts.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.warning} />
          </TouchableOpacity>
        )}
        
        {/* ========== SECTION 2: THREE STATS CARDS (Ägg, Höns, Produktivitet) ========== */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginBottom: 12,
          gap: 10,
        }}>
          {/* Ägg idag - Gul/Guld ram */}
          <Pressable 
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#9a8c4d',
              minHeight: 120,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              opacity: pressed ? 0.9 : 1,
            })}
            onPress={handleOneTapAdd}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setShowQuickAdd(true);
            }}
            delayLongPress={400}
          >
            {/* Tap hint */}
            <View style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: colors.success + '30',
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}>
              <Text style={{ fontSize: 9, color: colors.success, fontWeight: '600' }}>TAP +1</Text>
            </View>
            <Text style={{ fontSize: 32 }}>🥚</Text>
            <Animated.Text style={{ 
              fontSize: 32, 
              fontWeight: '700', 
              color: colors.text,
              marginTop: 4,
              transform: [{ scale: eggPopAnim }] 
            }}>
              {todayStats?.egg_count || 0}
            </Animated.Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {isSv ? 'Ägg idag' : 'Eggs today'}
            </Text>
          </Pressable>

          {/* Höns - Röd/Brun ram */}
          <TouchableOpacity 
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#6b3a3a',
              minHeight: 120,
            }}
            onPress={() => router.push('/(tabs)/hens')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 32 }}>🐔</Text>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 4 }}>
              {todayStats?.hen_count || 0}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {isSv ? 'Höns' : 'Hens'}
            </Text>
          </TouchableOpacity>

          {/* Produktivitet - Grön ram */}
          <TouchableOpacity 
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#3d5a3d',
              minHeight: 120,
            }}
            onPress={() => router.push('/(tabs)/statistics')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 32 }}>📈</Text>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 4 }}>
              {todayStats?.hen_count > 0 
                ? Math.round((todayStats?.egg_count || 0) / todayStats.hen_count * 100) 
                : 0}%
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2, textAlign: 'center' }}>
              {isSv ? 'Produktivitet' : 'Productivity'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Undo Toast */}
        {showUndo && (
          <Animated.View style={[styles.undoToast, { marginHorizontal: 16, marginBottom: 12 }]}>
            <Text style={styles.undoText}>+{lastRegisteredCount} {isSv ? 'ägg registrerat' : 'eggs registered'}</Text>
            <TouchableOpacity 
              style={styles.undoButton}
              onPress={async () => {
                await undoLastAction();
                setShowUndo(false);
                await Promise.all([fetchTodayStats(), fetchSummaryStats()]);
              }}
            >
              <Ionicons name="arrow-undo" size={16} color="#fff" />
              <Text style={styles.undoButtonText}>{isSv ? 'Ångra' : 'Undo'}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        
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
        
        {/* ========== SECTION 3: PRODUCTIVITY ALERTS ========== */}
        {productivityAlerts && productivityAlerts.total_alerts > 0 && (
          <TouchableOpacity 
            style={[styles.productivityAlertBanner, { marginHorizontal: 16, marginBottom: 16 }]}
            onPress={() => router.push('/(tabs)/hens')}
          >
            <Text style={styles.alertBannerEmoji}>⚠️</Text>
            <View style={styles.alertBannerContent}>
              <Text style={styles.alertBannerTitle}>{isSv ? 'Produktivitetsvarning' : 'Productivity Alert'}</Text>
              <Text style={styles.alertBannerText}>
                {productivityAlerts.total_alerts} {isSv ? 'höna har ej värpt på' : 'hen not laying for'} {productivityAlerts.threshold_days}+ {isSv ? 'dagar' : 'days'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#92400e" />
          </TouchableOpacity>
        )}
        
        {/* ========== SECTION 5: DAILY CHORES ========== */}
        {dailyChores.length > 0 && (
          <TouchableOpacity
            style={[styles.dailyChoresCard, { marginHorizontal: 16, marginBottom: 16 }]}
            onPress={() => setShowChoresModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dailyChoresLeft}>
              <View style={[styles.dailyChoresIcon, { backgroundColor: '#f59e0b22' }]}>
                <Ionicons name="checkbox-outline" size={24} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.dailyChoresTitle}>
                  {isSv ? 'Dagens sysslor' : "Today's Chores"}
                </Text>
                <Text style={styles.dailyChoresSubtitle}>
                  {dailyChores.filter(c => c.completed).length}/{dailyChores.length} {isSv ? 'klara' : 'done'}
                </Text>
              </View>
            </View>
            <View style={styles.dailyChoresProgress}>
              <View 
                style={[
                  styles.dailyChoresProgressFill, 
                  { 
                    width: `${(dailyChores.filter(c => c.completed).length / dailyChores.length) * 100}%`,
                    backgroundColor: dailyChores.every(c => c.completed) ? colors.success : '#f59e0b'
                  }
                ]} 
              />
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        
        {/* ========== SECTION 6: QUICK ACTIONS (One place only) ========== */}
        <View style={[styles.quickActionsSection, { marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>⚡ {isSv ? 'Snabbåtgärder' : 'Quick Actions'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                minWidth: '30%',
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
              }}
              onPress={() => router.push('/feed')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="nutrition" size={18} color="#FFF" />
              </View>
              <Text style={{ fontSize: 12, color: colors.text, marginTop: 6 }}>{isSv ? 'Foder' : 'Feed'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                minWidth: '30%',
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
              }}
              onPress={() => router.push('/hatching')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="egg" size={18} color="#FFF" />
              </View>
              <Text style={{ fontSize: 12, color: colors.text, marginTop: 6 }}>{isSv ? 'Kläckning' : 'Hatching'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                minWidth: '30%',
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
              }}
              onPress={() => router.push('/(tabs)/community')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10b981' }]}>
                <Ionicons name="chatbubbles" size={18} color="#FFF" />
              </View>
              <Text style={{ fontSize: 12, color: colors.text, marginTop: 6 }}>Community</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                minWidth: '30%',
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
              }}
              onPress={handleShareStatistics}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="share-social" size={18} color="#FFF" />
              </View>
              <Text style={{ fontSize: 12, color: colors.text, marginTop: 6 }}>{isSv ? 'Dela' : 'Share'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* ========== SECTION 7: MONTHLY SUMMARY ========== */}
        <View style={[styles.sectionCard, { marginHorizontal: 16, marginBottom: 16 }]}>
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
          <View style={[styles.netRow, { 
            backgroundColor: (summaryStats?.this_month.net || 0) >= 0 ? colors.success + '15' : colors.error + '15',
            borderRadius: 8,
            padding: 8,
            marginTop: 8,
          }]}>
            <Text style={styles.netLabel}>{t('home.net')}:</Text>
            <Text style={[
              styles.netValue,
              { color: (summaryStats?.this_month.net || 0) >= 0 ? colors.success : colors.error, fontWeight: '700' }
            ]}>
              {(summaryStats?.this_month.net || 0) >= 0 ? '+' : ''}
              {formatCurrency(summaryStats?.this_month.net || 0)}
            </Text>
          </View>
        </View>
        
        {/* ========== SECTION 8: WEEK'S BEST HEN ========== */}
        {summaryStats?.best_hen_week && (
          <TouchableOpacity 
            style={[styles.bestHenCard, { marginHorizontal: 16, marginBottom: 16 }]}
            onPress={() => router.push('/(tabs)/hens')}
            activeOpacity={0.8}
          >
            <View style={styles.bestHenIcon}>
              <Text style={{ fontSize: 32 }}>🏆</Text>
            </View>
            <View style={styles.bestHenInfo}>
              <Text style={styles.bestHenTitle}>{isSv ? 'Veckans bästa höna' : "Week's Best Hen"}</Text>
              <Text style={styles.bestHenName}>{summaryStats.best_hen_week.name}</Text>
              <Text style={styles.bestHenEggs}>
                {summaryStats.best_hen_week.eggs_this_week} {isSv ? 'ägg denna vecka' : 'eggs this week'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        
        {/* ========== SECTION 9: WEATHER (Secondary) ========== */}
        {weather && (
          <TouchableOpacity 
            style={[styles.weatherCard, { marginHorizontal: 16, marginBottom: 16 }]}
            onPress={() => setShowWeatherModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginRight: 12 }}>
                  {getWeatherIcon(weather.description)}
                </Text>
                <View>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
                    {Math.round(weather.temperature)}°C
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, textTransform: 'capitalize' }}>
                    {weather.description}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16 }}>💧</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{weather.humidity}%</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16 }}>💨</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{weather.wind_speed}m/s</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        
        {/* ========== SECTION 10: COMMUNITY COMPARISON ========== */}
        {summaryStats?.community_comparison && summaryStats.community_comparison.total_users > 1 && (
          <View style={[styles.communityCard, { marginHorizontal: 16, marginBottom: 16 }]}>
            <View style={styles.communityHeader}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.communityTitle}>{isSv ? 'Jämfört med andra' : 'Compared to Others'}</Text>
            </View>
            <View style={styles.communityStats}>
              <View style={styles.communityStat}>
                <Text style={styles.communityStatValue}>
                  #{summaryStats.community_comparison.your_rank}
                </Text>
                <Text style={styles.communityStatLabel}>{isSv ? 'Din placering' : 'Your Rank'}</Text>
              </View>
              <View style={styles.communityStat}>
                <Text style={[
                  styles.communityStatValue, 
                  { color: summaryStats.community_comparison.vs_avg_percent >= 0 ? colors.success : colors.error }
                ]}>
                  {summaryStats.community_comparison.vs_avg_percent >= 0 ? '+' : ''}
                  {summaryStats.community_comparison.vs_avg_percent}%
                </Text>
                <Text style={styles.communityStatLabel}>{isSv ? 'vs genomsnitt' : 'vs average'}</Text>
              </View>
              <View style={styles.communityStat}>
                <Text style={[styles.communityStatValue, { color: colors.success }]}>
                  {isSv ? `Topp ${Math.max(1, 100 - summaryStats.community_comparison.percentile)}%` : `Top ${Math.max(1, 100 - summaryStats.community_comparison.percentile)}%`}
                </Text>
                <Text style={styles.communityStatLabel}>{isSv ? 'av användare' : 'of users'}</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* ========== SECTION 11: AI & PREMIUM (Bottom) ========== */}
        <View style={[styles.aiPremiumSection, { marginHorizontal: 16, marginBottom: 16 }]}>
          <View style={styles.aiSectionHeader}>
            <Text style={styles.aiSectionTitle}>🤖 AI & Premium</Text>
            {!isPremium && (
              <TouchableOpacity 
                onPress={() => router.push('/paywall')}
                style={{
                  backgroundColor: colors.warning + '20',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons name="star" size={12} color={colors.warning} />
                <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '600' }}>
                  {isSv ? 'Uppgradera' : 'Upgrade'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={{ gap: 10 }}>
            {/* Daily Tip */}
            <TouchableOpacity 
              style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}
              onPress={loadDailyTip}
              activeOpacity={0.7}
            >
              <View style={styles.aiCardIcon}>
                <Ionicons name="bulb" size={22} color={isPremium ? '#f59e0b' : '#9ca3af'} />
              </View>
              <View style={styles.aiCardContent}>
                <Text style={styles.aiCardTitle}>{isSv ? 'Dagens tips' : 'Daily Tip'}</Text>
                <Text style={[styles.aiCardDescription, !isPremium && { color: colors.textMuted }]}>
                  {isPremium 
                    ? (isSv ? 'Få ett dagligt AI-tips' : 'Get a daily AI tip')
                    : (isSv ? 'Kräver Premium' : 'Requires Premium')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            
            {/* Ask Agda */}
            <TouchableOpacity 
              style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}
              onPress={openAgdaModal}
              activeOpacity={0.7}
            >
              <View style={styles.aiCardIcon}>
                <Ionicons name="chatbubbles" size={22} color={isPremium ? '#8b5cf6' : '#9ca3af'} />
              </View>
              <View style={styles.aiCardContent}>
                <Text style={styles.aiCardTitle}>{isSv ? 'Fråga Agda' : 'Ask Agda'}</Text>
                <Text style={[styles.aiCardDescription, !isPremium && { color: colors.textMuted }]}>
                  {isPremium 
                    ? (isSv ? 'Din AI-rådgivare' : 'Your AI advisor')
                    : (isSv ? 'Kräver Premium' : 'Requires Premium')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            
            {/* AI Report */}
            <TouchableOpacity 
              style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}
              onPress={handleAiReportPress}
              activeOpacity={0.7}
            >
              <View style={styles.aiCardIcon}>
                <Ionicons name="document-text" size={22} color={isPremium ? colors.primary : '#9ca3af'} />
              </View>
              <View style={styles.aiCardContent}>
                <Text style={styles.aiCardTitle}>{isSv ? 'AI Dagsrapport' : 'AI Daily Report'}</Text>
                <Text style={[styles.aiCardDescription, !isPremium && { color: colors.textMuted }]}>
                  {isPremium 
                    ? (isSv ? 'Personlig AI-analys' : 'Personal AI analysis')
                    : (isSv ? 'Kräver Premium' : 'Requires Premium')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            
            {/* Egg Forecast */}
            <TouchableOpacity 
              style={[styles.aiCard, !isPremium && styles.aiCardBlurred]}
              onPress={handleForecastPress}
              activeOpacity={0.7}
            >
              <View style={styles.aiCardIcon}>
                <Ionicons name="trending-up" size={22} color={isPremium ? colors.success : '#9ca3af'} />
              </View>
              <View style={styles.aiCardContent}>
                <Text style={styles.aiCardTitle}>{isSv ? 'Äggprognos' : 'Egg Forecast'}</Text>
                <Text style={[styles.aiCardDescription, !isPremium && { color: colors.textMuted }]}>
                  {isPremium 
                    ? (isSv ? '7 dagars prognos' : '7-day forecast')
                    : (isSv ? 'Kräver Premium' : 'Requires Premium')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* ========== SECTION 12: PREMIUM BANNER (Only for free users) ========== */}
        {!isPremium && (
          <TouchableOpacity 
            style={[styles.premiumBanner, { marginHorizontal: 16, marginBottom: 24 }]}
            onPress={() => router.push('/paywall')}
          >
            <View style={styles.premiumBannerContent}>
              <Ionicons name="star" size={24} color={colors.warning} />
              <View style={styles.premiumBannerText}>
                <Text style={styles.premiumBannerTitle}>{isSv ? 'Uppgradera till Premium' : 'Upgrade to Premium'}</Text>
                <Text style={styles.premiumBannerSubtitle}>{isSv ? 'AI-rapporter, prognos, hälsologg & mer' : 'AI reports, forecast, health log & more'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        
        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
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
      
      {/* Daily Tip Modal */}
      <Modal
        visible={showDailyTipModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDailyTipModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[styles.aiModalHeader, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowDailyTipModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.aiModalTitle, { color: colors.text }]}>
              💡 {isSv ? 'Dagens tips' : 'Daily Tip'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.aiModalContent}>
            {dailyTipLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>💡</Text>
                <Text style={[styles.loadingText, { color: colors.text || '#1A1A1A' }]}>
                  {isSv ? 'Hämtar dagens tips...' : 'Loading daily tip...'}
                </Text>
              </View>
            ) : dailyTip ? (
              <View style={{ padding: 16 }}>
                {/* Tip Card */}
                <View style={[styles.reportCard, { 
                  backgroundColor: colors.surface || '#FFFFFF',
                  padding: 20,
                  borderRadius: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary || '#4CAF50'
                }]}>
                  <Text style={{ fontSize: 32, marginBottom: 12 }}>💡</Text>
                  <Text style={[styles.reportText, { 
                    color: colors.text || '#1A1A1A',
                    fontSize: 16,
                    lineHeight: 24
                  }]}>
                    {dailyTip}
                  </Text>
                </View>
                
                {/* Signature */}
                <Text style={{ 
                  textAlign: 'center', 
                  marginTop: 16, 
                  color: colors.textSecondary || '#666',
                  fontStyle: 'italic'
                }}>
                  💛 {isSv ? 'Kacklande hälsningar, Agda' : 'Clucking regards, Agda'} 🐔
                </Text>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>😕</Text>
                <Text style={[styles.loadingText, { color: colors.text || '#1A1A1A' }]}>
                  {isSv ? 'Kunde inte ladda dagens tips' : 'Could not load daily tip'}
                </Text>
                <TouchableOpacity 
                  style={{ 
                    marginTop: 16, 
                    backgroundColor: colors.primary || '#4CAF50',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 8
                  }}
                  onPress={loadDailyTip}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>
                    {isSv ? 'Försök igen' : 'Try again'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Ask Agda Modal */}
      <Modal
        visible={showAgdaModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAgdaModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[styles.aiModalHeader, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowAgdaModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.aiModalTitle, { color: colors.text }]}>
              🐔 {isSv ? 'Fråga Agda' : 'Ask Agda'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView style={styles.aiModalContent} contentContainerStyle={{ padding: 16 }}>
            {/* Introduction card */}
            <View style={{
              backgroundColor: colors.primary + '15',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: colors.primary
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>🐔</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {isSv ? 'Hej! Jag är Agda' : "Hi! I'm Agda"}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {isSv ? 'Din personliga hönsgårdsrådgivare' : 'Your personal chicken advisor'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
                {isSv 
                  ? 'Jag kan hjälpa dig med allt om höns! Ställ frågor om skötsel, hälsa, foder, äggproduktion eller vad du undrar över.'
                  : 'I can help you with everything about chickens! Ask about care, health, feed, egg production or anything you wonder about.'}
              </Text>
            </View>
            
            {/* Question suggestions - only show if no answer yet */}
            {!agdaAnswer && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
                  {isSv ? '💡 Förslag på frågor:' : '💡 Suggested questions:'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    isSv ? 'Varför lägger mina höns färre ägg?' : 'Why are my hens laying fewer eggs?',
                    isSv ? 'Vad ska jag ge mina höns att äta?' : 'What should I feed my chickens?',
                    isSv ? 'Hur håller jag hönsen varma på vintern?' : 'How do I keep chickens warm in winter?',
                    isSv ? 'Hur vet jag om en höna är sjuk?' : 'How do I know if a hen is sick?',
                  ].map((suggestion, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        backgroundColor: colors.surface,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: colors.border
                      }}
                      onPress={() => setAgdaQuestion(suggestion)}
                    >
                      <Text style={{ fontSize: 13, color: colors.text }}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {/* Input field */}
            <View style={[styles.agdaInputContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.agdaInput, { color: colors.text }]}
                placeholder={isSv ? 'Skriv din fråga här...' : 'Type your question here...'}
                placeholderTextColor={colors.textMuted}
                value={agdaQuestion}
                onChangeText={setAgdaQuestion}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity 
                style={[styles.agdaSendButton, (!agdaQuestion.trim() || agdaLoading) && { opacity: 0.5 }]}
                onPress={askAgda}
                disabled={!agdaQuestion.trim() || agdaLoading}
              >
                {agdaLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
            
            {agdaAnswer && (
              <View style={[styles.agdaAnswerCard, { backgroundColor: colors.surface }]}>
                <View style={styles.agdaAnswerHeader}>
                  <Text style={styles.agdaAvatar}>🐔</Text>
                  <Text style={[styles.agdaAnswerTitle, { color: colors.text }]}>Agda</Text>
                </View>
                <Text style={[styles.agdaAnswerText, { color: colors.text }]}>
                  {agdaAnswer}
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Free Agda Teaser Modal - for non-premium users */}
      <Modal
        visible={showFreeAgdaTeaser}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFreeAgdaTeaser(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
          }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: colors.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Text style={{ fontSize: 36 }}>🐔</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                {isSv ? 'Hej! Jag är Agda' : "Hi! I'm Agda"}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                {isSv ? 'Din personliga hönsgårdsrådgivare' : 'Your personal chicken coop advisor'}
              </Text>
            </View>
            
            {/* Free Tip */}
            <View style={{
              backgroundColor: colors.background,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text style={{ marginLeft: 8, fontWeight: '600', color: colors.text }}>
                  {isSv ? 'Gratis tips!' : 'Free tip!'}
                </Text>
              </View>
              {freeTeaserLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
                  {freeTeaserTip}
                </Text>
              )}
            </View>
            
            {/* Premium Features Teaser */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>
                {isSv ? 'Med Premium får du:' : 'With Premium you get:'}
              </Text>
              {[
                { icon: 'infinite', text: isSv ? 'Obegränsade frågor till Agda' : 'Unlimited questions to Agda' },
                { icon: 'bulb', text: isSv ? 'Dagliga AI-tips' : 'Daily AI tips' },
                { icon: 'analytics', text: isSv ? 'Personlig äggprognos' : 'Personal egg forecast' },
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                  <Text style={{ marginLeft: 10, color: colors.text }}>{item.text}</Text>
                </View>
              ))}
            </View>
            
            {/* Upgrade Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 12,
              }}
              onPress={() => {
                setShowFreeAgdaTeaser(false);
                router.push('/paywall');
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {isSv ? 'Uppgradera till Premium' : 'Upgrade to Premium'}
              </Text>
            </TouchableOpacity>
            
            {/* Close */}
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 8 }}
              onPress={() => setShowFreeAgdaTeaser(false)}
            >
              <Text style={{ color: colors.textSecondary }}>
                {isSv ? 'Kanske senare' : 'Maybe later'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Trial Expiry Warning Modal */}
      <Modal
        visible={showTrialWarning}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowTrialWarning(false);
          setTrialWarningDismissed(true);
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 340,
          }}>
            {/* Warning Icon */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: trialExpiryWarning === 'last_day' ? '#ef444420' : '#f59e0b20',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons 
                  name={trialExpiryWarning === 'last_day' ? 'alert-circle' : 'time'} 
                  size={36} 
                  color={trialExpiryWarning === 'last_day' ? '#ef4444' : '#f59e0b'} 
                />
              </View>
            </View>
            
            {/* Title */}
            <Text style={{ 
              fontSize: 22, 
              fontWeight: '700', 
              color: colors.text, 
              textAlign: 'center',
              marginBottom: 8,
            }}>
              {trialExpiryWarning === 'last_day' 
                ? (isSv ? 'Sista dagen!' : 'Last day!')
                : trialExpiryWarning === 'one_day'
                ? (isSv ? 'En dag kvar!' : 'One day left!')
                : trialExpiryWarning === 'two_days'
                ? (isSv ? 'Två dagar kvar!' : 'Two days left!')
                : (isSv ? 'Tre dagar kvar!' : 'Three days left!')
              }
            </Text>
            
            {/* Description */}
            <Text style={{ 
              fontSize: 15, 
              color: colors.textSecondary, 
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 22,
            }}>
              {isSv 
                ? `Din gratis provperiod för Premium ${trialExpiryWarning === 'last_day' ? 'går ut idag' : 'håller på att ta slut'}. Uppgradera nu för att fortsätta använda alla funktioner!`
                : `Your free Premium trial ${trialExpiryWarning === 'last_day' ? 'ends today' : 'is about to end'}. Upgrade now to continue using all features!`
              }
            </Text>
            
            {/* Features reminder */}
            <View style={{ 
              backgroundColor: colors.background, 
              borderRadius: 12, 
              padding: 12,
              marginBottom: 20,
            }}>
              {[
                { icon: 'bulb', text: isSv ? 'AI-tips från Agda' : 'AI tips from Agda' },
                { icon: 'analytics', text: isSv ? 'Äggprognos' : 'Egg forecast' },
                { icon: 'infinite', text: isSv ? 'Obegränsade frågor' : 'Unlimited questions' },
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: idx < 2 ? 8 : 0 }}>
                  <Ionicons name={item.icon as any} size={16} color={colors.primary} />
                  <Text style={{ marginLeft: 10, color: colors.text, fontSize: 14 }}>{item.text}</Text>
                </View>
              ))}
            </View>
            
            {/* Upgrade Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 12,
              }}
              onPress={() => {
                setShowTrialWarning(false);
                setTrialWarningDismissed(true);
                router.push('/paywall');
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {isSv ? 'Uppgradera nu' : 'Upgrade now'}
              </Text>
            </TouchableOpacity>
            
            {/* Close */}
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 8 }}
              onPress={() => {
                setShowTrialWarning(false);
                setTrialWarningDismissed(true);
              }}
            >
              <Text style={{ color: colors.textSecondary }}>
                {isSv ? 'Påminn mig senare' : 'Remind me later'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Daily Chores Modal */}
      <Modal
        visible={showChoresModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowChoresModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '85%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>🐔</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                  {isSv ? 'Dagens sysslor' : "Today's Chores"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowChoresModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Motivational subtitle */}
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
              {isSv 
                ? 'Bocka av dina sysslor för att hålla dina hönor glada och friska!' 
                : 'Check off tasks to keep your hens happy and healthy!'}
            </Text>
            
            {/* Progress indicator */}
            {dailyChores.length > 0 && (
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: colors.primary + '15',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                    {dailyChores.filter((c: any) => c.completed).length}/{dailyChores.length}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>
                    {dailyChores.filter((c: any) => c.completed).length === dailyChores.length
                      ? (isSv ? '🎉 Alla klara!' : '🎉 All done!')
                      : (isSv ? 'Fortsätt så!' : 'Keep going!')}
                  </Text>
                  <View style={{ 
                    height: 6, 
                    backgroundColor: colors.border, 
                    borderRadius: 3, 
                    marginTop: 6,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${(dailyChores.filter((c: any) => c.completed).length / dailyChores.length) * 100}%`,
                      backgroundColor: colors.primary,
                      borderRadius: 3,
                    }} />
                  </View>
                </View>
              </View>
            )}
            
            {/* Chores list */}
            <ScrollView style={{ maxHeight: 320 }}>
              {dailyChores.map((chore: any) => (
                <TouchableOpacity
                  key={chore.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: chore.completed ? colors.primary + '10' : colors.background,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: chore.completed ? colors.primary + '30' : colors.border,
                  }}
                  onPress={() => toggleChoreComplete(chore.id, chore.completed)}
                >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: chore.completed ? colors.primary : colors.textSecondary,
                    backgroundColor: chore.completed ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    {chore.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{chore.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontWeight: '600', 
                      color: chore.completed ? colors.textSecondary : colors.text,
                      textDecorationLine: chore.completed ? 'line-through' : 'none',
                    }}>
                      {chore.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {chore.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {dailyChores.length === 0 && (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>
                  {isSv ? 'Inga sysslor för idag!' : 'No chores for today!'}
                </Text>
              )}
            </ScrollView>
            
            {/* Close button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 16,
              }}
              onPress={() => setShowChoresModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {dailyChores.filter((c: any) => c.completed).length === dailyChores.length
                  ? (isSv ? 'Bra jobbat!' : 'Great job!')
                  : (isSv ? 'Stäng' : 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Weather Details Modal */}
      <Modal
        visible={showWeatherModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWeatherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isSv ? 'Väder idag' : 'Weather Today'}
              </Text>
              <TouchableOpacity onPress={() => setShowWeatherModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {weather && (
              <View style={{ gap: 16 }}>
                {/* Main weather display */}
                <View style={{ 
                  alignItems: 'center', 
                  padding: 20,
                  backgroundColor: colors.background,
                  borderRadius: 16 
                }}>
                  <Text style={{ fontSize: 48 }}>
                    {getWeatherIcon(weather.description)}
                  </Text>
                  <Text style={{ 
                    fontSize: 36, 
                    fontWeight: '700', 
                    color: colors.text,
                    marginTop: 8 
                  }}>
                    {Math.round(weather.temperature)}°C
                  </Text>
                  <Text style={{ 
                    fontSize: 16, 
                    color: colors.textSecondary,
                    textTransform: 'capitalize',
                    marginTop: 4
                  }}>
                    {weather.description}
                  </Text>
                </View>
                
                {/* Weather details */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ 
                    flex: 1, 
                    backgroundColor: colors.background, 
                    padding: 16, 
                    borderRadius: 12,
                    alignItems: 'center'
                  }}>
                    <Text style={{ fontSize: 24 }}>💧</Text>
                    <Text style={{ 
                      fontSize: 18, 
                      fontWeight: '600', 
                      color: colors.text,
                      marginTop: 4
                    }}>
                      {weather.humidity}%
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {isSv ? 'Luftfuktighet' : 'Humidity'}
                    </Text>
                  </View>
                  
                  <View style={{ 
                    flex: 1, 
                    backgroundColor: colors.background, 
                    padding: 16, 
                    borderRadius: 12,
                    alignItems: 'center'
                  }}>
                    <Text style={{ fontSize: 24 }}>💨</Text>
                    <Text style={{ 
                      fontSize: 18, 
                      fontWeight: '600', 
                      color: colors.text,
                      marginTop: 4
                    }}>
                      {weather.wind_speed} m/s
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {isSv ? 'Vind' : 'Wind'}
                    </Text>
                  </View>
                </View>
                
                {/* Weather tips for premium users */}
                {isPremium && weather.tips && weather.tips.length > 0 && (
                  <View style={{ 
                    backgroundColor: colors.primary + '15',
                    padding: 16,
                    borderRadius: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.primary
                  }}>
                    <Text style={{ 
                      fontSize: 14, 
                      fontWeight: '600', 
                      color: colors.primary,
                      marginBottom: 8
                    }}>
                      {isSv ? 'Tips för idag' : 'Tips for today'}
                    </Text>
                    {weather.tips.map((tip: any, idx: number) => (
                      <Text key={idx} style={{ 
                        fontSize: 13, 
                        color: colors.text,
                        marginBottom: idx < weather.tips.length - 1 ? 6 : 0,
                        lineHeight: 18
                      }}>
                        💡 {typeof tip === 'string' ? tip : tip.message || 'Tips'}
                      </Text>
                    ))}
                  </View>
                )}
                
                {/* Upgrade prompt for free users */}
                {!isPremium && (
                  <TouchableOpacity 
                    style={{ 
                      backgroundColor: colors.warning + '20',
                      padding: 16,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12
                    }}
                    onPress={() => {
                      setShowWeatherModal(false);
                      router.push('/paywall');
                    }}
                  >
                    <Ionicons name="star" size={24} color={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 14, 
                        fontWeight: '600', 
                        color: colors.text
                      }}>
                        {isSv ? 'Få personliga vädertips' : 'Get personalized weather tips'}
                      </Text>
                      <Text style={{ 
                        fontSize: 12, 
                        color: colors.textSecondary,
                        marginTop: 2
                      }}>
                        {isSv ? 'Uppgradera till Premium' : 'Upgrade to Premium'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWeatherModal(false)}
            >
              <Text style={styles.closeButtonText}>
                {isSv ? 'Stäng' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Premium Gate Modal */}
      <PremiumGateModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        featureName={premiumFeatureName}
        featureIcon={premiumFeatureIcon}
      />
      
      {/* Daily Summary Popup - Shows yesterday's stats on app open */}
      <DailySummaryPopup
        visible={showDailySummary}
        onClose={closeDailySummary}
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
  undoToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  undoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  undoButtonText: {
    color: '#fff',
    fontSize: 13,
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
  
  // Week's Best Hen Card
  bestHenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
  },
  bestHenIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bestHenInfo: {
    flex: 1,
  },
  bestHenTitle: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bestHenName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  bestHenEggs: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  
  // Community Comparison Card
  communityCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  communityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  communityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  communityStat: {
    alignItems: 'center',
  },
  communityStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  communityStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  communityAvgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  communityAvgLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  communityAvgValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
  
  // Daily Chores Card
  dailyChoresCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b30',
  },
  dailyChoresLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dailyChoresIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dailyChoresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dailyChoresSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dailyChoresProgress: {
    width: 50,
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  dailyChoresProgressFill: {
    height: '100%',
    borderRadius: 3,
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
    position: 'relative',
  },
  insightCardLocked: {
    backgroundColor: colors.surfaceSecondary + '80',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurredText: {
    opacity: 0.4,
    color: colors.textSecondary,
  },
  exampleLabel: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  // Agda Modal styles
  agdaIntro: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  agdaInputContainer: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  agdaInput: {
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  agdaSendButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    alignSelf: 'flex-end',
    minWidth: 60,
  },
  agdaAnswerCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  agdaAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  agdaAvatar: {
    fontSize: 24,
  },
  agdaAnswerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  agdaAnswerText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
