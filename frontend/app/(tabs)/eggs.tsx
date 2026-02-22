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
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function EggsScreen() {
  const { eggRecords, fetchEggRecords, addEggRecord, deleteEggRecord, loading } = useAppStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eggCount, setEggCount] = useState('');
  const [notes, setNotes] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    // Get last 30 days of records
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
      Alert.alert('Fel', 'Ange ett giltigt antal');
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
      'Ta bort',
      `Vill du ta bort ${record.count} ägg från ${format(parseISO(record.date), 'd MMMM', { locale: sv })}?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ta bort', style: 'destructive', onPress: () => deleteEggRecord(record.id) },
      ]
    );
  };
  
  // Generate last 7 days for quick date selection
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: i === 0 ? 'Idag' : i === 1 ? 'Igår' : format(date, 'EEE d', { locale: sv }),
    };
  });
  
  // Calculate totals
  const totalEggs = eggRecords.reduce((sum, r) => sum + r.count, 0);
  const avgEggs = eggRecords.length > 0 ? (totalEggs / eggRecords.length).toFixed(1) : '0';
  
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
          <Text style={styles.title}>Ägglogg</Text>
          <Text style={styles.subtitle}>Senaste 30 dagarna</Text>
        </View>
        
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalEggs}</Text>
            <Text style={styles.summaryLabel}>Totalt ägg</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{avgEggs}</Text>
            <Text style={styles.summaryLabel}>Snitt/dag</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{eggRecords.length}</Text>
            <Text style={styles.summaryLabel}>Dagar</Text>
          </View>
        </View>
        
        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>Lägg till ägg</Text>
        </TouchableOpacity>
        
        {/* Records List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Historik</Text>
          
          {eggRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="egg-outline" size={48} color="#4A4A4A" />
              <Text style={styles.emptyText}>Inga ägg registrerade ännu</Text>
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
                    <Ionicons name="egg" size={20} color="#FFD93D" />
                  </View>
                  <View>
                    <Text style={styles.recordDate}>
                      {format(parseISO(record.date), 'EEEE d MMMM', { locale: sv })}
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
            <Text style={styles.modalTitle}>Lägg till ägg</Text>
            
            {/* Date Selection */}
            <Text style={styles.inputLabel}>Välj datum</Text>
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
            <Text style={styles.inputLabel}>Antal ägg</Text>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => {
                  const current = parseInt(eggCount) || 0;
                  if (current > 0) setEggCount((current - 1).toString());
                }}
              >
                <Ionicons name="remove" size={24} color="#FFF" />
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
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            {/* Notes */}
            <Text style={styles.inputLabel}>Anteckningar (valfritt)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="T.ex. Nya värpare, sjuk höna..."
              placeholderTextColor="#666"
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
                <Text style={styles.cancelButtonText}>Avbryt</Text>
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
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD93D',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#4A4A4A',
    marginTop: 12,
    fontSize: 14,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
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
    backgroundColor: '#FFD93D22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordDate: {
    fontSize: 15,
    color: '#FFF',
    textTransform: 'capitalize',
  },
  recordNotes: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  recordCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD93D',
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
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  dateScroll: {
    marginBottom: 20,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
  },
  dateButtonActive: {
    backgroundColor: '#4CAF50',
  },
  dateButtonText: {
    color: '#8E8E93',
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
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countInput: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    minWidth: 80,
  },
  notesInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
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
