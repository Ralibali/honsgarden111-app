import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { useThemeStore, ThemeColors, ThemeMode } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import i18n, { setLanguage, getLanguage } from '../../src/i18n';
import * as Notifications from 'expo-notifications';
import PremiumGateModal from '../../components/PremiumGateModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function SettingsScreen() {
  const router = useRouter();
  const { coopSettings, fetchCoopSettings, updateCoopSettings, loading } = useAppStore();
  const { isPremium, plan, expiresAt, clearPremiumStatus } = usePremiumStore();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { colors, isDark, mode, setThemeMode } = useThemeStore();
  
  const [coopName, setCoopName] = useState('');
  const [henCount, setHenCount] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'sv' | 'en'>(getLanguage());
  
  // Reminder states
  const [eggReminderEnabled, setEggReminderEnabled] = useState(false);
  const [feedReminderEnabled, setFeedReminderEnabled] = useState(false);
  
  // Feedback modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'feature' | 'improvement' | 'bug' | 'other'>('feature');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  
  // Premium Gate Modal state
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // Cancel subscription modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Feature preferences (Premium only)
  const [featurePrefs, setFeaturePrefs] = useState<any>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  
  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  
  useEffect(() => {
    fetchCoopSettings();
    loadFeaturePreferences();
    checkAdminStatus();
  }, []);
  
  const checkAdminStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/check`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.is_admin === true);
      }
    } catch (error) {
      setIsAdmin(false);
    }
  };
  
  const loadFeaturePreferences = async () => {
    try {
      const res = await fetch(`${API_URL}/api/feature-preferences`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setFeaturePrefs(data);
      }
    } catch (error) {
      console.error('Failed to load feature preferences:', error);
    }
  };
  
  const updateFeaturePreference = async (key: string, value: boolean) => {
    if (!featurePrefs?.can_customize) return;
    
    setSavingPrefs(true);
    try {
      const res = await fetch(`${API_URL}/api/feature-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [key]: value })
      });
      
      if (res.ok) {
        const data = await res.json();
        setFeaturePrefs(data);
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
    }
    setSavingPrefs(false);
  };
  
  useEffect(() => {
    if (coopSettings) {
      setCoopName(coopSettings.coop_name);
      setHenCount(coopSettings.hen_count.toString());
    }
  }, [coopSettings]);
  
  useEffect(() => {
    if (coopSettings) {
      const nameChanged = coopName !== coopSettings.coop_name;
      const countChanged = henCount !== coopSettings.hen_count.toString();
      setHasChanges(nameChanged || countChanged);
    }
  }, [coopName, henCount, coopSettings]);
  
  const handleSave = async () => {
    const count = parseInt(henCount);
    if (isNaN(count) || count < 0) {
      Alert.alert(t('common.error'), t('errors.invalidInput'));
      return;
    }
    
    await updateCoopSettings({
      coop_name: coopName.trim() || 'Min Hönsgård',
      hen_count: count,
    });
    
    Alert.alert(t('common.success'), t('settings.saved'));
  };
  
  const adjustHenCount = (delta: number) => {
    const current = parseInt(henCount) || 0;
    const newCount = Math.max(0, current + delta);
    setHenCount(newCount.toString());
  };
  
  const handleLanguageChange = (lang: 'sv' | 'en') => {
    setLanguage(lang);
    setCurrentLanguage(lang);
  };
  
  const handleThemeChange = (newMode: ThemeMode) => {
    setThemeMode(newMode);
  };
  
  const handleReminderToggle = async (type: 'egg' | 'feed', enabled: boolean) => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    
    if (enabled) {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isSv ? 'Behörighet krävs' : 'Permission required',
          isSv ? 'Aktivera notifikationer i telefonens inställningar för att använda påminnelser.' : 'Enable notifications in phone settings to use reminders.'
        );
        return;
      }
    }
    
    if (type === 'egg') {
      setEggReminderEnabled(enabled);
      // TODO: Schedule/cancel notification
    } else {
      setFeedReminderEnabled(enabled);
      // TODO: Schedule/cancel notification
    }
  };
  
  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`${API_URL}/api/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: cancelReason }),
      });
      
      if (response.ok) {
        clearPremiumStatus();
        setShowCancelModal(false);
        setCancelReason('');
        Alert.alert(
          isSv ? 'Prenumeration avslutad' : 'Subscription cancelled',
          t('settings.subscriptionCancelled')
        );
      } else {
        const error = await response.json();
        Alert.alert(t('common.error'), error.detail || t('errors.networkError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.networkError'));
    } finally {
      setCancelling(false);
    }
  };
  
  // Handle send feedback
  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      Alert.alert(t('common.error'), isSv ? 'Skriv ett meddelande' : 'Please write a message');
      return;
    }
    
    setSendingFeedback(true);
    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackMessage,
          email: feedbackEmail || undefined,
        }),
      });
      
      if (response.ok) {
        setShowFeedbackModal(false);
        setFeedbackMessage('');
        setFeedbackEmail('');
        Alert.alert(
          isSv ? 'Tack!' : 'Thank you!',
          t('settings.feedbackSent')
        );
      } else {
        Alert.alert(t('common.error'), t('errors.networkError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.networkError'));
    } finally {
      setSendingFeedback(false);
    }
  };
  
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@honsgarden.se?subject=Support%20-%20H%C3%B6nsg%C3%A5rden');
  };
  
  const styles = createStyles(colors, isDark);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('settings.title')}</Text>
          </View>
          
          {/* Premium Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.premiumSection')}</Text>
            
            <View style={styles.premiumCard}>
              <View style={styles.premiumCardContent}>
                <View style={[
                  styles.premiumIcon,
                  isPremium ? styles.premiumIconActive : styles.premiumIconInactive
                ]}>
                  <Ionicons 
                    name={isPremium ? 'star' : 'star-outline'} 
                    size={24} 
                    color={isPremium ? colors.warning : colors.textMuted} 
                  />
                </View>
                <View style={styles.premiumInfo}>
                  <Text style={styles.premiumStatus}>
                    {isPremium ? t('settings.premiumActive') : t('settings.premiumInactive')}
                  </Text>
                  {isPremium && plan && (
                    <Text style={styles.premiumPlan}>
                      {plan === 'yearly' ? (isSv ? 'Årsprenumeration' : 'Yearly subscription') : (isSv ? 'Månadsprenumeration' : 'Monthly subscription')}
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Upgrade Button - Only for non-premium users */}
              {!isPremium && (
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={() => setShowPremiumModal(true)}
                >
                  <Ionicons name="star" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.upgradeButtonText}>
                    {isSv ? 'Uppgradera till Premium' : 'Upgrade to Premium'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Cancel Subscription Button - Only for Premium users */}
            {isPremium && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCancelModal(true)}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                <Text style={styles.cancelButtonText}>{t('settings.cancelSubscription')}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Coop Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.coopSection')}</Text>
            
            {/* Coop Name */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>{t('settings.coopName')}</Text>
              <TextInput
                style={styles.textInput}
                value={coopName}
                onChangeText={setCoopName}
                placeholder={t('settings.coopNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            
            {/* Hen Count */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>{t('settings.henCount')}</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => adjustHenCount(-1)}
                >
                  <Ionicons name="remove" size={24} color={colors.text} />
                </TouchableOpacity>
                
                <TextInput
                  style={styles.counterInput}
                  value={henCount}
                  onChangeText={setHenCount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => adjustHenCount(1)}
                >
                  <Ionicons name="add" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.settingHint}>
                {t('settings.henCountHint')}
              </Text>
            </View>
          </View>
          
          {/* Save Button */}
          {hasChanges && (
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>
                {loading ? t('common.loading') : t('settings.saveChanges')}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Theme Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isSv ? 'Utseende' : 'Appearance'}</Text>
            
            <View style={styles.themeContainer}>
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  mode === 'light' && styles.themeButtonActive,
                ]}
                onPress={() => handleThemeChange('light')}
              >
                <Ionicons name="sunny" size={24} color={mode === 'light' ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.themeText,
                  mode === 'light' && styles.themeTextActive,
                ]}>
                  {isSv ? 'Ljust' : 'Light'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  mode === 'dark' && styles.themeButtonActive,
                ]}
                onPress={() => handleThemeChange('dark')}
              >
                <Ionicons name="moon" size={24} color={mode === 'dark' ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.themeText,
                  mode === 'dark' && styles.themeTextActive,
                ]}>
                  {isSv ? 'Mörkt' : 'Dark'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  mode === 'system' && styles.themeButtonActive,
                ]}
                onPress={() => handleThemeChange('system')}
              >
                <Ionicons name="phone-portrait" size={24} color={mode === 'system' ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.themeText,
                  mode === 'system' && styles.themeTextActive,
                ]}>
                  {isSv ? 'System' : 'System'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Reminders Section (Premium) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('settings.remindersSection')}
              {!isPremium && <Text style={styles.premiumBadge}> ★</Text>}
            </Text>
            
            <View style={styles.reminderItem}>
              <View style={styles.reminderInfo}>
                <View style={styles.reminderIcon}>
                  <Ionicons name="egg" size={20} color={colors.warning} />
                </View>
                <View>
                  <Text style={styles.reminderTitle}>{t('settings.eggReminder')}</Text>
                  <Text style={styles.reminderDesc}>{t('settings.eggReminderDesc')}</Text>
                </View>
              </View>
              <Switch
                value={eggReminderEnabled}
                onValueChange={(val) => handleReminderToggle('egg', val)}
                trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
                thumbColor={eggReminderEnabled ? '#FFF' : colors.textSecondary}
              />
            </View>
            
            <View style={styles.reminderItem}>
              <View style={styles.reminderInfo}>
                <View style={styles.reminderIcon}>
                  <Ionicons name="cart" size={20} color={colors.success} />
                </View>
                <View>
                  <Text style={styles.reminderTitle}>{t('settings.feedReminder')}</Text>
                  <Text style={styles.reminderDesc}>{t('settings.feedReminderDesc')}</Text>
                </View>
              </View>
              <Switch
                value={feedReminderEnabled}
                onValueChange={(val) => handleReminderToggle('feed', val)}
                trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
                thumbColor={feedReminderEnabled ? '#FFF' : colors.textSecondary}
              />
            </View>
          </View>
          
          {/* Language Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.languageSection')}</Text>
            
            <View style={styles.languageContainer}>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLanguage === 'sv' && styles.languageButtonActive,
                ]}
                onPress={() => handleLanguageChange('sv')}
              >
                <Text style={styles.languageFlag}>🇸🇪</Text>
                <Text style={[
                  styles.languageText,
                  currentLanguage === 'sv' && styles.languageTextActive,
                ]}>
                  {t('settings.swedish')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLanguage === 'en' && styles.languageButtonActive,
                ]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={styles.languageFlag}>🇬🇧</Text>
                <Text style={[
                  styles.languageText,
                  currentLanguage === 'en' && styles.languageTextActive,
                ]}>
                  {t('settings.english')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.aboutSection')}</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="egg" size={24} color={colors.warning} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>{t('settings.appName')}</Text>
                  <Text style={styles.infoText}>{t('settings.version')} 1.2</Text>
                </View>
              </View>
              <Text style={styles.infoDescription}>
                {t('settings.appDescription')}
              </Text>
            </View>
          </View>
          
          {/* Tips Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.tipsSection')}</Text>
            
            <View style={styles.tipCard}>
              <Ionicons name="bulb" size={20} color={colors.warning} />
              <Text style={styles.tipText}>
                {t('settings.tip1')}
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <Ionicons name="calculator" size={20} color={colors.success} />
              <Text style={styles.tipText}>
                {t('settings.tip2')}
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <Ionicons name="stats-chart" size={20} color="#6B7FD7" />
              <Text style={styles.tipText}>
                {t('settings.tip3')}
              </Text>
            </View>
          </View>
          
          {/* Feature Preferences Section (Premium Only) */}
          {featurePrefs && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isSv ? 'Anpassa funktioner' : 'Customize features'} 
                {!featurePrefs.can_customize && ' 🔒'}
              </Text>
              
              {!featurePrefs.can_customize && (
                <View style={styles.premiumHint}>
                  <Text style={styles.premiumHintText}>
                    {isSv 
                      ? 'Uppgradera till Premium för att dölja funktioner du inte använder'
                      : 'Upgrade to Premium to hide features you don\'t use'
                    }
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/paywall')}>
                    <Text style={styles.premiumHintLink}>
                      🌟 {isSv ? 'Uppgradera' : 'Upgrade'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={[styles.featureToggleCard, !featurePrefs.can_customize && styles.featureToggleDisabled]}>
                <View style={styles.featureToggleInfo}>
                  <Text style={styles.featureToggleEmoji}>🏠</Text>
                  <View>
                    <Text style={styles.featureToggleName}>{isSv ? 'Flockhantering' : 'Flock management'}</Text>
                    <Text style={styles.featureToggleDesc}>{isSv ? 'Organisera hönor i flockar' : 'Organize hens in flocks'}</Text>
                  </View>
                </View>
                <Switch
                  value={featurePrefs.preferences?.show_flock_management ?? true}
                  onValueChange={(v) => updateFeaturePreference('show_flock_management', v)}
                  disabled={!featurePrefs.can_customize || savingPrefs}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={featurePrefs.preferences?.show_flock_management ? colors.primary : colors.textMuted}
                />
              </View>
              
              <View style={[styles.featureToggleCard, !featurePrefs.can_customize && styles.featureToggleDisabled]}>
                <View style={styles.featureToggleInfo}>
                  <Text style={styles.featureToggleEmoji}>🩺</Text>
                  <View>
                    <Text style={styles.featureToggleName}>{isSv ? 'Hälsologg' : 'Health log'}</Text>
                    <Text style={styles.featureToggleDesc}>{isSv ? 'Dokumentera hälsa per höna' : 'Document health per hen'}</Text>
                  </View>
                </View>
                <Switch
                  value={featurePrefs.preferences?.show_health_log ?? true}
                  onValueChange={(v) => updateFeaturePreference('show_health_log', v)}
                  disabled={!featurePrefs.can_customize || savingPrefs}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={featurePrefs.preferences?.show_health_log ? colors.primary : colors.textMuted}
                />
              </View>
              
              <View style={[styles.featureToggleCard, !featurePrefs.can_customize && styles.featureToggleDisabled]}>
                <View style={styles.featureToggleInfo}>
                  <Text style={styles.featureToggleEmoji}>🥚</Text>
                  <View>
                    <Text style={styles.featureToggleName}>{isSv ? 'Kläckningsmodul' : 'Hatching module'}</Text>
                    <Text style={styles.featureToggleDesc}>{isSv ? 'Spåra ruvande ägg' : 'Track incubating eggs'}</Text>
                  </View>
                </View>
                <Switch
                  value={featurePrefs.preferences?.show_hatching_module ?? true}
                  onValueChange={(v) => updateFeaturePreference('show_hatching_module', v)}
                  disabled={!featurePrefs.can_customize || savingPrefs}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={featurePrefs.preferences?.show_hatching_module ? colors.primary : colors.textMuted}
                />
              </View>
              
              <View style={[styles.featureToggleCard, !featurePrefs.can_customize && styles.featureToggleDisabled]}>
                <View style={styles.featureToggleInfo}>
                  <Text style={styles.featureToggleEmoji}>📊</Text>
                  <View>
                    <Text style={styles.featureToggleName}>{isSv ? 'Produktivitetsvarningar' : 'Productivity alerts'}</Text>
                    <Text style={styles.featureToggleDesc}>{isSv ? 'Varning om höns ej värper' : 'Alerts for non-laying hens'}</Text>
                  </View>
                </View>
                <Switch
                  value={featurePrefs.preferences?.show_productivity_alerts ?? true}
                  onValueChange={(v) => updateFeaturePreference('show_productivity_alerts', v)}
                  disabled={!featurePrefs.can_customize || savingPrefs}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={featurePrefs.preferences?.show_productivity_alerts ? colors.primary : colors.textMuted}
                />
              </View>
              
              <View style={[styles.featureToggleCard, !featurePrefs.can_customize && styles.featureToggleDisabled]}>
                <View style={styles.featureToggleInfo}>
                  <Text style={styles.featureToggleEmoji}>💰</Text>
                  <View>
                    <Text style={styles.featureToggleName}>{isSv ? 'Ekonomiinsikter' : 'Economy insights'}</Text>
                    <Text style={styles.featureToggleDesc}>{isSv ? 'Kostnad per ägg m.m.' : 'Cost per egg etc.'}</Text>
                  </View>
                </View>
                <Switch
                  value={featurePrefs.preferences?.show_economy_insights ?? true}
                  onValueChange={(v) => updateFeaturePreference('show_economy_insights', v)}
                  disabled={!featurePrefs.can_customize || savingPrefs}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={featurePrefs.preferences?.show_economy_insights ? colors.primary : colors.textMuted}
                />
              </View>
            </View>
          )}
          
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isSv ? 'Konto' : 'Account'}</Text>
            
            {isAuthenticated && user && (
              <View style={styles.accountInfo}>
                <View style={styles.accountIcon}>
                  <Ionicons name="person" size={24} color={colors.primary} />
                </View>
                <View style={styles.accountDetails}>
                  <Text style={styles.accountName}>{user.name || 'Användare'}</Text>
                  <Text style={styles.accountEmail}>{user.email}</Text>
                </View>
              </View>
            )}
            
            {/* Admin Panel Link */}
            {isAdmin && (
              <TouchableOpacity 
                style={[styles.logoutButton, { backgroundColor: colors.primary + '20', marginBottom: 12 }]}
                onPress={() => {
                  // Open admin panel in browser
                  const adminUrl = `${API_URL}/api/web/admin`;
                  Linking.openURL(adminUrl);
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                <Text style={[styles.logoutText, { color: colors.primary }]}>{isSv ? 'Admin Panel' : 'Admin Panel'}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={() => {
                Alert.alert(
                  isSv ? 'Logga ut' : 'Log out',
                  isSv ? 'Är du säker på att du vill logga ut?' : 'Are you sure you want to log out?',
                  [
                    { text: isSv ? 'Avbryt' : 'Cancel', style: 'cancel' },
                    { 
                      text: isSv ? 'Logga ut' : 'Log out', 
                      style: 'destructive',
                      onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="log-out" size={20} color={colors.error} />
              <Text style={styles.logoutText}>{isSv ? 'Logga ut' : 'Log out'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Contact & Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isSv ? 'Kontakt & Support' : 'Contact & Support'}</Text>
            
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => setShowFeedbackModal(true)}
            >
              <View style={styles.contactIcon}>
                <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{isSv ? 'Skicka feedback' : 'Send feedback'}</Text>
                <Text style={styles.contactDesc}>{isSv ? 'Förslag, idéer eller problem' : 'Suggestions, ideas or issues'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={handleContactSupport}
            >
              <View style={styles.contactIcon}>
                <Ionicons name="mail" size={22} color={colors.success} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{isSv ? 'E-posta oss' : 'Email us'}</Text>
                <Text style={styles.contactDesc}>support@honsgarden.se</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💬 {isSv ? 'Skicka feedback' : 'Send feedback'}</Text>
            <Text style={styles.modalSubtitle}>
              {isSv ? 'Vi älskar att höra från dig! Hjälp oss göra appen bättre.' : 'We love hearing from you! Help us improve.'}
            </Text>
            
            <Text style={styles.inputLabel}>{isSv ? 'Typ av feedback' : 'Feedback type'}</Text>
            <View style={styles.feedbackTypeContainer}>
              {[
                { value: 'feature', label: isSv ? '💡 Ny funktion' : '💡 New feature', color: colors.warning },
                { value: 'improvement', label: isSv ? '✨ Förbättring' : '✨ Improvement', color: colors.primary },
                { value: 'bug', label: isSv ? '🐛 Problem' : '🐛 Bug', color: colors.error },
                { value: 'other', label: isSv ? '📝 Övrigt' : '📝 Other', color: colors.textSecondary },
              ].map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.feedbackTypeBtn,
                    feedbackType === type.value && { borderColor: type.color, backgroundColor: type.color + '15' }
                  ]}
                  onPress={() => setFeedbackType(type.value as any)}
                >
                  <Text style={[
                    styles.feedbackTypeText,
                    feedbackType === type.value && { color: type.color }
                  ]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.inputLabel}>{isSv ? 'Ditt meddelande' : 'Your message'} *</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              placeholder={isSv ? 'Beskriv din feedback...' : 'Describe your feedback...'}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
            
            <Text style={styles.inputLabel}>{isSv ? 'E-post (valfritt)' : 'Email (optional)'}</Text>
            <TextInput
              style={styles.emailInput}
              value={feedbackEmail}
              onChangeText={setFeedbackEmail}
              placeholder={isSv ? 'din@email.se' : 'your@email.com'}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, sendingFeedback && { opacity: 0.5 }]}
                onPress={handleSendFeedback}
                disabled={sendingFeedback || !feedbackMessage.trim()}
              >
                <Text style={styles.modalSaveText}>
                  {sendingFeedback ? (isSv ? 'Skickar...' : 'Sending...') : (isSv ? 'Skicka' : 'Send')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Cancel Subscription Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>😢 {isSv ? 'Avsluta prenumeration' : 'Cancel subscription'}</Text>
            <Text style={styles.modalSubtitle}>
              {isSv 
                ? 'Vi är ledsna att se dig gå. Berätta gärna varför så vi kan bli bättre.'
                : 'We\'re sad to see you go. Please tell us why so we can improve.'
              }
            </Text>
            
            <Text style={styles.inputLabel}>{isSv ? 'Anledning (valfritt)' : 'Reason (optional)'}</Text>
            <TextInput
              style={styles.feedbackInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={isSv ? 'Berätta varför du avslutar...' : 'Tell us why you\'re cancelling...'}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelText}>{isSv ? 'Avbryt' : 'Go back'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDangerBtn, cancelling && { opacity: 0.5 }]}
                onPress={handleCancelSubscription}
                disabled={cancelling}
              >
                <Text style={styles.modalDangerText}>
                  {cancelling ? (isSv ? 'Avslutar...' : 'Cancelling...') : t('settings.cancelSubscription')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Premium Gate Modal */}
      <PremiumGateModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumBadge: {
    color: colors.warning,
  },
  premiumCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  premiumCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumIconActive: {
    backgroundColor: colors.warning + '22',
  },
  premiumIconInactive: {
    backgroundColor: colors.surfaceSecondary,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  premiumPlan: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterInput: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    minWidth: 80,
  },
  settingHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  themeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeButtonActive: {
    borderColor: colors.primary,
  },
  themeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  themeTextActive: {
    color: colors.text,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  reminderDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    borderColor: colors.primary,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  languageTextActive: {
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Contact & Support styles
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  contactDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Modal styles
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
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  feedbackTypeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  feedbackTypeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  feedbackInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  emailInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalDangerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Feature toggle styles
  premiumHint: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  premiumHintText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  premiumHintLink: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  featureToggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  featureToggleDisabled: {
    opacity: 0.6,
  },
  featureToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  featureToggleEmoji: {
    fontSize: 24,
    width: 32,
  },
  featureToggleName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  featureToggleDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Account section styles
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
});
