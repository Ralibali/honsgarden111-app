import React, { useState, useEffect, useCallback } from 'react';
import { format, subMonths, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { sv } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { formatNumber, formatCurrency, formatNet } from '../utils/format';
import './Statistics.css';

interface MonthStats {
  year: number;
  month: number;
  total_eggs: number;
  avg_eggs_per_day: number;
  total_costs: number;
  total_sales: number;
  net: number;
  eggs_per_hen?: number;
  daily_breakdown: Array<{ date: string; eggs: number; costs: number; sales: number }>;
}

interface Hen {
  id: string;
  name: string;
  breed?: string;
  expected_eggs_per_week?: number;
}

interface HenStats {
  hen: Hen;
  eggs: number;
  percentage: number;
  trend: 'up' | 'down' | 'same';
}

interface PremiumStatus {
  is_premium: boolean;
}

interface EggRecord {
  date: string;
  count: number;
  hen_id?: string;
}

interface Transaction {
  date: string;
  type: 'expense' | 'sale';
  amount: number;
}

type TimeFilter = 'day' | 'week' | 'month';

export default function Statistics() {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [henStats, setHenStats] = useState<HenStats[]>([]);
  const [hens, setHens] = useState<Hen[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'overview' | 'hens' | 'graphs'>('overview');
  const [isPremium, setIsPremium] = useState(false);
  
  // Graph data
  const [eggChartData, setEggChartData] = useState<any[]>([]);
  const [economyChartData, setEconomyChartData] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [perHenData, setPerHenData] = useState<any[]>([]);
  const [expectedVsActualData, setExpectedVsActualData] = useState<any[]>([]);
  
  // Demo data for new users without any data
  const DEMO_EGG_DATA = [
    { date: '1 Dec', eggs: 4 },
    { date: '2 Dec', eggs: 5 },
    { date: '3 Dec', eggs: 3 },
    { date: '4 Dec', eggs: 6 },
    { date: '5 Dec', eggs: 5 },
    { date: '6 Dec', eggs: 4 },
    { date: '7 Dec', eggs: 5 },
    { date: '8 Dec', eggs: 6 },
    { date: '9 Dec', eggs: 4 },
    { date: '10 Dec', eggs: 5 },
  ];
  
  const DEMO_ECONOMY_DATA = [
    { name: 'Intäkter', value: 450, fill: '#22c55e' },
    { name: 'Kostnader', value: 180, fill: '#ef4444' },
  ];
  
  const DEMO_EXPECTED_VS_ACTUAL = [
    { week: 'V1', expected: 35, actual: 32 },
    { week: 'V2', expected: 35, actual: 38 },
    { week: 'V3', expected: 35, actual: 33 },
    { week: 'V4', expected: 35, actual: 36 },
  ];
  
  const DEMO_PER_HEN_DATA = [
    { name: 'Guldis', eggs: 28, color: '#f59e0b' },
    { name: 'Snövit', eggs: 24, color: '#ef4444' },
    { name: 'Brunhilda', eggs: 22, color: '#8b5a2b' },
  ];
  
  // Check if user has real data
  const hasRealData = eggChartData.length > 0 && eggChartData.some(d => d.eggs > 0);
  const showDemoData = !hasRealData;
  
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get premium status
      const premiumRes = await fetch('/api/premium/status', { credentials: 'include' });
      if (premiumRes.ok) {
        const data = await premiumRes.json();
        setIsPremium(data.is_premium);
      }
      
      // Get current month stats
      const [statsRes, hensRes] = await Promise.all([
        fetch(`/api/statistics/month/${year}/${month}`, { credentials: 'include' }),
        fetch('/api/hens', { credentials: 'include' })
      ]);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        
        // Build economy chart data from monthly stats
        if (statsData.daily_breakdown) {
          processEggChartData(statsData.daily_breakdown, 'day');
          processEconomyChartData(statsData.daily_breakdown);
        }
      }
      
      if (hensRes.ok) {
        const hensData = await hensRes.json();
        setHens(hensData);
        await loadHenStats(hensData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);
  
  const loadHenStats = async (hensData: Hen[]) => {
    try {
      const eggsRes = await fetch(`/api/eggs?start_date=${year}-${String(month).padStart(2, '0')}-01&end_date=${year}-${String(month).padStart(2, '0')}-31&limit=1000`, { credentials: 'include' });
      const prevEggsRes = await fetch(`/api/eggs?start_date=${getPrevMonthStart()}&end_date=${getPrevMonthEnd()}&limit=1000`, { credentials: 'include' });
      
      if (eggsRes.ok) {
        const eggsData: EggRecord[] = await eggsRes.json();
        const prevEggsData: EggRecord[] = prevEggsRes.ok ? await prevEggsRes.json() : [];
        
        const henEggCounts: Record<string, number> = {};
        const prevHenEggCounts: Record<string, number> = {};
        let totalEggs = 0;
        
        eggsData.forEach(egg => {
          if (egg.hen_id) {
            henEggCounts[egg.hen_id] = (henEggCounts[egg.hen_id] || 0) + egg.count;
          }
          totalEggs += egg.count;
        });
        
        prevEggsData.forEach(egg => {
          if (egg.hen_id) {
            prevHenEggCounts[egg.hen_id] = (prevHenEggCounts[egg.hen_id] || 0) + egg.count;
          }
        });
        
        const calculatedHenStats: HenStats[] = hensData.map(hen => {
          const eggs = henEggCounts[hen.id] || 0;
          const prevEggs = prevHenEggCounts[hen.id] || 0;
          const percentage = totalEggs > 0 ? Math.round((eggs / totalEggs) * 100) : 0;
          
          let trend: 'up' | 'down' | 'same' = 'same';
          if (prevEggs > 0) {
            const change = ((eggs - prevEggs) / prevEggs) * 100;
            if (change > 5) trend = 'up';
            else if (change < -5) trend = 'down';
          }
          
          return { hen, eggs, percentage, trend };
        });
        
        calculatedHenStats.sort((a, b) => b.eggs - a.eggs);
        setHenStats(calculatedHenStats);
        
        // Per-hen chart data
        setPerHenData(calculatedHenStats.map(h => ({
          name: h.hen.name,
          eggs: h.eggs,
          expected: h.hen.expected_eggs_per_week ? Math.round(h.hen.expected_eggs_per_week * 4) : 20
        })));
        
        // Expected vs actual data (weekly)
        buildExpectedVsActual(eggsData, hensData);
      }
    } catch (error) {
      console.error('Failed to load hen stats:', error);
    }
  };
  
  const buildExpectedVsActual = (eggsData: EggRecord[], hensData: Hen[]) => {
    const now = new Date();
    const start = startOfMonth(new Date(year, month - 1));
    const end = now < endOfMonth(start) ? now : endOfMonth(start);
    
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    const totalExpectedPerWeek = hensData.reduce((sum, h) => sum + (h.expected_eggs_per_week || 5), 0);
    
    const weeklyData = weeks.map((weekStart, i) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekLabel = `V${i + 1}`;
      
      const weekEggs = eggsData
        .filter(e => {
          const d = new Date(e.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((sum, e) => sum + e.count, 0);
      
      return {
        week: weekLabel,
        expected: totalExpectedPerWeek,
        actual: weekEggs
      };
    });
    
    setExpectedVsActualData(weeklyData);
  };
  
  const processEggChartData = (breakdown: any[], filter: TimeFilter) => {
    if (filter === 'day') {
      setEggChartData(breakdown.map(d => ({
        date: format(new Date(d.date), 'd MMM', { locale: sv }),
        eggs: d.eggs
      })));
    } else if (filter === 'week') {
      // Group by week
      const weekData: Record<string, number> = {};
      breakdown.forEach(d => {
        const weekNum = format(new Date(d.date), 'w');
        weekData[weekNum] = (weekData[weekNum] || 0) + d.eggs;
      });
      setEggChartData(Object.entries(weekData).map(([week, eggs]) => ({
        date: `V${week}`,
        eggs
      })));
    } else {
      // For month view, we'd need multiple months data
      setEggChartData([{ date: format(new Date(year, month - 1), 'MMMM', { locale: sv }), eggs: breakdown.reduce((s, d) => s + d.eggs, 0) }]);
    }
  };
  
  const processEconomyChartData = (breakdown: any[]) => {
    // Group by month (simplified - just show current month)
    const totalCosts = breakdown.reduce((s, d) => s + (d.costs || 0), 0);
    const totalSales = breakdown.reduce((s, d) => s + (d.sales || 0), 0);
    const net = totalSales - totalCosts;
    
    setEconomyChartData([
      { name: format(new Date(year, month - 1), 'MMMM', { locale: sv }), intäkter: totalSales, kostnader: totalCosts, net }
    ]);
  };
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  useEffect(() => {
    if (stats?.daily_breakdown) {
      processEggChartData(stats.daily_breakdown, timeFilter);
    }
  }, [timeFilter, stats]);
  
  const getPrevMonthStart = () => {
    const prev = subMonths(new Date(year, month - 1, 1), 1);
    return format(prev, 'yyyy-MM-dd');
  };
  
  const getPrevMonthEnd = () => {
    const prev = subMonths(new Date(year, month - 1, 1), 1);
    return format(endOfMonth(prev), 'yyyy-MM-dd');
  };
  
  const goToPrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };
  
  const goToNextMonth = () => {
    const now = new Date();
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    if (new Date(nextYear, nextMonth - 1) <= now) {
      setMonth(nextMonth);
      setYear(nextYear);
    }
  };
  
  if (loading) {
    return <div className="statistics-page loading">Laddar statistik...</div>;
  }
  
  return (
    <div className="statistics-page">
      <h1>📊 Statistik</h1>
      
      {/* Month Selector */}
      <div className="month-selector">
        <button onClick={goToPrevMonth} className="nav-btn">←</button>
        <span className="current-month">
          {format(new Date(year, month - 1), 'MMMM yyyy', { locale: sv })}
        </span>
        <button onClick={goToNextMonth} className="nav-btn">→</button>
      </div>
      
      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Översikt
        </button>
        <button
          className={`tab ${activeTab === 'hens' ? 'active' : ''}`}
          onClick={() => setActiveTab('hens')}
        >
          Per höna
        </button>
        <button
          className={`tab ${activeTab === 'graphs' ? 'active' : ''}`}
          onClick={() => setActiveTab('graphs')}
        >
          Grafer
        </button>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🥚</div>
            <div className="stat-value">{stats.total_eggs}</div>
            <div className="stat-label">Totalt ägg</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-value">{formatNumber(stats.avg_eggs_per_day, 1)}</div>
            <div className="stat-label">Ägg/dag</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">{formatCurrency(stats.total_sales)}</div>
            <div className="stat-label">Intäkter</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💸</div>
            <div className="stat-value">{formatCurrency(stats.total_costs)}</div>
            <div className="stat-label">Kostnader</div>
          </div>
          <div className={`stat-card wide ${formatNet(stats.net).className}`}>
            <div className="stat-icon">{stats.net >= 0 ? '📊' : '⚠️'}</div>
            <div className="stat-value">{formatNet(stats.net).value}</div>
            <div className="stat-label">Resultat</div>
          </div>
        </div>
      )}
      
      {/* Hens Tab */}
      {activeTab === 'hens' && (
        <div className="hen-stats-list">
          {henStats.length === 0 ? (
            <p className="empty">Ingen per-höna-data tillgänglig</p>
          ) : (
            henStats.map((hs, i) => (
              <div key={hs.hen.id} className="hen-stat-card">
                <span className="rank">{i + 1}</span>
                <div className="hen-info">
                  <span className="hen-name">{hs.hen.name}</span>
                  <span className="hen-breed">{hs.hen.breed || 'Okänd ras'}</span>
                </div>
                <div className="hen-eggs">
                  <span className="eggs-count">{hs.eggs}</span>
                  <span className="eggs-label">ägg</span>
                </div>
                <div className={`trend ${hs.trend}`}>
                  {hs.trend === 'up' && '↑'}
                  {hs.trend === 'down' && '↓'}
                  {hs.trend === 'same' && '−'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Graphs Tab */}
      {activeTab === 'graphs' && (
        <div className="graphs-section">
          {/* Demo data notice */}
          {showDemoData && (
            <div className="demo-data-notice">
              <span>📊</span>
              <p>
                <strong>Exempeldata visas</strong> - Börja logga ägg för att se din egen statistik!
              </p>
            </div>
          )}
          
          {/* FREE: Egg Production Graph */}
          <div className="graph-card">
            <div className="graph-header">
              <h3>🥚 Äggproduktion över tid</h3>
              <div className="time-filters">
                <button
                  className={timeFilter === 'day' ? 'active' : ''}
                  onClick={() => setTimeFilter('day')}
                >
                  Dag
                </button>
                <button
                  className={timeFilter === 'week' ? 'active' : ''}
                  onClick={() => setTimeFilter('week')}
                >
                  Vecka
                </button>
                <button
                  className={timeFilter === 'month' ? 'active' : ''}
                  onClick={() => setTimeFilter('month')}
                >
                  Månad
                </button>
              </div>
            </div>
            <div className="chart-container" style={{ width: '100%', height: '280px', minHeight: '280px' }}>
              <LineChart 
                width={350} 
                height={260}
                data={showDemoData ? DEMO_EGG_DATA : eggChartData}
                style={{ margin: '0 auto' }}
              >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="eggs"
                    stroke="#4ade80"
                    strokeWidth={3}
                    dot={{ fill: '#4ade80', strokeWidth: 2 }}
                    name="Ägg"
                  />
                </LineChart>
            </div>
          </div>
          
          {/* FREE: Economy Graph */}
          <div className="graph-card">
            <h3>💰 Ekonomi</h3>
            <div className="chart-container" style={{ width: '100%', height: '240px', minHeight: '240px' }}>
              <PieChart width={350} height={220} style={{ margin: '0 auto' }}>
                  <Pie
                    data={showDemoData ? DEMO_ECONOMY_DATA : economyChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, value }) => `${name}: ${value} kr`}
                  >
                    {(showDemoData ? DEMO_ECONOMY_DATA : economyChartData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value} kr`, '']}
                  />
                  <Legend />
                </PieChart>
            </div>
          </div>
          
          {/* PREMIUM: Expected vs Actual */}
          <div className={`graph-card ${!isPremium ? 'locked' : ''}`}>
            {!isPremium && (
              <div className="lock-overlay">
                <div className="lock-content">
                  <span className="lock-icon">🔒</span>
                  <p>Uppgradera till Premium för att se denna graf</p>
                  <a href="/premium" className="unlock-btn">Uppgradera</a>
                </div>
              </div>
            )}
            <h3>📊 Förväntad vs faktisk produktion</h3>
            <p className="graph-desc">Jämför vad dina hönor förväntas lägga med vad de faktiskt lagt</p>
            <div className="chart-container" style={{ width: '100%', height: '240px', minHeight: '240px', filter: !isPremium ? 'blur(8px)' : 'none' }}>
              <BarChart width={350} height={220} data={showDemoData ? DEMO_EXPECTED_VS_ACTUAL : expectedVsActualData} style={{ margin: '0 auto' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="expected" fill="#6366f1" name="Förväntat" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#4ade80" name="Faktiskt" radius={[4, 4, 0, 0]} />
                </BarChart>
            </div>
          </div>
          
          {/* PREMIUM: Per-Hen Graph */}
          <div className={`graph-card ${!isPremium ? 'locked' : ''}`}>
            {!isPremium && (
              <div className="lock-overlay">
                <div className="lock-content">
                  <span className="lock-icon">🔒</span>
                  <p>Uppgradera till Premium för att se denna graf</p>
                  <a href="/premium" className="unlock-btn">Uppgradera</a>
                </div>
              </div>
            )}
            <h3>🐔 Per-höna-produktion</h3>
            <p className="graph-desc">Se vilken höna som är stjärnan i flocken</p>
            <div className="chart-container" style={{ width: '100%', height: '280px', minHeight: '280px', filter: !isPremium ? 'blur(8px)' : 'none' }}>
              <BarChart width={350} height={260} data={showDemoData ? DEMO_PER_HEN_DATA : perHenData} layout="vertical" style={{ margin: '0 auto' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="eggs" name="Ägg" radius={[0, 4, 4, 0]}>
                    {(showDemoData ? DEMO_PER_HEN_DATA : perHenData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : '#4ade80'} />
                    ))}
                  </Bar>
                </BarChart>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
