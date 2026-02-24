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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useThemeStore, ThemeColors } from '../src/store/themeStore';
import { usePremiumStore } from '../src/store/premiumStore';
import { format, subDays } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import i18n from '../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type FeedType = 'layer_feed' | 'grower_feed' | 'starter_feed' | 'scratch_grain' | 'treats' | 'supplements' | 'other';

interface FeedRecord {
  id: string;
  date: string;
  feed_type: FeedType;
  amount_kg: number;
  cost?: number;
  is_purchase: boolean;
  brand?: string;
  notes?: string;
}

interface FeedInventory {
  feed_type: FeedType;
  current_stock_kg: number;
  low_stock_threshold_kg: number;
  brand?: string;
}

interface FeedStats {
  total_consumed_kg: number;
  total_purchased_kg: number;
  total_cost: number;
  daily_consumption_avg_kg: number;
  feed_per_hen_per_day_g: number;
  hen_count: number;
}

const FEED_TYPES: { value: FeedType; label: string; labelEn: string; icon: string }[] = [
  { value: 'layer_feed', label: 'Värpfoder', labelEn: 'Layer Feed', icon: 'egg' },
  { value: 'grower_feed', label: 'Tillväxtfoder', labelEn: 'Grower Feed', icon: 'trending-up' },
  { value: 'starter_feed', label: 'Startfoder', labelEn: 'Starter Feed', icon: 'leaf' },
  { value: 'scratch_grain', label: 'Korn/vete', labelEn: 'Scratch Grain', icon: 'nutrition' },
  { value: 'treats', label: 'Godis', labelEn: 'Treats', icon: 'heart' },
  { value: 'supplements', label: 'Tillskott', labelEn: 'Supplements', icon: 'fitness' },
  { value: 'other', label: 'Övrigt', labelEn: 'Other', icon: 'ellipsis-horizontal' },
];

