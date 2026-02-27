import { create } from 'zustand';
import { useAuthStore, getAuthHeaders, setSessionToken, hasSessionToken, getMaskedToken, shouldIgnore401 } from './authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Robust API fetch helper with auth handling and logging
const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Build headers robustly - handle both object and Headers
  const baseHeaders = getAuthHeaders();
  const headers = new Headers(baseHeaders);
  
  // Merge in any additional headers from options
  if (options.headers) {
    const optHeaders = options.headers instanceof Headers 
      ? options.headers 
      : new Headers(options.headers as Record<string, string>);
    optHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  
  // DEV logging
  if (__DEV__) {
    const endpoint = url.replace(API_URL, '');
    console.log(`[apiFetch] ${options.method || 'GET'} ${endpoint}`);
    console.log(`[apiFetch] hasToken: ${hasSessionToken()}, token: ${getMaskedToken()}`);
    console.log(`[apiFetch] Authorization header: ${headers.has('Authorization') ? 'present' : 'MISSING'}`);
  }
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: headers,
  });
  
  // Handle 401 - user needs to login
  if (response.status === 401) {
    const endpoint = url.replace(API_URL, '');
    
    if (__DEV__) {
      console.warn(`[apiFetch] 401 from ${endpoint}`);
    }
    
    // Check if we should ignore this 401 (grace period)
    if (shouldIgnore401(endpoint)) {
      throw new Error('AUTH_REQUIRED_GRACE');
    }
    
    // Clear auth state - will trigger redirect to login
    await setSessionToken(null);
    useAuthStore.getState().setUser(null);
    throw new Error('AUTH_REQUIRED');
  }
  
  return response;
};

// Types
export interface CoopSettings {
  id: string;
  coop_name: string;
  hen_count: number;
  created_at: string;
  updated_at: string;
}

export interface EggRecord {
  id: string;
  date: string;
  count: number;
  notes?: string;
  created_at: string;
}

export type TransactionType = 'cost' | 'sale';
export type TransactionCategory = 'feed' | 'equipment' | 'medicine' | 'other_cost' | 'egg_sale' | 'hen_sale' | 'other_income';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description?: string;
  quantity?: number;
  created_at: string;
}

export interface TodayStats {
  date: string;
  egg_count: number;
  hen_count: number;
  total_costs: number;
  total_sales: number;
  net: number;
}

export interface MonthStats {
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

export interface SummaryStats {
  hen_count: number;
  total_eggs_all_time: number;
  total_costs_all_time: number;
  total_sales_all_time: number;
  net_all_time: number;
  this_month: {
    eggs: number;
    costs: number;
    sales: number;
    net: number;
  };
}

export interface Insights {
  cost_per_egg: number;
  total_eggs: number;
  total_costs: number;
  top_hen: { id: string; name: string; eggs: number } | null;
  productivity_index: number;
  hen_count: number;
  hen_ranking: Array<{ id: string; name: string; eggs: number; lifecycle: string | null }>;
  is_premium: boolean;
  premium?: {
    forecast_7_days: number;
    daily_average: number;
    production_status: string;
    production_text: string;
    deviation_percent: number;
    deviating_hens: Array<{ id: string; name: string; alert: string }>;
    economy: {
      this_month: { costs: number; sales: number; profit: number };
      last_month: { costs: number; sales: number; profit: number };
      change: number;
      change_percent: number;
    };
    summary: string;
  };
}

// For undo functionality
interface UndoAction {
  type: 'egg_record';
  recordId: string;
  data: any;
  timestamp: number;
}

interface AppState {
  // Data
  coopSettings: CoopSettings | null;
  eggRecords: EggRecord[];
  transactions: Transaction[];
  todayStats: TodayStats | null;
  summaryStats: SummaryStats | null;
  insights: Insights | null;
  
  // Undo state
  lastAction: UndoAction | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchCoopSettings: () => Promise<void>;
  updateCoopSettings: (data: { coop_name?: string; hen_count?: number }) => Promise<void>;
  fetchEggRecords: (startDate?: string, endDate?: string) => Promise<void>;
  addEggRecord: (date: string, count: number, notes?: string, henId?: string) => Promise<EggRecord | null>;
  deleteEggRecord: (id: string) => Promise<void>;
  undoLastAction: () => Promise<boolean>;
  fetchTransactions: (startDate?: string, endDate?: string, type?: TransactionType) => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  fetchTodayStats: () => Promise<void>;
  fetchSummaryStats: () => Promise<void>;
  fetchInsights: () => Promise<void>;
  clearError: () => void;
  setLastAction: (action: UndoAction | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  coopSettings: null,
  eggRecords: [],
  transactions: [],
  todayStats: null,
  summaryStats: null,
  insights: null,
  lastAction: null,
  loading: false,
  error: null,
  
  clearError: () => set({ error: null }),
  
  setLastAction: (action) => set({ lastAction: action }),
  
  fetchCoopSettings: async () => {
    try {
      set({ loading: true, error: null });
      const response = await apiFetch(`${API_URL}/api/coop`);
      if (!response.ok) throw new Error('Failed to fetch coop settings');
      const data = await response.json();
      set({ coopSettings: data, loading: false });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') {
        set({ loading: false, error: null });
        return;
      }
      set({ error: error.message, loading: false });
    }
  },
  
