import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import { useThemeStore, ThemeColors } from '../../src/store/themeStore';
import { useRouter } from 'expo-router';
import i18n, { formatCurrency } from '../../src/i18n';
import { format, getDaysInMonth } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  hen_breakdown?: Array<{
    id: string;
    name: string;
    eggs: number;
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

interface AdvancedInsights {
  hen_count: number;
  period_days: number;
  total_eggs_30d: number;
  total_costs_30d: number;
  total_sales_30d: number;
  metrics: {
    feed_conversion_ratio: { value: number | null; unit: string; description: string; optimal_range?: string };
    laying_rate: { value: number | null; unit: string; description: string; optimal_range?: string };
    cost_per_egg: { value: number | null; unit: string; description: string };
    revenue_per_egg: { value: number | null; unit: string; description: string };
    profit_per_egg: { value: number | null; unit: string; description: string };
    feed_cost_per_egg: { value: number | null; unit: string; description: string };
    eggs_per_hen_monthly: { value: number | null; unit: string; description: string };
    eggs_per_hen_yearly_estimate: { value: number | null; unit: string; description: string };
  };
  insights: {
    best_laying_day: string | null;
    productivity_score: number | null;
  };
}

export default function StatisticsScreen() {
  const { coopSettings, fetchCoopSettings } = useAppStore();
  const { isPremium } = usePremiumStore();
  const { colors, isDark } = useThemeStore();
  const router = useRouter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [prevMonthStats, setPrevMonthStats] = useState<MonthStats | null>(null);
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [advancedInsights, setAdvancedInsights] = useState<AdvancedInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  const getLocale = () => isSv ? sv : enUS;
  
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
  
  // PDF Export functionality
  const handleExportPDF = async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    
    setExporting(true);
    try {
      const stats = viewMode === 'month' ? monthStats : yearStats;
      if (!stats) {
        Alert.alert(t('common.error'), isSv ? 'Ingen data att exportera' : 'No data to export');
        setExporting(false);
        return;
      }
      
      const periodText = viewMode === 'month' 
        ? `${getMonthName(selectedMonth)} ${selectedYear}`
        : `${selectedYear}`;
      
      const htmlContent = generatePDFHtml(stats, periodText, viewMode);
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: isSv ? 'Dela rapport' : 'Share report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          isSv ? 'Klart!' : 'Done!',
          isSv ? 'PDF skapad' : 'PDF created'
        );
      }
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert(t('common.error'), isSv ? 'Kunde inte skapa PDF' : 'Could not create PDF');
    }
    setExporting(false);
  };
  
  const generatePDFHtml = (stats: MonthStats | YearStats, periodText: string, mode: ViewMode): string => {
    const coopName = coopSettings?.coop_name || 'Min Hönsgård';
    const henCount = coopSettings?.hen_count || 0;
    
    const isMonth = mode === 'month';
    const monthData = stats as MonthStats;
    const yearData = stats as YearStats;
    
    let dailyRows = '';
    if (isMonth && monthData.daily_breakdown) {
      dailyRows = monthData.daily_breakdown.map(day => `
        <tr>
          <td>${day.date}</td>
          <td style="text-align:center;">${day.eggs}</td>
          <td style="text-align:right;">${day.costs.toFixed(0)} kr</td>
          <td style="text-align:right;">${day.sales.toFixed(0)} kr</td>
        </tr>
      `).join('');
    }
    
    let monthlyRows = '';
    if (!isMonth && yearData.monthly_breakdown) {
      monthlyRows = yearData.monthly_breakdown.map(m => `
        <tr>
          <td>${getMonthName(m.month)}</td>
          <td style="text-align:center;">${m.eggs}</td>
          <td style="text-align:right;">${m.costs.toFixed(0)} kr</td>
          <td style="text-align:right;">${m.sales.toFixed(0)} kr</td>
          <td style="text-align:right;${m.net >= 0 ? 'color:#4CAF50;' : 'color:#FF6B6B;'}">${m.net >= 0 ? '+' : ''}${m.net.toFixed(0)} kr</td>
        </tr>
      `).join('');
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #333; }
          h1 { color: #4CAF50; margin-bottom: 5px; }
          h2 { color: #666; font-weight: normal; margin-top: 0; }
          .period { color: #888; font-size: 14px; }
          .stats-grid { display: flex; gap: 20px; margin: 30px 0; }
          .stat-box { background: #f5f5f5; border-radius: 12px; padding: 20px; flex: 1; text-align: center; }
          .stat-value { font-size: 32px; font-weight: bold; color: #333; }
          .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
          .finance-row { display: flex; gap: 20px; margin: 20px 0; }
          .finance-box { flex: 1; padding: 15px; border-radius: 8px; text-align: center; }
          .costs { background: #FFEBEE; }
          .costs .value { color: #FF6B6B; }
          .sales { background: #E8F5E9; }
          .sales .value { color: #4CAF50; }
          .net { background: #f5f5f5; }
          .value { font-size: 24px; font-weight: bold; }
          .label { font-size: 12px; color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background: #4CAF50; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          tr:nth-child(even) { background: #fafafa; }
          .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>🥚 ${coopName}</h1>
        <h2>${isSv ? 'Statistikrapport' : 'Statistics Report'}</h2>
        <p class="period">${periodText} • ${henCount} ${isSv ? 'hönor' : 'hens'}</p>
        
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${stats.total_eggs}</div>
            <div class="stat-label">${isSv ? 'Totalt ägg' : 'Total eggs'}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.avg_eggs_per_day}</div>
            <div class="stat-label">${isSv ? 'Snitt/dag' : 'Avg/day'}</div>
          </div>
          ${isMonth && monthData.eggs_per_hen ? `
          <div class="stat-box">
            <div class="stat-value">${monthData.eggs_per_hen}</div>
            <div class="stat-label">${isSv ? 'Ägg/höna' : 'Eggs/hen'}</div>
          </div>
          ` : ''}
        </div>
        
        <h3>${isSv ? 'Ekonomisk sammanfattning' : 'Financial Summary'}</h3>
        <div class="finance-row">
          <div class="finance-box costs">
            <div class="value">${stats.total_costs.toFixed(0)} kr</div>
            <div class="label">${isSv ? 'Kostnader' : 'Costs'}</div>
          </div>
          <div class="finance-box sales">
            <div class="value">${stats.total_sales.toFixed(0)} kr</div>
            <div class="label">${isSv ? 'Försäljning' : 'Sales'}</div>
          </div>
          <div class="finance-box net">
            <div class="value" style="color:${stats.net >= 0 ? '#4CAF50' : '#FF6B6B'}">
              ${stats.net >= 0 ? '+' : ''}${stats.net.toFixed(0)} kr
            </div>
            <div class="label">${isSv ? 'Netto' : 'Net'}</div>
          </div>
        </div>
        
        ${isMonth && monthData.daily_breakdown && monthData.daily_breakdown.length > 0 ? `
        <h3>${isSv ? 'Daglig översikt' : 'Daily Overview'}</h3>
        <table>
          <thead>
            <tr>
              <th>${isSv ? 'Datum' : 'Date'}</th>
              <th style="text-align:center;">${isSv ? 'Ägg' : 'Eggs'}</th>
              <th style="text-align:right;">${isSv ? 'Kostnader' : 'Costs'}</th>
              <th style="text-align:right;">${isSv ? 'Försäljning' : 'Sales'}</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRows}
          </tbody>
        </table>
        ` : ''}
        
        ${!isMonth && yearData.monthly_breakdown ? `
        <h3>${isSv ? 'Månadsöversikt' : 'Monthly Overview'}</h3>
        <table>
          <thead>
            <tr>
              <th>${isSv ? 'Månad' : 'Month'}</th>
              <th style="text-align:center;">${isSv ? 'Ägg' : 'Eggs'}</th>
              <th style="text-align:right;">${isSv ? 'Kostnader' : 'Costs'}</th>
              <th style="text-align:right;">${isSv ? 'Försäljning' : 'Sales'}</th>
              <th style="text-align:right;">${isSv ? 'Netto' : 'Net'}</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyRows}
          </tbody>
        </table>
        ` : ''}
        
        <div class="footer">
          ${isSv ? 'Skapad med Hönshus Statistik' : 'Created with Chicken Coop Statistics'} • ${format(new Date(), 'yyyy-MM-dd HH:mm')}
        </div>
      </body>
      </html>
    `;
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
          color={trend.direction === 'up' ? colors.success : colors.error}
        />
        <Text style={[
          styles.trendText,
          { color: trend.direction === 'up' ? colors.success : colors.error }
        ]}>
          {trend.value}%
        </Text>
      </View>
    );
  };
  
  const styles = createStyles(colors, isDark);
  
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
              <Ionicons name="egg" size={24} color={colors.warning} />
              {prevMonthStats && renderTrendBadge(monthStats.total_eggs, prevMonthStats.total_eggs)}
            </View>
            <Text style={styles.statValue}>{monthStats.total_eggs}</Text>
            <Text style={styles.statLabel}>{t('statistics.totalEggs')}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statHeader}>
              <Ionicons name="analytics" size={24} color={colors.success} />
              {prevMonthStats && renderTrendBadge(monthStats.avg_eggs_per_day, prevMonthStats.avg_eggs_per_day)}
            </View>
            <Text style={styles.statValue}>{monthStats.avg_eggs_per_day}</Text>
            <Text style={styles.statLabel}>{t('statistics.avgPerDay')}</Text>
          </View>
          {monthStats.eggs_per_hen && (
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Ionicons name="heart" size={24} color={colors.error} />
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
            <Ionicons name="bulb" size={20} color={colors.warning} />
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
              <Text style={[styles.financeValue, { color: colors.error }]}>
                -{formatCurrency(monthStats.total_costs)}
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.salesLabel')}</Text>
              <Text style={[styles.financeValue, { color: colors.success }]}>
                +{formatCurrency(monthStats.total_sales)}
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.netLabel')}</Text>
              <Text style={[
                styles.financeValue,
                { color: monthStats.net >= 0 ? colors.success : colors.error }
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
              <Ionicons name="egg-outline" size={48} color={colors.textMuted} />
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
                          { height: Math.max((day.eggs / maxEggs) * 100, 4), backgroundColor: colors.primary }
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
          <Ionicons name="lock-closed" size={48} color={colors.warning} />
          <Text style={styles.premiumLockTitle}>{t('statistics.premiumRequired')}</Text>
          <Text style={styles.premiumLockText}>{t('statistics.unlockYearStats')}</Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => router.push('/paywall')}
          >
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
            <Ionicons name="egg" size={24} color={colors.warning} />
            <Text style={styles.statValue}>{yearStats.total_eggs}</Text>
            <Text style={styles.statLabel}>{t('statistics.totalEggs')}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={24} color={colors.success} />
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
              <Text style={[styles.financeValue, { color: colors.error }]}>
                -{formatCurrency(yearStats.total_costs)}
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.salesLabel')}</Text>
              <Text style={[styles.financeValue, { color: colors.success }]}>
                +{formatCurrency(yearStats.total_sales)}
              </Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>{t('statistics.netLabel')}</Text>
              <Text style={[
                styles.financeValue,
                { color: yearStats.net >= 0 ? colors.success : colors.error }
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
                        { height: Math.max((month.eggs / maxEggs) * 100, 4), backgroundColor: colors.primary }
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
                  <Ionicons name="egg-outline" size={14} color={colors.warning} />
                  <Text style={styles.monthStatText}>{month.eggs}</Text>
                </View>
                <Text style={[
                  styles.monthNet,
                  { color: month.net >= 0 ? colors.success : colors.error }
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('statistics.title')}</Text>
            <TouchableOpacity 
              style={[styles.exportButton, !isPremium && styles.exportButtonLocked]}
              onPress={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons 
                    name={isPremium ? "document-text" : "lock-closed"} 
                    size={18} 
                    color={isPremium ? colors.primary : colors.textMuted} 
                  />
                  <Text style={[styles.exportButtonText, !isPremium && styles.exportButtonTextLocked]}>
                    PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.periodText}>
            {viewMode === 'month'
              ? `${getMonthName(selectedMonth)} ${selectedYear}`
              : selectedYear.toString()
            }
          </Text>
          
          <TouchableOpacity style={styles.navButton} onPress={goToNextPeriod}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          viewMode === 'month' ? renderMonthView() : renderYearView()
        )}
      </ScrollView>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  exportButtonLocked: {
    borderColor: colors.border,
  },
  exportButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  exportButtonTextLocked: {
    color: colors.textMuted,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFF',
  },
  premiumBadge: {
    color: colors.warning,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
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
    color: colors.text,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
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
    backgroundColor: colors.surface,
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
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
    backgroundColor: colors.success + '22',
  },
  trendDown: {
    backgroundColor: colors.error + '22',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  forecastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.warning + '33',
  },
  forecastText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  forecastValue: {
    color: colors.text,
    fontWeight: '600',
  },
  financeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  financeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  emptyChart: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  emptyHint: {
    color: colors.textMuted,
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
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthName: {
    fontSize: 15,
    color: colors.text,
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
    color: colors.text,
  },
  monthNet: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  premiumLock: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  premiumLockTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  premiumLockText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: colors.primary,
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