export default function FeedScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { isPremium } = usePremiumStore();
  const styles = createStyles(colors);
  
  const isSv = i18n.locale.startsWith('sv');
  const getLocale = () => isSv ? sv : enUS;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [inventory, setInventory] = useState<FeedInventory[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isPurchase, setIsPurchase] = useState(false);
  const [selectedFeedType, setSelectedFeedType] = useState<FeedType | null>(null);
  const [amountKg, setAmountKg] = useState('');
  const [cost, setCost] = useState('');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Show premium paywall if not premium
  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.backText}>{isSv ? 'Tillbaka' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.premiumRequired}>
          <Text style={styles.premiumEmoji}>🌾</Text>
          <Text style={styles.premiumTitle}>{isSv ? 'Premium-funktion' : 'Premium Feature'}</Text>
          <Text style={styles.premiumText}>
            {isSv 
              ? 'Foderhantering hjälper dig hålla koll på foderlager, förbrukning och kostnader.'
              : 'Feed management helps you track feed inventory, consumption and costs.'
            }
          </Text>
          <TouchableOpacity 
            style={styles.upgradeBtn}
            onPress={() => router.push('/paywall')}
          >
            <Text style={styles.upgradeBtnText}>🌟 {isSv ? 'Uppgradera till Premium' : 'Upgrade to Premium'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const loadData = useCallback(async () => {
    try {
      const [recordsRes, inventoryRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/feed?limit=50`, { credentials: 'include' }),
        fetch(`${API_URL}/api/feed/inventory`, { credentials: 'include' }),
        fetch(`${API_URL}/api/feed/statistics?days=30`, { credentials: 'include' }),
      ]);
      
      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setRecords(data);
      }
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        setInventory(data.inventory || []);
        setLowStockAlerts(data.low_stock_alerts || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load feed data:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const resetModal = () => {
    setShowAddModal(false);
    setIsPurchase(false);
    setSelectedFeedType(null);
    setAmountKg('');
    setCost('');
    setBrand('');
    setNotes('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };
  
  const handleAddRecord = async () => {
    const amount = parseFloat(amountKg);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Ange en giltig mängd' : 'Enter a valid amount');
      return;
    }
    if (!selectedFeedType) {
      Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Välj fodertyp' : 'Select feed type');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedDate,
          feed_type: selectedFeedType,
          amount_kg: amount,
          cost: cost ? parseFloat(cost) : undefined,
          is_purchase: isPurchase,
          brand: brand || undefined,
          notes: notes || undefined,
        }),
      });
      
      if (res.ok) {
        resetModal();
        loadData();
      } else {
        Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Kunde inte spara' : 'Could not save');
      }
    } catch (error) {
      console.error('Failed to add feed record:', error);
    }
  };
  
  const handleDeleteRecord = (recordId: string) => {
    Alert.alert(
      isSv ? 'Ta bort?' : 'Delete?',
      isSv ? 'Vill du ta bort denna post?' : 'Do you want to delete this record?',
      [
        { text: isSv ? 'Avbryt' : 'Cancel', style: 'cancel' },
        {
          text: isSv ? 'Ta bort' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/feed/${recordId}`, {
                method: 'DELETE',
                credentials: 'include',
              });
              loadData();
            } catch (error) {
              console.error('Failed to delete:', error);
            }
          },
        },
      ]
    );
  };
  
  const getFeedTypeLabel = (type: FeedType) => {
    const ft = FEED_TYPES.find(f => f.value === type);
    return ft ? (isSv ? ft.label : ft.labelEn) : type;
  };
  
  const getFeedTypeIcon = (type: FeedType) => {
    const ft = FEED_TYPES.find(f => f.value === type);
    return ft?.icon || 'nutrition';
  };
  
  // Generate last 7 days for date picker
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: format(date, 'EEE d', { locale: getLocale() }),
    };
  });
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isSv ? 'Foderhantering' : 'Feed Management'}</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>⚠️ {isSv ? 'Lågt lager' : 'Low Stock'}</Text>
            {lowStockAlerts.map((alert, i) => (
              <Text key={i} style={styles.alertText}>
                {getFeedTypeLabel(alert.feed_type)}: {alert.current_stock_kg.toFixed(1)} kg kvar
              </Text>
            ))}
          </View>
        )}
        
        {/* Statistics Card */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>📊 {isSv ? 'Senaste 30 dagarna' : 'Last 30 days'}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.daily_consumption_avg_kg.toFixed(2)}</Text>
                <Text style={styles.statLabel}>{isSv ? 'kg/dag' : 'kg/day'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.feed_per_hen_per_day_g}</Text>
                <Text style={styles.statLabel}>{isSv ? 'g/höna/dag' : 'g/hen/day'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_cost.toFixed(0)}</Text>
                <Text style={styles.statLabel}>{isSv ? 'kr totalt' : 'SEK total'}</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Inventory */}
        {inventory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 {isSv ? 'Lager' : 'Inventory'}</Text>
            {inventory.map((item) => (
              <View key={item.feed_type} style={styles.inventoryItem}>
                <Ionicons name={getFeedTypeIcon(item.feed_type) as any} size={20} color={colors.primary} />
                <Text style={styles.inventoryName}>{getFeedTypeLabel(item.feed_type)}</Text>
                <Text style={[
                  styles.inventoryAmount,
                  item.current_stock_kg <= item.low_stock_threshold_kg && styles.inventoryLow
                ]}>
                  {item.current_stock_kg.toFixed(1)} kg
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Recent Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 {isSv ? 'Senaste registreringar' : 'Recent Records'}</Text>
          {records.length === 0 ? (
            <Text style={styles.emptyText}>
              {isSv ? 'Inga registreringar ännu' : 'No records yet'}
            </Text>
          ) : (
            records.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordItem}
                onLongPress={() => handleDeleteRecord(record.id)}
              >
                <View style={[
                  styles.recordIcon,
                  record.is_purchase ? styles.purchaseIcon : styles.consumeIcon
                ]}>
                  <Ionicons 
                    name={record.is_purchase ? 'cart' : 'restaurant'} 
                    size={16} 
                    color="#FFF" 
                  />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordType}>{getFeedTypeLabel(record.feed_type)}</Text>
                  <Text style={styles.recordDate}>
                    {format(new Date(record.date), 'd MMM', { locale: getLocale() })}
                    {record.brand && ` • ${record.brand}`}
                  </Text>
                </View>
                <View style={styles.recordRight}>
                  <Text style={styles.recordAmount}>{record.amount_kg} kg</Text>
                  {record.cost && (
                    <Text style={styles.recordCost}>{record.cost} kr</Text>
                  )}
                </View>
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
        onRequestClose={resetModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isSv ? 'Registrera foder' : 'Record Feed'}
            </Text>
            
            {/* Type Toggle */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeBtn, !isPurchase && styles.typeBtnActive]}
                onPress={() => setIsPurchase(false)}
              >
                <Text style={[styles.typeBtnText, !isPurchase && styles.typeBtnTextActive]}>
                  {isSv ? '🍽️ Förbrukning' : '🍽️ Consumption'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, isPurchase && styles.typeBtnActive]}
                onPress={() => setIsPurchase(true)}
              >
                <Text style={[styles.typeBtnText, isPurchase && styles.typeBtnTextActive]}>
                  {isSv ? '🛒 Inköp' : '🛒 Purchase'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Feed Type */}
            <Text style={styles.inputLabel}>{isSv ? 'Fodertyp' : 'Feed Type'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {FEED_TYPES.map((ft) => (
                <TouchableOpacity
                  key={ft.value}
                  style={[styles.feedTypeBtn, selectedFeedType === ft.value && styles.feedTypeBtnActive]}
                  onPress={() => setSelectedFeedType(ft.value)}
                >
                  <Ionicons name={ft.icon as any} size={18} color={selectedFeedType === ft.value ? '#FFF' : colors.textSecondary} />
                  <Text style={[styles.feedTypeBtnText, selectedFeedType === ft.value && styles.feedTypeBtnTextActive]}>
                    {isSv ? ft.label : ft.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Date */}
            <Text style={styles.inputLabel}>{isSv ? 'Datum' : 'Date'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {last7Days.map((day) => (
                <TouchableOpacity
                  key={day.date}
                  style={[styles.dateBtn, selectedDate === day.date && styles.dateBtnActive]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <Text style={[styles.dateBtnText, selectedDate === day.date && styles.dateBtnTextActive]}>
                    {day.display}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Amount */}
            <Text style={styles.inputLabel}>{isSv ? 'Mängd (kg)' : 'Amount (kg)'}</Text>
            <TextInput
              style={styles.input}
              value={amountKg}
              onChangeText={setAmountKg}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={colors.textMuted}
            />
            
            {/* Cost (only for purchases) */}
            {isPurchase && (
              <>
                <Text style={styles.inputLabel}>{isSv ? 'Kostnad (kr)' : 'Cost (SEK)'}</Text>
                <TextInput
                  style={styles.input}
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                
                <Text style={styles.inputLabel}>{isSv ? 'Märke (valfritt)' : 'Brand (optional)'}</Text>
                <TextInput
                  style={styles.input}
                  value={brand}
                  onChangeText={setBrand}
                  placeholder={isSv ? 'T.ex. Granngården' : 'E.g. Purina'}
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}
            
            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
                <Text style={styles.cancelBtnText}>{isSv ? 'Avbryt' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddRecord}>
                <Text style={styles.saveBtnText}>{isSv ? 'Spara' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: 'bold', color: colors.text, marginLeft: 8 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  alertCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  alertTitle: { fontSize: 16, fontWeight: '600', color: '#92400e', marginBottom: 8 },
  alertText: { fontSize: 14, color: '#78350f' },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  section: { margin: 16, marginTop: 0 },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  inventoryName: { flex: 1, fontSize: 15, color: colors.text },
  inventoryAmount: { fontSize: 15, fontWeight: '600', color: colors.success },
  inventoryLow: { color: colors.error },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  recordIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  purchaseIcon: { backgroundColor: colors.primary },
  consumeIcon: { backgroundColor: colors.warning },
  recordInfo: { flex: 1 },
  recordType: { fontSize: 15, fontWeight: '500', color: colors.text },
  recordDate: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  recordRight: { alignItems: 'flex-end' },
  recordAmount: { fontSize: 16, fontWeight: '600', color: colors.text },
  recordCost: { fontSize: 13, color: colors.success, marginTop: 2 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 20 },
  typeToggle: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: colors.primary },
  typeBtnText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  typeBtnTextActive: { color: '#FFF' },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 8 },
  typeScroll: { marginBottom: 16 },
  feedTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    marginRight: 8,
  },
  feedTypeBtnActive: { backgroundColor: colors.primary },
  feedTypeBtnText: { fontSize: 13, color: colors.textSecondary },
  feedTypeBtnTextActive: { color: '#FFF' },
  dateScroll: { marginBottom: 16 },
  dateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    marginRight: 8,
  },
  dateBtnActive: { backgroundColor: colors.primary },
  dateBtnText: { fontSize: 14, color: colors.textSecondary, textTransform: 'capitalize' },
  dateBtnTextActive: { color: '#FFF' },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  saveBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
