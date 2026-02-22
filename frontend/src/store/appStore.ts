import { create } from 'zustand';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

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

interface AppState {
  // Data
  coopSettings: CoopSettings | null;
  eggRecords: EggRecord[];
  transactions: Transaction[];
  todayStats: TodayStats | null;
  summaryStats: SummaryStats | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchCoopSettings: () => Promise<void>;
  updateCoopSettings: (data: { coop_name?: string; hen_count?: number }) => Promise<void>;
  fetchEggRecords: (startDate?: string, endDate?: string) => Promise<void>;
  addEggRecord: (date: string, count: number, notes?: string) => Promise<void>;
  deleteEggRecord: (id: string) => Promise<void>;
  fetchTransactions: (startDate?: string, endDate?: string, type?: TransactionType) => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  fetchTodayStats: () => Promise<void>;
  fetchSummaryStats: () => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  coopSettings: null,
  eggRecords: [],
  transactions: [],
  todayStats: null,
  summaryStats: null,
  loading: false,
  error: null,
  
  clearError: () => set({ error: null }),
  
  fetchCoopSettings: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(`${API_URL}/api/coop`);
      if (!response.ok) throw new Error('Failed to fetch coop settings');
      const data = await response.json();
      set({ coopSettings: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  updateCoopSettings: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(`${API_URL}/api/coop`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update coop settings');
      const updated = await response.json();
      set({ coopSettings: updated, loading: false });
      // Refresh stats
      get().fetchTodayStats();
      get().fetchSummaryStats();
    } catch (error: any) {
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
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch egg records');
      const data = await response.json();
      set({ eggRecords: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  addEggRecord: async (date: string, count: number, notes?: string) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(`${API_URL}/api/eggs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, count, notes }),
      });
      if (!response.ok) throw new Error('Failed to add egg record');
      // Refresh data
      await get().fetchEggRecords();
      await get().fetchTodayStats();
      await get().fetchSummaryStats();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  deleteEggRecord: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(`${API_URL}/api/eggs/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete egg record');
      await get().fetchEggRecords();
      await get().fetchTodayStats();
      await get().fetchSummaryStats();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
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
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      set({ transactions: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  addTransaction: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add transaction');
      await get().fetchTransactions();
      await get().fetchTodayStats();
      await get().fetchSummaryStats();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  deleteTransaction: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(`${API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      await get().fetchTransactions();
      await get().fetchTodayStats();
      await get().fetchSummaryStats();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  fetchTodayStats: async () => {
    try {
      const response = await fetch(`${API_URL}/api/statistics/today`);
      if (!response.ok) throw new Error('Failed to fetch today stats');
      const data = await response.json();
      set({ todayStats: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  fetchSummaryStats: async () => {
    try {
      const response = await fetch(`${API_URL}/api/statistics/summary`);
      if (!response.ok) throw new Error('Failed to fetch summary stats');
      const data = await response.json();
      set({ summaryStats: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
