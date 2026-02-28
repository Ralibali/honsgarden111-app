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
import { useThemeStore, ThemeColors } from '../../src/store/themeStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { format, parseISO, subDays } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import i18n, { formatCurrency } from '../../src/i18n';

export default function FinanceScreen() {
  const { transactions, fetchTransactions, addTransaction, deleteTransaction, loading, summaryStats, fetchSummaryStats } = useAppStore();
  const { colors, isDark } = useThemeStore();
  const { isPremium } = usePremiumStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('cost');
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  
  const t = i18n.t.bind(i18n);
  const getLocale = () => i18n.locale.startsWith('sv') ? sv : enUS;
  const isSv = i18n.locale.startsWith('sv');
  
  const COST_CATEGORIES: { value: TransactionCategory; label: string; icon: string }[] = [
    { value: 'feed', label: t('finance.categories.feed'), icon: 'nutrition' },
    { value: 'equipment', label: t('finance.categories.equipment'), icon: 'construct' },
    { value: 'medicine', label: t('finance.categories.medicine'), icon: 'medical' },
    { value: 'other_cost', label: t('finance.categories.other_cost'), icon: 'ellipsis-horizontal' },
  ];
  
  const SALE_CATEGORIES: { value: TransactionCategory; label: string; icon: string }[] = [
    { value: 'egg_sale', label: t('finance.categories.egg_sale'), icon: 'egg' },
    { value: 'hen_sale', label: t('finance.categories.hen_sale'), icon: 'heart' },
    { value: 'other_income', label: t('finance.categories.other_income'), icon: 'ellipsis-horizontal' },
  ];
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const end = new Date();
    const start = subDays(end, isPremium ? 90 : 30);
    await Promise.all([
      fetchTransactions(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      ),
      fetchSummaryStats()
    ]);
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
      Alert.alert(t('common.error'), t('errors.invalidInput'));
      return;
    }
    if (!selectedCategory) {
      Alert.alert(t('common.error'), isSv ? 'Välj en kategori' : 'Select a category');
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
      t('common.delete'),
      t('finance.deleteConfirm', { category: categoryLabel, amount: trans.amount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteTransaction(trans.id) },
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
  
  // Get total eggs from summaryStats (all-time or current period)
  const totalEggsProduced = summaryStats?.total_eggs_all_time || summaryStats?.total_eggs || 0;
  
  // Calculate advanced insights using TOTAL EGGS PRODUCED (not just sold eggs with quantity)
  const eggSales = transactions.filter(t => t.category === 'egg_sale');
  const totalEggsSold = eggSales.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const totalEggRevenue = eggSales.reduce((sum, t) => sum + t.amount, 0);
  
  // Revenue per egg: Use total sales divided by total eggs produced
  // This gives a more realistic picture of average revenue per egg
  const avgRevenuePerEgg = totalEggsProduced > 0 ? totalSales / totalEggsProduced : 0;
  
  // Break-even price per egg: Total costs divided by total eggs produced
  // This shows what price per egg you need to break even
  const breakEvenPricePerEgg = totalEggsProduced > 0 ? totalCosts / totalEggsProduced : 0;
  
  // Most costly category this month
  const costsByCategory = transactions
    .filter(t => t.type === 'cost')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
  
  const mostCostlyCategory = Object.entries(costsByCategory)
    .sort((a, b) => b[1] - a[1])[0];
  
  // Generate last 7 days for quick date selection
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: i === 0 ? t('eggs.today') : i === 1 ? t('eggs.yesterday') : format(date, 'EEE d', { locale: getLocale() }),
    };
  });
  
  const categories = transactionType === 'cost' ? COST_CATEGORIES : SALE_CATEGORIES;
  
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
          <Text style={styles.title}>{t('finance.title')}</Text>
          <Text style={styles.subtitle}>
            {isPremium ? t('finance.subtitle') : t('finance.subtitleLimited')}
          </Text>
        </View>
        
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.costCard]}>
            <Ionicons name="trending-down" size={20} color={colors.error} />
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {formatCurrency(totalCosts)}
            </Text>
            <Text style={styles.summaryLabel}>{t('finance.costs')}</Text>
          </View>
          <View style={[styles.summaryCard, styles.saleCard]}>
            <Ionicons name="trending-up" size={20} color={colors.success} />
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(totalSales)}
            </Text>
            <Text style={styles.summaryLabel}>{t('finance.sales')}</Text>
          </View>
        </View>
        
        {/* Net Result */}
        <View style={[
          styles.netCard,
          { backgroundColor: net >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' },
          { borderColor: net >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }
        ]}>
          <View style={styles.netHeader}>
            <Text style={styles.netLabel}>{t('finance.netResult')}</Text>
            {net >= 0 ? (
              <View style={styles.profitBadge}>
                <Ionicons name="trending-up" size={14} color="#22c55e" />
                <Text style={styles.profitBadgeText}>{isSv ? 'Vinst' : 'Profit'}</Text>
              </View>
            ) : (
              <View style={styles.lossBadge}>
                <Ionicons name="trending-down" size={14} color="#ef4444" />
                <Text style={styles.lossBadgeText}>{isSv ? 'Förlust' : 'Loss'}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.netValue,
            { color: net >= 0 ? colors.success : colors.error }
          ]}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </Text>
        </View>
        
        {/* Economy Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>{isSv ? 'Ekonomiska insikter' : 'Economy Insights'}</Text>
          
          <View style={styles.insightRow}>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>{isSv ? 'Intäkt per ägg' : 'Revenue per egg'}</Text>
              <Text style={styles.insightValue}>
                {avgRevenuePerEgg > 0 ? formatCurrency(avgRevenuePerEgg) : '–'}
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightLabel}>{isSv ? 'Break-even pris/ägg' : 'Break-even price/egg'}</Text>
              <Text style={[
                styles.insightValue,
                breakEvenPricePerEgg > avgRevenuePerEgg && avgRevenuePerEgg > 0 
                  ? { color: colors.error } 
                  : { color: colors.success }
              ]}>
                {breakEvenPricePerEgg > 0 ? formatCurrency(breakEvenPricePerEgg) : '–'}
              </Text>
            </View>
          </View>
          
          {mostCostlyCategory && (
            <View style={styles.costlyCategoryRow}>
              <Text style={styles.insightLabel}>{isSv ? 'Största kostnadskategori' : 'Most costly category'}</Text>
              <View style={styles.costlyCategoryValue}>
                <Text style={styles.costlyCategoryName}>
                  {getCategoryInfo(mostCostlyCategory[0] as TransactionCategory)?.label || mostCostlyCategory[0]}
                </Text>
                <Text style={[styles.costlyCategoryAmount, { color: colors.error }]}>
                  {formatCurrency(mostCostlyCategory[1])}
                </Text>
              </View>
            </View>
          )}
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
            <Ionicons name="remove-circle" size={20} color={colors.error} />
            <Text style={styles.actionButtonText}>{t('finance.addCost')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.saleActionButton]}
            onPress={() => {
              setTransactionType('sale');
              setSelectedCategory(null);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add-circle" size={20} color={colors.success} />
            <Text style={styles.actionButtonText}>{t('finance.addSale')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Transactions List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>{t('finance.transactions')}</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('finance.noTransactions')}</Text>
              <Text style={styles.emptyHint}>{t('finance.noTransactionsHint')}</Text>
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
                      { backgroundColor: trans.type === 'cost' ? colors.error + '22' : colors.success + '22' }
                    ]}>
                      <Ionicons
                        name={catInfo?.icon as any || 'cash'}
                        size={18}
                        color={trans.type === 'cost' ? colors.error : colors.success}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionCategory}>{catInfo?.label || trans.category}</Text>
                      <Text style={styles.transactionDate}>
                        {format(parseISO(trans.date), 'd MMM yyyy', { locale: getLocale() })}
                      </Text>
                      {trans.description && (
                        <Text style={styles.transactionDesc}>{trans.description}</Text>
                      )}
                    </View>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: trans.type === 'cost' ? colors.error : colors.success }
                  ]}>
                    {trans.type === 'cost' ? '-' : '+'}{formatCurrency(trans.amount)}
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
                {transactionType === 'cost' ? t('finance.addCost') : t('finance.addSale')}
              </Text>
              
              {/* Category Selection */}
              <Text style={styles.inputLabel}>{t('finance.category')}</Text>
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
                      color={selectedCategory === cat.value ? '#FFF' : colors.textSecondary}
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
              
              {/* Amount */}
              <Text style={styles.inputLabel}>{t('finance.amount')}</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              
              {/* Quantity (for egg sales) */}
              {selectedCategory === 'egg_sale' && (
                <>
                  <Text style={styles.inputLabel}>{t('finance.eggQuantity')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                    placeholder={isSv ? 'T.ex. 30' : 'E.g. 30'}
                    placeholderTextColor={colors.textMuted}
                  />
                </>
              )}
              
              {/* Description */}
              <Text style={styles.inputLabel}>{t('finance.description')}</Text>
              <TextInput
                style={styles.textInput}
                value={description}
                onChangeText={setDescription}
                placeholder={t('finance.descriptionPlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
              
              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={resetModal}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
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
                    {loading ? t('common.loading') : t('common.save')}
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
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  costCard: {
    borderColor: colors.error + '33',
    borderWidth: 1,
  },
  saleCard: {
    borderColor: colors.success + '33',
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  netCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  netHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  netLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  netValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  profitBadgeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  lossBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lossBadgeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  insightsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  insightItem: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
  },
  insightLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  costlyCategoryRow: {
    backgroundColor: colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
  },
  costlyCategoryValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  costlyCategoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  costlyCategoryAmount: {
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  costActionButton: {
    borderColor: colors.error + '33',
    borderWidth: 1,
  },
  saleActionButton: {
    borderColor: colors.success + '33',
    borderWidth: 1,
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
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
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionDesc: {
    fontSize: 12,
    color: colors.textMuted,
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
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryButtonText: {
    color: colors.textSecondary,
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
  amountInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
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
