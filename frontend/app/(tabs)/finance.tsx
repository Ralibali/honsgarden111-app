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
import { useAppStore, Transaction, TransactionType, TransactionCategory } from '../../src/store/appStore';
import { format, parseISO, subDays } from 'date-fns';
import { sv } from 'date-fns/locale';

const COST_CATEGORIES: { value: TransactionCategory; label: string; icon: string }[] = [
  { value: 'feed', label: 'Foder', icon: 'nutrition' },
  { value: 'equipment', label: 'Utrustning', icon: 'construct' },
  { value: 'medicine', label: 'Medicin', icon: 'medical' },
  { value: 'other_cost', label: 'Övrigt', icon: 'ellipsis-horizontal' },
];

const SALE_CATEGORIES: { value: TransactionCategory; label: string; icon: string }[] = [
  { value: 'egg_sale', label: 'Äggförsäljning', icon: 'egg' },
  { value: 'hen_sale', label: 'Hönsförsäljning', icon: 'heart' },
  { value: 'other_income', label: 'Övriga intäkter', icon: 'ellipsis-horizontal' },
];

export default function FinanceScreen() {
  const { transactions, fetchTransactions, addTransaction, deleteTransaction, loading } = useAppStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('cost');
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const end = new Date();
    const start = subDays(end, 90);
    await fetchTransactions(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    );
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const resetModal = () => {
    setShowAddModal(false);
    setTransactionType('cost');
    setSelectedCategory(null);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setAmount('');
    setDescription('');
    setQuantity('');
  };
  
  const handleAddTransaction = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Fel', 'Ange ett giltigt belopp');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Fel', 'Välj en kategori');
      return;
    }
    
    await addTransaction({
      date: selectedDate,
      type: transactionType,
      category: selectedCategory,
      amount: amountNum,
      description: description || undefined,
      quantity: quantity ? parseInt(quantity) : undefined,
    });
    
    resetModal();
  };
  
  const handleDeleteTransaction = (trans: Transaction) => {
    const categoryLabel = [...COST_CATEGORIES, ...SALE_CATEGORIES].find(
      c => c.value === trans.category
    )?.label || trans.category;
    
    Alert.alert(
      'Ta bort',
      `Vill du ta bort ${categoryLabel} på ${trans.amount} kr?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ta bort', style: 'destructive', onPress: () => deleteTransaction(trans.id) },
      ]
    );
  };
  
  const getCategoryInfo = (category: TransactionCategory) => {
    return [...COST_CATEGORIES, ...SALE_CATEGORIES].find(c => c.value === category);
  };
  
  // Calculate totals
  const totalCosts = transactions.filter(t => t.type === 'cost').reduce((sum, t) => sum + t.amount, 0);
  const totalSales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const net = totalSales - totalCosts;
  
  // Generate last 7 days for quick date selection
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: i === 0 ? 'Idag' : i === 1 ? 'Igår' : format(date, 'EEE d', { locale: sv }),
    };
  });
  
  const categories = transactionType === 'cost' ? COST_CATEGORIES : SALE_CATEGORIES;
  
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
          <Text style={styles.title}>Ekonomi</Text>
          <Text style={styles.subtitle}>Senaste 90 dagarna</Text>
        </View>
        
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.costCard]}>
            <Ionicons name="trending-down" size={20} color="#FF6B6B" />
            <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
              {totalCosts.toFixed(0)} kr
            </Text>
            <Text style={styles.summaryLabel}>Kostnader</Text>
          </View>
          <View style={[styles.summaryCard, styles.saleCard]}>
            <Ionicons name="trending-up" size={20} color="#4CAF50" />
            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
              {totalSales.toFixed(0)} kr
            </Text>
            <Text style={styles.summaryLabel}>Försäljning</Text>
          </View>
        </View>
        
        {/* Net Result */}
        <View style={styles.netCard}>
          <Text style={styles.netLabel}>Nettoresultat</Text>
          <Text style={[
            styles.netValue,
            { color: net >= 0 ? '#4CAF50' : '#FF6B6B' }
          ]}>
            {net >= 0 ? '+' : ''}{net.toFixed(0)} kr
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.costActionButton]}
            onPress={() => {
              setTransactionType('cost');
              setSelectedCategory(null);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="remove-circle" size={20} color="#FF6B6B" />
            <Text style={styles.actionButtonText}>Lägg till kostnad</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.saleActionButton]}
            onPress={() => {
              setTransactionType('sale');
              setSelectedCategory(null);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add-circle" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Lägg till försäljning</Text>
          </TouchableOpacity>
        </View>
        
        {/* Transactions List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Transaktioner</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#4A4A4A" />
              <Text style={styles.emptyText}>Inga transaktioner ännu</Text>
            </View>
          ) : (
            transactions.map((trans) => {
              const catInfo = getCategoryInfo(trans.category);
              return (
                <TouchableOpacity
                  key={trans.id}
                  style={styles.transactionItem}
                  onLongPress={() => handleDeleteTransaction(trans)}
                >
                  <View style={styles.transactionLeft}>
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: trans.type === 'cost' ? '#FF6B6B22' : '#4CAF5022' }
                    ]}>
                      <Ionicons
                        name={catInfo?.icon as any || 'cash'}
                        size={18}
                        color={trans.type === 'cost' ? '#FF6B6B' : '#4CAF50'}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionCategory}>{catInfo?.label || trans.category}</Text>
                      <Text style={styles.transactionDate}>
                        {format(parseISO(trans.date), 'd MMM yyyy', { locale: sv })}
                      </Text>
                      {trans.description && (
                        <Text style={styles.transactionDesc}>{trans.description}</Text>
                      )}
                    </View>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: trans.type === 'cost' ? '#FF6B6B' : '#4CAF50' }
                  ]}>
                    {trans.type === 'cost' ? '-' : '+'}{trans.amount.toFixed(0)} kr
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
      
      {/* Add Transaction Modal */}
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
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {transactionType === 'cost' ? 'Lägg till kostnad' : 'Lägg till försäljning'}
              </Text>
              
              {/* Category Selection */}
              <Text style={styles.inputLabel}>Kategori</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      selectedCategory === cat.value && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.value)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={24}
                      color={selectedCategory === cat.value ? '#FFF' : '#8E8E93'}
                    />
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === cat.value && styles.categoryButtonTextActive,
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Date Selection */}
              <Text style={styles.inputLabel}>Datum</Text>
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
              
              {/* Amount */}
              <Text style={styles.inputLabel}>Belopp (kr)</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#666"
              />
              
              {/* Quantity (for egg sales) */}
              {selectedCategory === 'egg_sale' && (
                <>
                  <Text style={styles.inputLabel}>Antal ägg (valfritt)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                    placeholder="T.ex. 30"
                    placeholderTextColor="#666"
                  />
                </>
              )}
              
              {/* Description */}
              <Text style={styles.inputLabel}>Beskrivning (valfritt)</Text>
              <TextInput
                style={styles.textInput}
                value={description}
                onChangeText={setDescription}
                placeholder="T.ex. Fodersäck 25kg"
                placeholderTextColor="#666"
              />
              
              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={resetModal}>
                  <Text style={styles.cancelButtonText}>Avbryt</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!amount || !selectedCategory || loading) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleAddTransaction}
                  disabled={!amount || !selectedCategory || loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Sparar...' : 'Spara'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  costCard: {
    borderColor: '#FF6B6B33',
    borderWidth: 1,
  },
  saleCard: {
    borderColor: '#4CAF5033',
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  netCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  netLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  netValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  costActionButton: {
    borderColor: '#FF6B6B33',
    borderWidth: 1,
  },
  saleActionButton: {
    borderColor: '#4CAF5033',
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
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
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
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
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
  },
  categoryButtonText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#FFF',
  },
  dateScroll: {
    marginBottom: 8,
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
  amountInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
