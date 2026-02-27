import React, { useEffect, useState, useMemo } from 'react';
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
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, EggRecord } from '../../src/store/appStore';
import { useThemeStore, ThemeColors } from '../../src/store/themeStore';
import { format, parseISO, subDays } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import i18n from '../../src/i18n';
import * as Haptics from 'expo-haptics';

export default function EggsScreen() {
  const { eggRecords, fetchEggRecords, addEggRecord, deleteEggRecord, loading } = useAppStore();
  const { colors, isDark } = useThemeStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eggCount, setEggCount] = useState('');
  const [notes, setNotes] = useState('');
  const [hens, setHens] = useState<any[]>([]);
  const [selectedHenId, setSelectedHenId] = useState('');
  const [filterDays, setFilterDays] = useState(30); // 7 or 30 day filter
  const [editingRecord, setEditingRecord] = useState<EggRecord | null>(null);
  
  const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  
  const t = i18n.t.bind(i18n);
  const getLocale = () => i18n.locale.startsWith('sv') ? sv : enUS;
  const isSv = i18n.locale.startsWith('sv');
  
  useEffect(() => {
    loadData();
    loadHens();
  }, [filterDays]);
  
  const loadData = async () => {
    const end = new Date();
    const start = subDays(end, filterDays);
    await fetchEggRecords(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    );
  };
  
  const loadHens = async () => {
    try {
      const res = await fetch(`${API_URL}/api/hens?active_only=true`, {
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
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const handleAddRecord = async () => {
    const count = parseInt(eggCount);
    if (isNaN(count) || count < 0) {
      Alert.alert(t('common.error'), t('errors.invalidInput'));
      return;
    }
    
    await addEggRecord(selectedDate, count, notes || undefined, selectedHenId || undefined);
    setShowAddModal(false);
    setEggCount('');
    setNotes('');
    setSelectedHenId('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };
  
  const handleQuickAdd = async (count: number) => {
    await addEggRecord(selectedDate, count, undefined, selectedHenId || undefined);
    setShowAddModal(false);
    setEggCount('');
    setNotes('');
    setSelectedHenId('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };
  
  const handleDeleteRecord = (record: EggRecord) => {
    Alert.alert(
      t('common.delete'),
      t('eggs.deleteConfirm', { count: record.count, date: format(parseISO(record.date), 'd MMMM', { locale: getLocale() }) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteEggRecord(record.id) },
      ]
    );
  };
  
  // Generate last 7 days for quick date selection
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: i === 0 ? t('eggs.today') : i === 1 ? t('eggs.yesterday') : format(date, 'EEE d', { locale: getLocale() }),
    };
  });
  
  // Calculate totals
  const totalEggs = eggRecords.reduce((sum, r) => sum + r.count, 0);
  const avgEggs = eggRecords.length > 0 ? (totalEggs / eggRecords.length).toFixed(1) : '0';
  
  // Sort records by date descending and add trend info
  const sortedRecords = useMemo(() => {
    const sorted = [...eggRecords].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return sorted.map((record, index) => {
      const prevRecord = sorted[index + 1];
      let trend: 'up' | 'down' | 'same' = 'same';
      if (prevRecord) {
        if (record.count > prevRecord.count) trend = 'up';
        else if (record.count < prevRecord.count) trend = 'down';
      }
      return { ...record, trend };
    });
  }, [eggRecords]);
  
  // Swipe actions component
  const SwipeableRecord = ({ record, trend, onEdit, onDelete }: any) => {
    const translateX = new Animated.Value(0);
    const [swiped, setSwiped] = useState(false);
    
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -120));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -60) {
          Animated.spring(translateX, {
            toValue: -120,
            useNativeDriver: true,
          }).start();
          setSwiped(true);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          setSwiped(false);
        }
      },
    });
    
    const resetSwipe = () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      setSwiped(false);
    };
    
    // Format date as "Fre 27 feb"
    const formattedDate = format(parseISO(record.date), 'EEE d MMM', { locale: getLocale() });
    
    return (
      <View style={styles.swipeContainer}>
        {/* Background actions */}
        <View style={styles.swipeActions}>
          <TouchableOpacity 
            style={[styles.swipeAction, styles.editAction]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit(record);
              resetSwipe();
            }}
          >
            <Ionicons name="pencil" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Redigera</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.swipeAction, styles.deleteAction]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onDelete(record);
              resetSwipe();
            }}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Ta bort</Text>
          </TouchableOpacity>
        </View>
        
        {/* Main content */}
        <Animated.View 
          style={[styles.recordItem, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.recordLeft}>
            <View style={styles.recordIcon}>
              <Ionicons name="egg" size={20} color={colors.warning} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.recordDate}>{formattedDate}</Text>
                {trend === 'up' && (
                  <View style={[styles.trendBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.trendText, { color: colors.success }]}>↑</Text>
                  </View>
                )}
                {trend === 'down' && (
                  <View style={[styles.trendBadge, { backgroundColor: colors.error + '20' }]}>
                    <Text style={[styles.trendText, { color: colors.error }]}>↓</Text>
                  </View>
                )}
              </View>
              {record.notes && (
                <Text style={styles.recordNotes}>{record.notes}</Text>
              )}
            </View>
          </View>
          <View style={styles.recordRight}>
            <Text style={styles.recordCount}>{record.count}</Text>
            <Ionicons name="chevron-back" size={16} color={colors.textMuted} style={{ marginLeft: 8, opacity: swiped ? 0 : 0.5 }} />
          </View>
        </Animated.View>
      </View>
    );
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('eggs.title')}</Text>
          <Text style={styles.subtitle}>{t('eggs.subtitle')}</Text>
        </View>
        
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalEggs}</Text>
            <Text style={styles.summaryLabel}>{t('eggs.totalEggs')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{avgEggs}</Text>
            <Text style={styles.summaryLabel}>{t('eggs.avgPerDay')}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{eggRecords.length}</Text>
            <Text style={styles.summaryLabel}>{t('eggs.days')}</Text>
          </View>
        </View>
        
        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>{t('eggs.addEggs')}</Text>
        </TouchableOpacity>
        
        {/* Filter Buttons */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, filterDays === 7 && styles.filterButtonActive]}
            onPress={() => setFilterDays(7)}
          >
            <Text style={[styles.filterText, filterDays === 7 && styles.filterTextActive]}>
              7 {isSv ? 'dagar' : 'days'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterDays === 30 && styles.filterButtonActive]}
            onPress={() => setFilterDays(30)}
          >
            <Text style={[styles.filterText, filterDays === 30 && styles.filterTextActive]}>
              30 {isSv ? 'dagar' : 'days'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Records List */}
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{t('eggs.history')}</Text>
            <Text style={styles.swipeHint}>← Svep för att redigera</Text>
          </View>
          
          {sortedRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="egg-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('eggs.noEggs')}</Text>
              <Text style={styles.emptyHint}>{t('eggs.noEggsHint')}</Text>
            </View>
          ) : (
            sortedRecords.map((record) => (
              <SwipeableRecord
                key={record.id}
                record={record}
                trend={record.trend}
                onEdit={(r: EggRecord) => {
                  setEditingRecord(r);
                  setEggCount(r.count.toString());
                  setNotes(r.notes || '');
                  setSelectedDate(r.date);
                  setShowAddModal(true);
                }}
                onDelete={handleDeleteRecord}
              />
            ))
          )}
        </View>
      </ScrollView>
      
      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('eggs.addEggs')}</Text>
            
            {/* Date Selection */}
            <Text style={styles.inputLabel}>{t('eggs.selectDate')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {last7Days.map((day) => (
                <TouchableOpacity
                  key={day.date}
                  style={[
                    styles.dateButton,
                    selectedDate === day.date && styles.dateButtonActive,
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <Text style={[
                    styles.dateButtonText,
                    selectedDate === day.date && styles.dateButtonTextActive,
                  ]}>
                    {day.display}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Quick Add Buttons */}
            <Text style={styles.inputLabel}>{isSv ? 'Snabbregistrering' : 'Quick add'}</Text>
            <View style={styles.quickButtonsRow}>
              {[1, 2, 3, 5, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.quickButton}
                  onPress={() => handleQuickAdd(num)}
                  disabled={loading}
                >
                  <Text style={styles.quickButtonText}>+{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Per-Hen Selection (Optional) */}
            {hens.length > 0 && (
              <>
                <Text style={styles.inputLabel}>{isSv ? 'Vilken höna? (valfritt)' : 'Which hen? (optional)'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.henSelectScroll}>
                  <TouchableOpacity
                    style={[styles.henSelectBtn, !selectedHenId && styles.henSelectBtnActive]}
                    onPress={() => setSelectedHenId('')}
                  >
                    <Text style={styles.henSelectEmoji}>🥚</Text>
                    <Text style={[styles.henSelectText, !selectedHenId && styles.henSelectTextActive]}>
                      {isSv ? 'Okänd' : 'Unknown'}
                    </Text>
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
            
            {/* Custom Amount */}
            <Text style={styles.inputLabel}>{isSv ? 'Eget antal' : 'Custom amount'}</Text>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => {
                  const current = parseInt(eggCount) || 0;
                  if (current > 0) setEggCount((current - 1).toString());
                }}
              >
                <Ionicons name="remove" size={24} color={colors.text} />
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
                <Ionicons name="add" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Notes */}
            <Text style={styles.inputLabel}>{t('eggs.notes')}</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('eggs.notesPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            
            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setEggCount('');
                  setNotes('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!eggCount || loading) && styles.saveButtonDisabled,
                ]}
                onPress={handleAddRecord}
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
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.warning,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyHint: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warning + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordDate: {
    fontSize: 15,
    color: colors.text,
    textTransform: 'capitalize',
  },
  recordNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recordCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.warning,
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
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  dateScroll: {
    marginBottom: 20,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    marginRight: 8,
  },
  dateButtonActive: {
    backgroundColor: colors.primary,
  },
  dateButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  dateButtonTextActive: {
    color: '#FFF',
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
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
    fontSize: 16,
  },
  henSelectText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  henSelectTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  countButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countInput: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    minWidth: 80,
  },
  notesInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
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
});
