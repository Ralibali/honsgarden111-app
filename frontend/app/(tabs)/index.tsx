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
import { useAppStore } from '../../src/store/appStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import i18n, { formatCurrency } from '../../src/i18n';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

export default function HomeScreen() {
  const {
    coopSettings,
    todayStats,
    summaryStats,
    fetchCoopSettings,
    fetchTodayStats,
    fetchSummaryStats,
    addEggRecord,
    undoLastAction,
    lastAction,
    loading,
  } = useAppStore();
  
  const { isPremium } = usePremiumStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [eggCount, setEggCount] = useState('');
  const [showUndo, setShowUndo] = useState(false);
  const [lastRegisteredCount, setLastRegisteredCount] = useState(0);
  
  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimeout = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
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
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{coopSettings?.coop_name || 'Min Hönsgård'}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
          <Text style={styles.date}>{dateString}</Text>
        </View>
        
        {/* Quick Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.henCard]}>
            <Ionicons name="heart" size={28} color="#FF6B6B" />
            <Text style={styles.statValue}>{todayStats?.hen_count || 0}</Text>
            <Text style={styles.statLabel}>{t('home.hens')}</Text>
          </View>
          
          <View style={[styles.statCard, styles.eggCard]}>
            <Ionicons name="egg" size={28} color="#FFD93D" />
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
              <Text style={[styles.monthValue, { color: '#FF6B6B' }]}>
                {formatCurrency(summaryStats?.this_month.costs || 0)}
              </Text>
              <Text style={styles.monthLabel}>{t('home.costs')}</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStat}>
              <Text style={[styles.monthValue, { color: '#4CAF50' }]}>
                {formatCurrency(summaryStats?.this_month.sales || 0)}
              </Text>
              <Text style={styles.monthLabel}>{t('home.sales')}</Text>
            </View>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>{t('home.net')}:</Text>
            <Text style={[
              styles.netValue,
              { color: (summaryStats?.this_month.net || 0) >= 0 ? '#4CAF50' : '#FF6B6B' }
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
              <Ionicons name="egg-outline" size={20} color="#FFD93D" />
              <Text style={styles.totalValue}>{summaryStats?.total_eggs_all_time || 0}</Text>
              <Text style={styles.totalLabel}>{t('home.totalEggs')}</Text>
            </View>
            <View style={styles.totalItem}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
              <Text style={styles.totalValue}>{formatCurrency(summaryStats?.total_sales_all_time || 0)}</Text>
              <Text style={styles.totalLabel}>{t('home.income')}</Text>
            </View>
            <View style={styles.totalItem}>
              <Ionicons name="trending-down" size={20} color="#FF6B6B" />
              <Text style={styles.totalValue}>{formatCurrency(summaryStats?.total_costs_all_time || 0)}</Text>
              <Text style={styles.totalLabel}>{t('home.expenses')}</Text>
            </View>
          </View>
        </View>
        
        {/* Premium Banner (if not premium) */}
        {!isPremium && (
          <TouchableOpacity style={styles.premiumBanner}>
            <View style={styles.premiumBannerContent}>
              <Ionicons name="star" size={24} color="#FFD93D" />
              <View style={styles.premiumBannerText}>
                <Text style={styles.premiumBannerTitle}>{t('common.upgrade')} till Premium</Text>
                <Text style={styles.premiumBannerSubtitle}>Obegränsad historik, PDF-export, påminnelser</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
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
                placeholderTextColor="#666"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
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
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  henCard: {
    borderColor: '#FF6B6B33',
    borderWidth: 1,
  },
  eggCard: {
    borderColor: '#FFD93D33',
    borderWidth: 1,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
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
    backgroundColor: '#2C2C2E',
  },
  monthValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  monthLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    gap: 8,
  },
  netLabel: {
    fontSize: 16,
    color: '#8E8E93',
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
    color: '#FFF',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD93D33',
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
    color: '#FFF',
  },
  premiumBannerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  undoSnackbar: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  undoText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  undoButton: {
    marginLeft: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  undoButtonText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  modalDate: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  quickAddLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 24,
    marginBottom: 12,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
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
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
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
});
