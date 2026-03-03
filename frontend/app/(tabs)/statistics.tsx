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

import config from '../../src/config/env';
const API_URL = config.apiBaseUrl;

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

interface TrendAnalysis {
  period: {
    current: { start: string; end: string; days: number };
    previous: { start: string; end: string; days: number };
  };
  hen_count: number;
  current_period: {
    total_eggs: number;
    avg_eggs_per_day: number;
    laying_rate: number | null;
    total_costs: number;
    total_sales: number;
    profit: number;
  };
  previous_period: {
    total_eggs: number;
    avg_eggs_per_day: number;
    laying_rate: number | null;
    total_costs: number;
    total_sales: number;
    profit: number;
  };
  changes: {
    eggs: { value: number | null; unit: string };
    laying_rate: { value: number | null; unit: string };
    costs: { value: number | null; unit: string };
    sales: { value: number | null; unit: string };
    profit: { value: number | null; unit: string };
  };
  overall_trend: 'improving' | 'declining' | 'stable';
  trend_message: string;
  insights: string[];
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
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  const getLocale = () => isSv ? sv : enUS;
  
  useEffect(() => {
    fetchCoopSettings();
    loadStats();
    loadAdvancedInsights();
    loadTrendAnalysis();
  }, [viewMode, selectedYear, selectedMonth]);
  
  const loadAdvancedInsights = async () => {
    try {
      const response = await fetch(`${API_URL}/api/statistics/advanced-insights`);
      if (response.ok) {
        const data = await response.json();
        setAdvancedInsights(data);
      }
    } catch (error) {
      console.error('Failed to load advanced insights:', error);
    }
  };
  
  const loadTrendAnalysis = async () => {
    try {
      const response = await fetch(`${API_URL}/api/statistics/trend-analysis`);
      if (response.ok) {
        const data = await response.json();
        setTrendAnalysis(data);
      }
    } catch (error) {
      console.error('Failed to load trend analysis:', error);
    }
  };
  
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
    
    // Find best day
    const bestDay = monthStats.daily_breakdown.reduce((best, day) => {
      if (!best || day.eggs > best.eggs) return day;
      return best;
    }, null as { date: string; eggs: number } | null);
    
