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
import { format, subMonths } from 'date-fns';
import { sv } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const screenWidth = Dimensions.get('window').width;

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
  
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchCoopSettings();
    loadStats();
  }, [viewMode, selectedYear, selectedMonth]);
  
  const loadStats = async () => {
    setLoading(true);
    try {
      if (viewMode === 'month') {
        const response = await fetch(`${API_URL}/api/statistics/month/${selectedYear}/${selectedMonth}`);
        if (response.ok) {
          const data = await response.json();
          setMonthStats(data);
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
        return; // Don't go to future
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
    return format(date, 'MMMM', { locale: sv });
  };
  
  const renderMonthView = () => {
    if (!monthStats) return null;
    
    const maxEggs = Math.max(...(monthStats.daily_breakdown.map(d => d.eggs) || [0]), 1);
    
    return (
      <>
        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="egg" size={24} color="#FFD93D" />
            <Text style={styles.statValue}>{monthStats.total_eggs}</Text>
            <Text style={styles.statLabel}>Totalt ägg</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{monthStats.avg_eggs_per_day}</Text>
            <Text style={styles.statLabel}>Snitt/dag</Text>
          </View>
          {monthStats.eggs_per_hen && (
            <View style={styles.statItem}>
              <Ionicons name="heart" size={24} color="#FF6B6B" />
              <Text style={styles.statValue}>{monthStats.eggs_per_hen}</Text>
              <Text style={styles.statLabel}>Ägg/höna</Text>
            </View>
          )}
        </View>
        
        {/* Financial Summary */}
        <View style={styles.financeCard}>
          <Text style={styles.cardTitle}>Ekonomi</Text>
          <View style={styles.financeRow}>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Kostnader</Text>
              <Text style={[styles.financeValue, { color: '#FF6B6B' }]}>
                -{monthStats.total_costs.toFixed(0)} kr
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Försäljning</Text>
              <Text style={[styles.financeValue, { color: '#4CAF50' }]}>
                +{monthStats.total_sales.toFixed(0)} kr
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Netto</Text>
              <Text style={[
                styles.financeValue,
                { color: monthStats.net >= 0 ? '#4CAF50' : '#FF6B6B' }
              ]}>
                {monthStats.net >= 0 ? '+' : ''}{monthStats.net.toFixed(0)} kr
              </Text>
            </View>
          </View>
        </View>
        
        {/* Daily Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Daglig äggproduktion</Text>
          {monthStats.daily_breakdown.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>Ingen data för denna månad</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.barChart}>
                {monthStats.daily_breakdown.slice().reverse().map((day, index) => (
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
    if (!yearStats) return null;
    
    const maxEggs = Math.max(...yearStats.monthly_breakdown.map(m => m.eggs), 1);
    
    return (
      <>
        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="egg" size={24} color="#FFD93D" />
            <Text style={styles.statValue}>{yearStats.total_eggs}</Text>
            <Text style={styles.statLabel}>Totalt ägg</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{yearStats.avg_eggs_per_day}</Text>
            <Text style={styles.statLabel}>Snitt/dag</Text>
          </View>
        </View>
        
        {/* Financial Summary */}
        <View style={styles.financeCard}>
          <Text style={styles.cardTitle}>Årsekonomi</Text>
          <View style={styles.financeRow}>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Kostnader</Text>
              <Text style={[styles.financeValue, { color: '#FF6B6B' }]}>
                -{yearStats.total_costs.toFixed(0)} kr
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Försäljning</Text>
              <Text style={[styles.financeValue, { color: '#4CAF50' }]}>
                +{yearStats.total_sales.toFixed(0)} kr
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Netto</Text>
              <Text style={[
                styles.financeValue,
                { color: yearStats.net >= 0 ? '#4CAF50' : '#FF6B6B' }
              ]}>
                {yearStats.net >= 0 ? '+' : ''}{yearStats.net.toFixed(0)} kr
              </Text>
            </View>
          </View>
        </View>
        
        {/* Monthly Breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Månatlig äggproduktion</Text>
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
          <Text style={styles.cardTitle}>Månadsöversikt</Text>
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
                  {month.net >= 0 ? '+' : ''}{month.net.toFixed(0)} kr
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
          <Text style={styles.title}>Statistik</Text>
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
              Månad
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
              År
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
            <Text style={styles.loadingText}>Laddar...</Text>
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
    color: '#4A4A4A',
    fontSize: 14,
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
});
