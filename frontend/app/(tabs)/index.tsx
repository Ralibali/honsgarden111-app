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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function HomeScreen() {
  const {
    coopSettings,
    todayStats,
    summaryStats,
    fetchCoopSettings,
    fetchTodayStats,
    fetchSummaryStats,
    addEggRecord,
    loading,
  } = useAppStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [eggCount, setEggCount] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);
  
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
  
  const handleQuickAddEggs = async () => {
    const count = parseInt(eggCount);
    if (isNaN(count) || count < 0) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    await addEggRecord(today, count);
    setEggCount('');
    setShowQuickAdd(false);
  };
  
  const today = new Date();
  const dateString = format(today, 'EEEE d MMMM yyyy', { locale: sv });
  
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
          <Text style={styles.date}>{dateString}</Text>
        </View>
        
        {/* Quick Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.henCard]}>
            <Ionicons name="heart" size={28} color="#FF6B6B" />
            <Text style={styles.statValue}>{todayStats?.hen_count || 0}</Text>
            <Text style={styles.statLabel}>Hönor</Text>
          </View>
          
          <View style={[styles.statCard, styles.eggCard]}>
            <Ionicons name="egg" size={28} color="#FFD93D" />
            <Text style={styles.statValue}>{todayStats?.egg_count || 0}</Text>
            <Text style={styles.statLabel}>Ägg idag</Text>
          </View>
        </View>
        
        {/* Quick Add Eggs Button */}
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={() => setShowQuickAdd(true)}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.quickAddText}>Registrera ägg idag</Text>
        </TouchableOpacity>
        
        {/* Monthly Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Denna månad</Text>
          <View style={styles.monthlyStats}>
            <View style={styles.monthStat}>
              <Text style={styles.monthValue}>{summaryStats?.this_month.eggs || 0}</Text>
              <Text style={styles.monthLabel}>Ägg</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStat}>
              <Text style={[styles.monthValue, { color: '#FF6B6B' }]}>
                {summaryStats?.this_month.costs.toFixed(0) || 0} kr
              </Text>
              <Text style={styles.monthLabel}>Kostnader</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStat}>
              <Text style={[styles.monthValue, { color: '#4CAF50' }]}>
                {summaryStats?.this_month.sales.toFixed(0) || 0} kr
              </Text>
              <Text style={styles.monthLabel}>Försäljning</Text>
            </View>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Netto:</Text>
            <Text style={[
              styles.netValue,
              { color: (summaryStats?.this_month.net || 0) >= 0 ? '#4CAF50' : '#FF6B6B' }
            ]}>
              {(summaryStats?.this_month.net || 0) >= 0 ? '+' : ''}
              {summaryStats?.this_month.net.toFixed(0) || 0} kr
            </Text>
          </View>
        </View>
        
        {/* All-time Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Totalt</Text>
          <View style={styles.totalRow}>
            <View style={styles.totalItem}>
              <Ionicons name="egg-outline" size={20} color="#FFD93D" />
              <Text style={styles.totalValue}>{summaryStats?.total_eggs_all_time || 0}</Text>
              <Text style={styles.totalLabel}>ägg</Text>
            </View>
            <View style={styles.totalItem}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
              <Text style={styles.totalValue}>{summaryStats?.total_sales_all_time.toFixed(0) || 0}</Text>
              <Text style={styles.totalLabel}>kr intäkter</Text>
            </View>
            <View style={styles.totalItem}>
              <Ionicons name="trending-down" size={20} color="#FF6B6B" />
              <Text style={styles.totalValue}>{summaryStats?.total_costs_all_time.toFixed(0) || 0}</Text>
              <Text style={styles.totalLabel}>kr kostnader</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
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
            <Text style={styles.modalTitle}>Registrera ägg idag</Text>
            <Text style={styles.modalDate}>{dateString}</Text>
            
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
                <Text style={styles.cancelButtonText}>Avbryt</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!eggCount || loading) && styles.saveButtonDisabled,
                ]}
                onPress={handleQuickAddEggs}
                disabled={!eggCount || loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Sparar...' : 'Spara'}
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
  date: {
    fontSize: 14,
    color: '#8E8E93',
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
    fontSize: 24,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
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
