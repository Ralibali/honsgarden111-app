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
import i18n, { setLanguage, getLanguage } from '../../src/i18n';
import * as Notifications from 'expo-notifications';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function SettingsScreen() {
  const router = useRouter();
  const { coopSettings, fetchCoopSettings, updateCoopSettings, loading } = useAppStore();
  const { isPremium, plan, expiresAt, clearPremiumStatus } = usePremiumStore();
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
  
  // Cancel subscription modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  
  useEffect(() => {
    fetchCoopSettings();
  }, []);
  
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
            
            <TouchableOpacity 
              style={styles.premiumCard}
              onPress={() => !isPremium && router.push('/paywall')}
            >
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
                    {t('settings.premiumStatus')}: {isPremium ? t('settings.premiumActive') : t('settings.premiumInactive')}
                  </Text>
                  {isPremium && plan && (
                    <Text style={styles.premiumPlan}>
                      {plan === 'yearly' ? (isSv ? 'Årsprenumeration' : 'Yearly subscription') : (isSv ? 'Månadsprenumeration' : 'Monthly subscription')}
                    </Text>
                  )}
                </View>
                {!isPremium && (
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                )}
              </View>
            </TouchableOpacity>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
});