    // Calculate monthly trend
    const firstHalf = monthStats.daily_breakdown.slice(0, Math.floor(monthStats.daily_breakdown.length / 2));
    const secondHalf = monthStats.daily_breakdown.slice(Math.floor(monthStats.daily_breakdown.length / 2));
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, d) => sum + d.eggs, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, d) => sum + d.eggs, 0) / secondHalf.length : 0;
    const monthTrend = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'stable';
    
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
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>{t('statistics.dailyProduction')}</Text>
            {bestDay && (
              <View style={styles.bestDayBadge}>
                <Ionicons name="trophy" size={14} color={colors.warning} />
                <Text style={styles.bestDayText}>
                  Bäst: {bestDay.date.split('-')[2]}/{bestDay.date.split('-')[1]} ({bestDay.eggs} ägg)
                </Text>
              </View>
            )}
          </View>
          {monthStats.daily_breakdown.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="egg-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('statistics.noData')}</Text>
              <Text style={styles.emptyHint}>{t('statistics.noDataHint')}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.barChart}>
                {monthStats.daily_breakdown.slice().reverse().map((day, index, arr) => {
                  const prevDay = arr[index + 1];
                  const trend = prevDay ? (day.eggs > prevDay.eggs ? 'up' : day.eggs < prevDay.eggs ? 'down' : 'same') : 'same';
                  const barHeight = maxEggs > 0 ? Math.max((day.eggs / maxEggs) * 110, 10) : 10;
                  const isBest = bestDay && day.date === bestDay.date;
                  
                  return (
                    <View key={day.date} style={styles.barContainer}>
                      <View style={styles.trendIndicator}>
                        {trend === 'up' && <Text style={[styles.trendArrow, {color: colors.success}]}>↑</Text>}
                        {trend === 'down' && <Text style={[styles.trendArrow, {color: colors.error}]}>↓</Text>}
                      </View>
                      <Text style={[styles.barValue, isBest && {color: colors.warning, fontWeight: '700'}]}>{day.eggs}</Text>
                      <View style={styles.barWrapper}>
                        <View
                          style={[
                            styles.bar,
                            { 
                              height: barHeight, 
                              backgroundColor: isBest ? colors.warning : colors.primary 
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>
                        {day.date.split('-')[2]}
                      </Text>
                    </View>
                  );
                })}
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
  
  const renderAdvancedInsights = () => {
    if (!advancedInsights) return null;
    
    const { metrics, insights } = advancedInsights;
    
    // Helper to render a metric card
    const MetricCard = ({ 
      icon, 
      label, 
      value, 
      unit, 
      color,
      optimal 
    }: { 
      icon: string; 
      label: string; 
      value: number | null; 
      unit: string; 
      color: string;
      optimal?: string;
    }) => (
      <View style={styles.metricCard}>
        <View style={styles.metricIconWrap}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>
          {value !== null ? `${value} ${unit}` : '—'}
        </Text>
        {optimal && value !== null && (
          <Text style={styles.metricOptimal}>{isSv ? 'Optimalt' : 'Optimal'}: {optimal}</Text>
        )}
      </View>
    );
    
    return (
      <View style={styles.advancedSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>
            {isSv ? 'Avancerade insikter' : 'Advanced Insights'}
          </Text>
          {!isPremium && (
            <View style={styles.premiumBadgeSmall}>
              <Ionicons name="star" size={12} color={colors.warning} />
            </View>
          )}
        </View>
        
        {!isPremium ? (
          // PARTIAL INSIGHT - Show some value before locking
          <View style={styles.premiumTeaserSection}>
            {advancedInsights && (
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
              }}>
                {/* Show productivity score partially */}
                {advancedInsights.insights?.productivity_score !== null && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
                      {isSv ? 'Din produktivitetspoäng' : 'Your productivity score'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <Text style={{ 
                        fontSize: 32, 
                        fontWeight: '700',
                        color: advancedInsights.insights.productivity_score >= 70 ? colors.success 
                          : advancedInsights.insights.productivity_score >= 40 ? colors.warning : colors.error
                      }}>
                        {advancedInsights.insights.productivity_score}
                      </Text>
                      <Text style={{ fontSize: 16, color: colors.textMuted, marginLeft: 2 }}>/100</Text>
                    </View>
                    <View style={{
                      height: 6,
                      backgroundColor: colors.border,
                      borderRadius: 3,
                      marginTop: 8,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        height: '100%',
                        width: `${advancedInsights.insights.productivity_score}%`,
                        backgroundColor: advancedInsights.insights.productivity_score >= 70 ? colors.success 
                          : advancedInsights.insights.productivity_score >= 40 ? colors.warning : colors.error,
                        borderRadius: 3,
                      }} />
                    </View>
                  </View>
                )}
                
                {/* Show teaser for detailed metrics */}
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: colors.warning + '10',
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/paywall')}
                >
                  <Ionicons name="analytics" size={18} color={colors.warning} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                      {isSv ? 'Se detaljerad analys' : 'See detailed analysis'}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {isSv 
                        ? 'Foderkonvertering, värpfrekvens, kostnad/ägg med mera'
                        : 'Feed conversion, laying rate, cost/egg and more'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.warning} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Productivity Score */}
            {insights.productivity_score !== null && (
              <View style={styles.productivityScoreCard}>
                <Text style={styles.productivityLabel}>
                  {isSv ? 'Produktivitetspoäng' : 'Productivity Score'}
                </Text>
                <View style={styles.productivityScoreWrap}>
                  <Text style={[
                    styles.productivityScore,
                    { color: insights.productivity_score >= 70 ? colors.success : 
                             insights.productivity_score >= 40 ? colors.warning : colors.error }
                  ]}>
                    {insights.productivity_score}
                  </Text>
                  <Text style={styles.productivityMax}>/100</Text>
                </View>
                <View style={styles.productivityBar}>
                  <View style={[
                    styles.productivityBarFill,
                    { 
                      width: `${insights.productivity_score}%`,
                      backgroundColor: insights.productivity_score >= 70 ? colors.success : 
                                       insights.productivity_score >= 40 ? colors.warning : colors.error
                    }
                  ]} />
                </View>
              </View>
            )}
            
            {/* Key Metrics Grid */}
            <View style={styles.metricsGrid}>
              <MetricCard 
                icon="leaf" 
                label={isSv ? 'Foderkonvertering' : 'Feed Conversion'} 
                value={metrics.feed_conversion_ratio.value}
                unit={metrics.feed_conversion_ratio.unit}
                color={colors.success}
                optimal={metrics.feed_conversion_ratio.optimal_range}
              />
              <MetricCard 
                icon="trending-up" 
                label={isSv ? 'Värpfrekvens' : 'Laying Rate'} 
                value={metrics.laying_rate.value}
                unit={metrics.laying_rate.unit}
                color={colors.primary}
                optimal={metrics.laying_rate.optimal_range}
              />
              <MetricCard 
                icon="cash" 
                label={isSv ? 'Kostnad/ägg' : 'Cost/egg'} 
                value={metrics.cost_per_egg.value}
                unit={metrics.cost_per_egg.unit}
                color={colors.error}
              />
              <MetricCard 
                icon="wallet" 
                label={isSv ? 'Vinst/ägg' : 'Profit/egg'} 
                value={metrics.profit_per_egg.value}
                unit={metrics.profit_per_egg.unit}
                color={metrics.profit_per_egg.value && metrics.profit_per_egg.value > 0 ? colors.success : colors.error}
              />
              <MetricCard 
                icon="egg" 
                label={isSv ? 'Ägg/höna (månad)' : 'Eggs/hen (month)'} 
                value={metrics.eggs_per_hen_monthly.value}
                unit=""
                color={colors.warning}
              />
              <MetricCard 
                icon="calendar" 
                label={isSv ? 'Ägg/höna (år)' : 'Eggs/hen (year)'} 
                value={metrics.eggs_per_hen_yearly_estimate.value}
                unit=""
                color={colors.primary}
              />
            </View>
            
            {/* Best Laying Day */}
            {insights.best_laying_day && (
              <View style={styles.insightCard}>
                <Ionicons name="sunny" size={20} color={colors.warning} />
                <Text style={styles.insightText}>
                  {isSv ? 'Bästa värpdag: ' : 'Best laying day: '}
                  <Text style={styles.insightHighlight}>{insights.best_laying_day}</Text>
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };
  
  const renderTrendAnalysis = () => {
    if (!trendAnalysis) return null;
    
    const { current_period, previous_period, changes, overall_trend, trend_message, insights } = trendAnalysis;
    
    const getTrendIcon = () => {
      switch (overall_trend) {
        case 'improving': return 'trending-up';
        case 'declining': return 'trending-down';
        default: return 'remove';
      }
    };
    
    const getTrendColor = () => {
      switch (overall_trend) {
        case 'improving': return colors.success;
        case 'declining': return colors.error;
        default: return colors.warning;
      }
    };
    
    const ChangeIndicator = ({ value, label }: { value: number | null; label: string }) => {
      if (value === null) return null;
      const isPositive = value > 0;
      const isNegative = value < 0;
      
      return (
        <View style={styles.changeItem}>
          <Text style={styles.changeLabel}>{label}</Text>
          <View style={styles.changeValueRow}>
            <Ionicons 
              name={isPositive ? 'arrow-up' : isNegative ? 'arrow-down' : 'remove'} 
              size={16} 
              color={isPositive ? colors.success : isNegative ? colors.error : colors.textMuted} 
            />
            <Text style={[
              styles.changeValue,
              { color: isPositive ? colors.success : isNegative ? colors.error : colors.textMuted }
            ]}>
              {Math.abs(value)}%
            </Text>
          </View>
        </View>
      );
    };
    
    return (
      <View style={styles.trendSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pulse" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>
            {isSv ? 'Trend-analys' : 'Trend Analysis'}
          </Text>
          {!isPremium && (
            <View style={styles.premiumBadgeSmall}>
              <Ionicons name="star" size={12} color={colors.warning} />
            </View>
          )}
        </View>
        
        {!isPremium ? (
          // PARTIAL INSIGHT - Show teaser without locking completely
          <View style={styles.premiumTeaserSection}>
            {trendAnalysis && (
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                borderLeftWidth: 4,
                borderLeftColor: trendAnalysis.overall_trend === 'improving' ? colors.success 
                  : trendAnalysis.overall_trend === 'declining' ? colors.error : colors.primary
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons 
                    name={trendAnalysis.overall_trend === 'improving' ? 'trending-up' 
                      : trendAnalysis.overall_trend === 'declining' ? 'trending-down' : 'remove'} 
                    size={20} 
                    color={trendAnalysis.overall_trend === 'improving' ? colors.success 
                      : trendAnalysis.overall_trend === 'declining' ? colors.error : colors.textMuted} 
                  />
                  <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {trendAnalysis.changes?.eggs?.value && trendAnalysis.changes.eggs.value !== 0
                      ? (isSv 
                          ? `Produktionen har ${trendAnalysis.changes.eggs.value > 0 ? 'ökat' : 'minskat'} med ${Math.abs(trendAnalysis.changes.eggs.value)}% jämfört med förra månaden.`
                          : `Production has ${trendAnalysis.changes.eggs.value > 0 ? 'increased' : 'decreased'} by ${Math.abs(trendAnalysis.changes.eggs.value)}% compared to last month.`)
                      : (isSv ? 'Produktionen är stabil.' : 'Production is stable.')}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
                  onPress={() => router.push('/paywall')}
                >
                  <Ionicons name="sparkles" size={14} color={colors.warning} />
                  <Text style={{ marginLeft: 6, fontSize: 12, color: colors.warning, fontWeight: '500' }}>
                    {isSv ? 'Se varför detta sker med Trend-analys' : 'See why this is happening with Trend Analysis'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.warning} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Overall Trend Banner */}
            <View style={[styles.trendBanner, { backgroundColor: getTrendColor() + '20' }]}>
              <Ionicons name={getTrendIcon()} size={28} color={getTrendColor()} />
              <View style={styles.trendBannerText}>
                <Text style={[styles.trendStatus, { color: getTrendColor() }]}>
                  {overall_trend === 'improving' 
                    ? (isSv ? 'Förbättring' : 'Improving')
                    : overall_trend === 'declining' 
                      ? (isSv ? 'Nedgång' : 'Declining')
                      : (isSv ? 'Stabil' : 'Stable')}
                </Text>
                <Text style={styles.trendMessage}>{trend_message}</Text>
              </View>
            </View>
            
            {/* Period Comparison */}
            <View style={styles.periodComparison}>
              <Text style={styles.comparisonTitle}>
                {isSv ? 'Jämförelse: Senaste 30 dagar vs föregående 30 dagar' : 'Comparison: Last 30 days vs previous 30 days'}
              </Text>
              
              <View style={styles.comparisonGrid}>
                <View style={styles.comparisonColumn}>
                  <Text style={styles.comparisonHeader}>{isSv ? 'Nu' : 'Now'}</Text>
                  <Text style={styles.comparisonValue}>{current_period.total_eggs}</Text>
                  <Text style={styles.comparisonSubtext}>{isSv ? 'ägg' : 'eggs'}</Text>
                </View>
                <View style={styles.comparisonArrow}>
                  <Ionicons 
                    name={changes.eggs.value && changes.eggs.value > 0 ? 'arrow-up' : changes.eggs.value && changes.eggs.value < 0 ? 'arrow-down' : 'remove'} 
                    size={24} 
                    color={changes.eggs.value && changes.eggs.value > 0 ? colors.success : changes.eggs.value && changes.eggs.value < 0 ? colors.error : colors.textMuted} 
                  />
                </View>
                <View style={styles.comparisonColumn}>
                  <Text style={styles.comparisonHeader}>{isSv ? 'Förra' : 'Previous'}</Text>
                  <Text style={[styles.comparisonValue, { color: colors.textSecondary }]}>{previous_period.total_eggs}</Text>
                  <Text style={styles.comparisonSubtext}>{isSv ? 'ägg' : 'eggs'}</Text>
                </View>
              </View>
            </View>
            
            {/* Change Indicators */}
            <View style={styles.changesGrid}>
              <ChangeIndicator value={changes.eggs.value} label={isSv ? 'Ägg' : 'Eggs'} />
              <ChangeIndicator value={changes.laying_rate.value} label={isSv ? 'Värpfrekvens' : 'Laying Rate'} />
              <ChangeIndicator value={changes.profit.value} label={isSv ? 'Vinst' : 'Profit'} />
              <ChangeIndicator value={changes.costs.value} label={isSv ? 'Kostnader' : 'Costs'} />
            </View>
            
            {/* Insights */}
            {insights.length > 0 && (
              <View style={styles.insightsList}>
                <Text style={styles.insightsTitle}>{isSv ? 'Insikter' : 'Insights'}</Text>
                {insights.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
                    <Ionicons name="bulb" size={16} color={colors.warning} />
                    <Text style={styles.insightItemText}>{insight}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
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
          <>
            {viewMode === 'month' ? renderMonthView() : renderYearView()}
            {renderTrendAnalysis()}
            {renderAdvancedInsights()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    // Safari fix: prevent horizontal overflow
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    // Safari fix: ensure proper scrolling behavior
    WebkitOverflowScrolling: 'touch',
  } as any,
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    // Safari fix: prevent content from overflowing
    maxWidth: '100%',
    overflow: 'hidden',
  } as any,
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
    marginBottom: 16,
    marginHorizontal: -4,
    justifyContent: 'space-between',
  },
  statItem: {
    width: '47%',
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    margin: 4,
    marginBottom: 8,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    // Safari fix: use margin instead of gap
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
    // Safari fix: remove gap
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
    marginLeft: 2,
  },
  forecastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warning + '33',
  },
  forecastText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bestDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestDayText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
    marginLeft: 4,
  },
  trendIndicator: {
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendArrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 20,
    paddingHorizontal: 8,
  },
  barContainer: {
    alignItems: 'center',
    width: 32,
    marginHorizontal: 3,
  },
  barWrapper: {
    height: 120,
    width: 24,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 4,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 8,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
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
  },
  monthStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  monthStatText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 4,
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
  // Advanced Insights Styles
  advancedSection: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 8,
  },
  premiumBadgeSmall: {
    padding: 4,
  },
  premiumTeaserSection: {
    marginBottom: 16,
  },
  premiumLockSmall: {
    alignItems: 'center',
    padding: 20,
  },
  premiumLockSmallText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  upgradeButtonSmall: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  upgradeButtonSmallText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  productivityScoreCard: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  productivityLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  productivityScoreWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productivityScore: {
    fontSize: 48,
    fontWeight: '700',
  },
  productivityMax: {
    fontSize: 20,
    color: colors.textMuted,
    marginLeft: 4,
  },
  productivityBar: {
    width: '100%',
    height: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  productivityBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Safari fix: use margin instead of gap
    marginHorizontal: -6,
  },
  metricCard: {
    width: '46%',
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    // Safari fix: use margin instead of gap
    margin: 6,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  metricOptimal: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,215,0,0.1)' : 'rgba(255,215,0,0.15)',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  insightText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    marginLeft: 8,
  },
  insightHighlight: {
    fontWeight: '600',
    color: colors.warning,
  },
  // Trend Analysis Styles
  trendSection: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  trendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  trendBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  trendStatus: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  trendMessage: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  periodComparison: {
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
    textAlign: 'center',
  },
  comparisonGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  comparisonColumn: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonHeader: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  comparisonSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  comparisonArrow: {
    paddingHorizontal: 16,
  },
  changesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    // Safari fix: use margin instead of gap
    marginHorizontal: -4,
  },
  changeItem: {
    width: '47%',
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    // Safari fix: use margin instead of gap
    margin: 4,
  },
  changeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  changeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // Safari fix: use marginLeft instead of gap
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  insightsList: {
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    paddingTop: 16,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    // Safari fix: use marginRight instead of gap
  },
  insightItemText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
    marginLeft: 8,
  },
});
