import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, EggRecord } from '../../src/store/appStore';
import { useThemeStore, ThemeColors } from '../../src/store/themeStore';
import { format, parseISO, subDays } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import i18n from '../../src/i18n';

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
  
  const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  
  const t = i18n.t.bind(i18n);
  const getLocale = () => i18n.locale.startsWith('sv') ? sv : enUS;
  const isSv = i18n.locale.startsWith('sv');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const end = new Date();
    const start = subDays(end, 30);
    await fetchEggRecords(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    );
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
    
    await addEggRecord(selectedDate, count, notes || undefined);
    setShowAddModal(false);
    setEggCount('');
    setNotes('');
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
        
        {/* Records List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>{t('eggs.history')}</Text>
          
          {eggRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="egg-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('eggs.noEggs')}</Text>
              <Text style={styles.emptyHint}>{t('eggs.noEggsHint')}</Text>
            </View>
          ) : (
            eggRecords.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordItem}
                onLongPress={() => handleDeleteRecord(record)}
              >
                <View style={styles.recordLeft}>
                  <View style={styles.recordIcon}>
                    <Ionicons name="egg" size={20} color={colors.warning} />
                  </View>
                  <View>
                    <Text style={styles.recordDate}>
                      {format(parseISO(record.date), 'EEEE d MMMM', { locale: getLocale() })}
                    </Text>
                    {record.notes && (
                      <Text style={styles.recordNotes}>{record.notes}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.recordCount}>{record.count}</Text>
              </TouchableOpacity>
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
            
            {/* Egg Count */}
            <Text style={styles.inputLabel}>{t('eggs.eggCount')}</Text>
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
