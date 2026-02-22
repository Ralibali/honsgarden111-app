import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { useRouter } from 'expo-router';
import i18n, { formatCurrency } from '../../src/i18n';
import { format, getDaysInMonth } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type ViewMode = 'month' | 'year';

interface MonthStats {
  year: number;
  month: number;
  total_eggs: number;
  avg_eggs_per_day: number;
  total_costs: number;
  total_sales: number;
  net: number;
  eggs_per_hen: number | null;
  daily_breakdown: Array<{
    date: string;
    eggs: number;
    costs: number;
    sales: number;
  }>;
}

interface YearStats {
  year: number;
  total_eggs: number;
  avg_eggs_per_day: number;
  total_costs: number;
  total_sales: number;
  net: number;
  monthly_breakdown: Array<{
    month: number;
    eggs: number;
    costs: number;
    sales: number;
    net: number;
  }>;
}

export default function StatisticsScreen() {
  const { coopSettings, fetchCoopSettings } = useAppStore();
  const { isPremium } = usePremiumStore();
  const router = useRouter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [prevMonthStats, setPrevMonthStats] = useState<MonthStats | null>(null);
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  const t = i18n.t.bind(i18n);
  const getLocale = () => i18n.locale.startsWith('sv') ? sv : enUS;
  
  useEffect(() => {
    fetchCoopSettings();
    loadStats();
  }, [viewMode, selectedYear, selectedMonth]);
  
  const loadStats = async () => {
    setLoading(true);
    try {
      if (viewMode === 'month') {
        // Load current month
        const response = await fetch(`${API_URL}/api/statistics/month/${selectedYear}/${selectedMonth}`);
        if (response.ok) {
          const data = await response.json();
          setMonthStats(data);
        }
        
        // Load previous month for comparison
        let prevYear = selectedYear;
        let prevMonth = selectedMonth - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const prevResponse = await fetch(`${API_URL}/api/statistics/month/${prevYear}/${prevMonth}`);
        if (prevResponse.ok) {
          const prevData = await prevResponse.json();
          setPrevMonthStats(prevData);
        }
      } else {
        const response = await fetch(`${API_URL}/api/statistics/year/${selectedYear}`);
        if (response.ok) {
          const data = await response.json();
          setYearStats(data);
        }
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
    setLoading(false);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };
  
  const goToPreviousPeriod = () => {
    if (viewMode === 'month') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };
  
  const goToNextPeriod = () => {
    const now = new Date();
    if (viewMode === 'month') {
      if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) {
        return;
      }
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      if (selectedYear < now.getFullYear()) {
        setSelectedYear(selectedYear + 1);
      }
    }
  };
  
  const getMonthName = (month: number) => {
    const date = new Date(2024, month - 1, 1);
    return format(date, 'MMMM', { locale: getLocale() });
  };
  
  // Calculate trends
  const calculateTrend = (current: number, previous: number): { value: number; direction: 'up' | 'down' | 'same' } => {
    if (previous === 0) return { value: 0, direction: 'same' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change)),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
    };
  };
  
  // Calculate forecast
  const calculateForecast = (): number | null => {
    if (!monthStats || monthStats.avg_eggs_per_day === 0) return null;
    const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth - 1));
    return Math.round(monthStats.avg_eggs_per_day * daysInMonth);
  };
  
  const renderTrendBadge = (current: number, previous: number) => {
    const trend = calculateTrend(current, previous);
    if (trend.direction === 'same' || trend.value === 0) return null;
    
    return (
      <View style={[
        styles.trendBadge,
        trend.direction === 'up' ? styles.trendUp : styles.trendDown
      ]}>
        <Ionicons
          name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'}
          size={12}
          color={trend.direction === 'up' ? '#4CAF50' : '#FF6B6B'}
        />
        <Text style={[
          styles.trendText,
          { color: trend.direction === 'up' ? '#4CAF50' : '#FF6B6B' }
        ]}>
          {trend.value}%
        </Text>
      </View>
    );
  };
  
  const renderMonthView = () => {
    if (!monthStats) return null;
    
    const maxEggs = Math.max(...(monthStats.daily_breakdown.map(d => d.eggs) || [0]), 1);
    const forecast = calculateForecast();
    
    return (
      <>
        {/* Summary Cards with Trends */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={styles.statHeader}>
              <Ionicons name="egg" size={24} color="#FFD93D" />
              {prevMonthStats && renderTrendBadge(monthStats.total_eggs, prevMonthStats.total_eggs)}
            </View>
            <Text style={styles.statValue}>{monthStats.total_eggs}</Text>
            <Text style={styles.statLabel}>{t('statistics.totalEggs')}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statHeader}>
              <Ionicons name="analytics" size={24} color="#4CAF50" />
              {prevMonthStats && renderTrendBadge(monthStats.avg_eggs_per_day, prevMonthStats.avg_eggs_per_day)}
            </View>
            <Text style={styles.statValue}>{monthStats.avg_eggs_per_day}</Text>
            <Text style={styles.statLabel}>{t('statistics.avgPerDay')}</Text>
          </View>
          {monthStats.eggs_per_hen && (
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Ionicons name="heart" size={24} color="#FF6B6B" />
                {prevMonthStats?.eggs_per_hen && renderTrendBadge(monthStats.eggs_per_hen, prevMonthStats.eggs_per_hen)}
              </View>
              <Text style={styles.statValue}>{monthStats.eggs_per_hen}</Text>
              <Text style={styles.statLabel}>{t('statistics.eggsPerHen')}</Text>
            </View>
          )}
        </View>
        
        {/* Forecast */}
        {forecast && (
          <View style={styles.forecastCard}>
            <Ionicons name="bulb" size={20} color="#FFD93D" />
            <Text style={styles.forecastText}>
              {t('statistics.forecast')}: <Text style={styles.forecastValue}>~{forecast} {t('home.totalEggs')}</Text>
            </Text>
          </View>
        )}
        
        {/* Financial Summary */}
        <View style={styles.financeCard}>
          <Text style={styles.cardTitle}>{t('statistics.economy')}</Text>
          <View style={styles.financeRow}>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.costLabel')}</Text>
              <Text style={[styles.financeValue, { color: '#FF6B6B' }]}>
                -{formatCurrency(monthStats.total_costs)}
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.salesLabel')}</Text>
              <Text style={[styles.financeValue, { color: '#4CAF50' }]}>
                +{formatCurrency(monthStats.total_sales)}
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.netLabel')}</Text>
              <Text style={[
                styles.financeValue,
                { color: monthStats.net >= 0 ? '#4CAF50' : '#FF6B6B' }
              ]}>
                {monthStats.net >= 0 ? '+' : ''}{formatCurrency(monthStats.net)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Daily Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>{t('statistics.dailyProduction')}</Text>
          {monthStats.daily_breakdown.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="egg-outline" size={48} color="#4A4A4A" />
              <Text style={styles.emptyText}>{t('statistics.noData')}</Text>
              <Text style={styles.emptyHint}>{t('statistics.noDataHint')}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.barChart}>
                {monthStats.daily_breakdown.slice().reverse().map((day) => (
                  <View key={day.date} style={styles.barContainer}>
                    <Text style={styles.barValue}>{day.eggs}</Text>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max((day.eggs / maxEggs) * 100, 4) }
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>
                      {day.date.split('-')[2]}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </>
    );
  };
  
  const renderYearView = () => {
    // Check premium status for year view
    if (!isPremium) {
      return (
        <View style={styles.premiumLock}>
          <Ionicons name="lock-closed" size={48} color="#FFD93D" />
          <Text style={styles.premiumLockTitle}>{t('statistics.premiumRequired')}</Text>
          <Text style={styles.premiumLockText}>{t('statistics.unlockYearStats')}</Text>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>{t('common.upgrade')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (!yearStats) return null;
    
    const maxEggs = Math.max(...yearStats.monthly_breakdown.map(m => m.eggs), 1);
    
    return (
      <>
        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="egg" size={24} color="#FFD93D" />
            <Text style={styles.statValue}>{yearStats.total_eggs}</Text>
            <Text style={styles.statLabel}>{t('statistics.totalEggs')}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{yearStats.avg_eggs_per_day}</Text>
            <Text style={styles.statLabel}>{t('statistics.avgPerDay')}</Text>
          </View>
        </View>
        
        {/* Financial Summary */}
        <View style={styles.financeCard}>
          <Text style={styles.cardTitle}>{t('statistics.yearEconomy')}</Text>
          <View style={styles.financeRow}>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.costLabel')}</Text>
              <Text style={[styles.financeValue, { color: '#FF6B6B' }]}>
                -{formatCurrency(yearStats.total_costs)}
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.salesLabel')}</Text>
              <Text style={[styles.financeValue, { color: '#4CAF50' }]}>
                +{formatCurrency(yearStats.total_sales)}
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.netLabel')}</Text>
              <Text style={[
                styles.financeValue,
                { color: yearStats.net >= 0 ? '#4CAF50' : '#FF6B6B' }
              ]}>
                {yearStats.net >= 0 ? '+' : ''}{formatCurrency(yearStats.net)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Monthly Breakdown Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>{t('statistics.monthlyProduction')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.barChart}>
              {yearStats.monthly_breakdown.map((month) => (
                <View key={month.month} style={styles.barContainer}>
                  <Text style={styles.barValue}>{month.eggs}</Text>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max((month.eggs / maxEggs) * 100, 4) }
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>
                    {getMonthName(month.month).substring(0, 3)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        
        {/* Monthly Details */}
        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>{t('statistics.monthlyOverview')}</Text>
          {yearStats.monthly_breakdown.filter(m => m.eggs > 0 || m.costs > 0 || m.sales > 0).map((month) => (
            <View key={month.month} style={styles.monthRow}>
              <Text style={styles.monthName}>{getMonthName(month.month)}</Text>
              <View style={styles.monthStats}>
                <View style={styles.monthStat}>
                  <Ionicons name="egg-outline" size={14} color="#FFD93D" />
                  <Text style={styles.monthStatText}>{month.eggs}</Text>
                </View>
                <Text style={[
                  styles.monthNet,
                  { color: month.net >= 0 ? '#4CAF50' : '#FF6B6B' }
                ]}>
                  {month.net >= 0 ? '+' : ''}{formatCurrency(month.net)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </>
    );
  };
  
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
          <Text style={styles.title}>{t('statistics.title')}</Text>
        </View>
        
        {/* View Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'month' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[
              styles.toggleText,
              viewMode === 'month' && styles.toggleTextActive,
            ]}>
              {t('statistics.month')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'year' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('year')}
          >
            <Text style={[
              styles.toggleText,
              viewMode === 'year' && styles.toggleTextActive,
            ]}>
              {t('statistics.year')}
              {!isPremium && (
                <Text style={styles.premiumBadge}> ★</Text>
              )}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Period Navigator */}
        <View style={styles.periodNav}>
          <TouchableOpacity style={styles.navButton} onPress={goToPreviousPeriod}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <Text style={styles.periodText}>
            {viewMode === 'month'
              ? `${getMonthName(selectedMonth)} ${selectedYear}`
              : selectedYear.toString()
            }
          </Text>
          
          <TouchableOpacity style={styles.navButton} onPress={goToNextPeriod}>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          viewMode === 'month' ? renderMonthView() : renderYearView()
        )}
      </ScrollView>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  premiumBadge: {
    color: '#FFD93D',
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendUp: {
    backgroundColor: '#4CAF5022',
  },
  trendDown: {
    backgroundColor: '#FF6B6B22',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  forecastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFD93D33',
  },
  forecastText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  forecastValue: {
    color: '#FFF',
    fontWeight: '600',
  },
  financeCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 16,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  financeItem: {
    alignItems: 'center',
  },
  financeLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  financeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  emptyChart: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    marginTop: 12,
  },
  emptyHint: {
    color: '#4A4A4A',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 20,
  },
  barContainer: {
    alignItems: 'center',
    width: 28,
    marginHorizontal: 4,
  },
  barWrapper: {
    height: 100,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
  },
  listCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  monthName: {
    fontSize: 15,
    color: '#FFF',
    textTransform: 'capitalize',
  },
  monthStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  monthStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthStatText: {
    fontSize: 14,
    color: '#FFF',
  },
  monthNet: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  premiumLock: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  premiumLockTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 16,
  },
  premiumLockText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 20,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
