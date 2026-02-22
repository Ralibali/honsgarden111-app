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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import i18n, { setLanguage, getLanguage } from '../../src/i18n';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const { coopSettings, fetchCoopSettings, updateCoopSettings, loading } = useAppStore();
  const { isPremium, plan, expiresAt } = usePremiumStore();
  
  const [coopName, setCoopName] = useState('');
  const [henCount, setHenCount] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'sv' | 'en'>(getLanguage());
  
  // Reminder states
  const [eggReminderEnabled, setEggReminderEnabled] = useState(false);
  const [feedReminderEnabled, setFeedReminderEnabled] = useState(false);
  
  const t = i18n.t.bind(i18n);
  
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
    // Force re-render by updating state
    // In a real app, you might want to use a context or state management
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
          'Behörighet krävs',
          'Aktivera notifikationer i telefonens inställningar för att använda påminnelser.'
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
                    color={isPremium ? '#FFD93D' : '#666'} 
                  />
                </View>
                <View style={styles.premiumInfo}>
                  <Text style={styles.premiumStatus}>
                    {t('settings.premiumStatus')}: {isPremium ? t('settings.premiumActive') : t('settings.premiumInactive')}
                  </Text>
                  {isPremium && plan && (
                    <Text style={styles.premiumPlan}>
                      {plan === 'yearly' ? 'Årsprenumeration' : 'Månadsprenumeration'}
                    </Text>
                  )}
                </View>
                {!isPremium && (
                  <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
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
                placeholderTextColor="#666"
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
                  <Ionicons name="remove" size={24} color="#FFF" />
                </TouchableOpacity>
                
                <TextInput
                  style={styles.counterInput}
                  value={henCount}
                  onChangeText={setHenCount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#666"
                />
                
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => adjustHenCount(1)}
                >
                  <Ionicons name="add" size={24} color="#FFF" />
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
          
          {/* Reminders Section (Premium) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('settings.remindersSection')}
              {!isPremium && <Text style={styles.premiumBadge}> ★</Text>}
            </Text>
            
            <View style={styles.reminderItem}>
              <View style={styles.reminderInfo}>
                <View style={styles.reminderIcon}>
                  <Ionicons name="egg" size={20} color="#FFD93D" />
                </View>
                <View>
                  <Text style={styles.reminderTitle}>{t('settings.eggReminder')}</Text>
                  <Text style={styles.reminderDesc}>{t('settings.eggReminderDesc')}</Text>
                </View>
              </View>
              <Switch
                value={eggReminderEnabled}
                onValueChange={(val) => handleReminderToggle('egg', val)}
                trackColor={{ false: '#3A3A3C', true: '#4CAF50' }}
                thumbColor={eggReminderEnabled ? '#FFF' : '#8E8E93'}
              />
            </View>
            
            <View style={styles.reminderItem}>
              <View style={styles.reminderInfo}>
                <View style={styles.reminderIcon}>
                  <Ionicons name="cart" size={20} color="#4CAF50" />
                </View>
                <View>
                  <Text style={styles.reminderTitle}>{t('settings.feedReminder')}</Text>
                  <Text style={styles.reminderDesc}>{t('settings.feedReminderDesc')}</Text>
                </View>
              </View>
              <Switch
                value={feedReminderEnabled}
                onValueChange={(val) => handleReminderToggle('feed', val)}
                trackColor={{ false: '#3A3A3C', true: '#4CAF50' }}
                thumbColor={feedReminderEnabled ? '#FFF' : '#8E8E93'}
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
                <Ionicons name="egg" size={24} color="#FFD93D" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>{t('settings.appName')}</Text>
                  <Text style={styles.infoText}>{t('settings.version')} 1.1</Text>
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
              <Ionicons name="bulb" size={20} color="#FFD93D" />
              <Text style={styles.tipText}>
                {t('settings.tip1')}
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <Ionicons name="calculator" size={20} color="#4CAF50" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
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
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumBadge: {
    color: '#FFD93D',
  },
  premiumCard: {
    backgroundColor: '#1C1C1E',
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
    backgroundColor: '#FFD93D22',
  },
  premiumIconInactive: {
    backgroundColor: '#2C2C2E',
  },
  premiumInfo: {
    flex: 1,
  },
  premiumStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  premiumPlan: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  settingItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
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
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterInput: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    minWidth: 80,
  },
  settingHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
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
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
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
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '500',
  },
  reminderDesc: {
    fontSize: 12,
    color: '#8E8E93',
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
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    borderColor: '#4CAF50',
  },
  languageFlag: {
    fontSize: 24,
  },
  languageText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  languageTextActive: {
    color: '#FFF',
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
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
    color: '#FFF',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
});