  updateCoopSettings: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await apiFetch(`${API_URL}/api/coop`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update coop settings');
      const updated = await response.json();
      set({ coopSettings: updated, loading: false });
      // Refresh stats
      get().fetchTodayStats();
      get().fetchSummaryStats();
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') {
        set({ loading: false, error: null });
        return;
      }
      set({ error: error.message, loading: false });
    }
  },
  
  fetchEggRecords: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true, error: null });
      let url = `${API_URL}/api/eggs`;
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiFetch(url);
      if (!response.ok) throw new Error('Failed to fetch egg records');
      const data = await response.json();
      set({ eggRecords: data, loading: false });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') {
        set({ loading: false, error: null });
        return;
      }
      set({ error: error.message, loading: false });
    }
  },
  
  addEggRecord: async (date: string, count: number, notes?: string, henId?: string) => {
    try {
      set({ loading: true, error: null });
      const response = await apiFetch(`${API_URL}/api/eggs`, {
        method: 'POST',
        body: JSON.stringify({ date, count, notes, hen_id: henId }),
      });
      if (!response.ok) throw new Error('Failed to add egg record');
      const newRecord = await response.json();
      
      // Store for undo
      set({
        lastAction: {
          type: 'egg_record',
          recordId: newRecord.id,
          data: { date, count, notes, hen_id: henId },
          timestamp: Date.now(),
        },
      });
      
      // Refresh data
      await get().fetchEggRecords();
      await get().fetchTodayStats();
      await get().fetchSummaryStats();
      set({ loading: false });
      return newRecord;
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') {
        set({ loading: false, error: null });
        return null;
      }
      set({ error: error.message, loading: false });
      return null;
    }
  },
  
  deleteEggRecord: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const response = await apiFetch(`${API_URL}/api/eggs/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete egg record');
      await get().fetchEggRecords();
      await get().fetchTodayStats();
      await get().fetchSummaryStats();
      set({ loading: false });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') {
        set({ loading: false, error: null });
        return;
      }
      set({ error: error.message, loading: false });
    }
  },
  
  undoLastAction: async () => {
    const { lastAction } = get();
    if (!lastAction) return false;
    
    // Check if action is within 5 seconds
    if (Date.now() - lastAction.timestamp > 5000) {
      set({ lastAction: null });
      return false;
    }
    
    try {
      if (lastAction.type === 'egg_record') {
        await get().deleteEggRecord(lastAction.recordId);
        set({ lastAction: null });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },
  
  fetchTransactions: async (startDate?: string, endDate?: string, type?: TransactionType) => {
    try {
      set({ loading: true, error: null });
      let url = `${API_URL}/api/transactions`;
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (type) params.append('type', type);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiFetch(url);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      set({ transactions: data, loading: false });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') {
        set({ loading: false, error: null });
        return;
      }
      set({ error: error.message, loading: false });
    }
  },
  
  addTransaction: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await apiFetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add transaction');
      await get().fetchTransactions();
      await get().fetchTodayStats();
      await get().fetchSummaryStats();
      set({ loading: false });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') {
        set({ loading: false, error: null });
        return;
      }
      set({ error: error.message, loading: false });
    }
  },
  
  deleteTransaction: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const response = await apiFetch(`${API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      await get().fetchTransactions();
      await get().fetchTodayStats();
      await get().fetchSummaryStats();
      set({ loading: false });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') {
        set({ loading: false, error: null });
        return;
      }
      set({ error: error.message, loading: false });
    }
  },
  
  fetchTodayStats: async () => {
    try {
      const response = await apiFetch(`${API_URL}/api/statistics/today`);
      if (!response.ok) throw new Error('Failed to fetch today stats');
      const data = await response.json();
      set({ todayStats: data });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') return;
      set({ error: error.message });
    }
  },
  
  fetchSummaryStats: async () => {
    try {
      const response = await apiFetch(`${API_URL}/api/statistics/summary`);
      if (!response.ok) throw new Error('Failed to fetch summary stats');
      const data = await response.json();
      set({ summaryStats: data });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') return;
      set({ error: error.message });
    }
  },
  
  fetchInsights: async () => {
    try {
      const response = await apiFetch(`${API_URL}/api/insights`);
      if (!response.ok) throw new Error('Failed to fetch insights');
      const data = await response.json();
      set({ insights: data });
    } catch (error: any) {
      if (error.message === 'AUTH_REQUIRED') return;
      set({ error: error.message });
    }
  },
}));
