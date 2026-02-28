/**
 * Goals Store for Hönsgården
 * Manages user goals for eggs/month and profit targets
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthHeaders } from './authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface UserGoals {
  eggsPerMonth: number | null;
  profitTarget: number | null;
  updatedAt: string | null;
}

export interface GoalsProgress {
  eggs: {
    current: number;
    target: number | null;
    percentage: number;
    daysLeft: number;
    onTrack: boolean;
    projectedTotal: number;
  };
  profit: {
    current: number;
    target: number | null;
    percentage: number;
    onTrack: boolean;
  };
}

interface GoalsState {
  goals: UserGoals;
  progress: GoalsProgress | null;
  loading: boolean;
  
  // Actions
  loadGoals: () => Promise<void>;
  setGoal: (type: 'eggsPerMonth' | 'profitTarget', value: number | null) => Promise<void>;
  calculateProgress: (currentEggs: number, currentProfit: number, daysInMonth: number, currentDay: number) => void;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: {
    eggsPerMonth: null,
    profitTarget: null,
    updatedAt: null,
  },
  progress: null,
  loading: false,
  
  loadGoals: async () => {
    set({ loading: true });
    try {
      // First try to load from backend
      const res = await fetch(`${API_URL}/api/user/goals`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        set({ 
          goals: {
            eggsPerMonth: data.eggs_per_month || null,
            profitTarget: data.profit_target || null,
            updatedAt: data.updated_at || null,
          }
        });
        // Cache locally
        await AsyncStorage.setItem('user_goals', JSON.stringify(data));
      } else {
        // Fallback to local cache
        const cached = await AsyncStorage.getItem('user_goals');
        if (cached) {
          const data = JSON.parse(cached);
          set({ 
            goals: {
              eggsPerMonth: data.eggs_per_month || null,
              profitTarget: data.profit_target || null,
              updatedAt: data.updated_at || null,
            }
          });
        }
      }
    } catch (error) {
      // Fallback to local cache on error
      const cached = await AsyncStorage.getItem('user_goals');
      if (cached) {
        const data = JSON.parse(cached);
        set({ 
          goals: {
            eggsPerMonth: data.eggs_per_month || null,
            profitTarget: data.profit_target || null,
            updatedAt: data.updated_at || null,
          }
        });
      }
    } finally {
      set({ loading: false });
    }
  },
  
  setGoal: async (type: 'eggsPerMonth' | 'profitTarget', value: number | null) => {
    const { goals } = get();
    const newGoals = { ...goals };
    
    if (type === 'eggsPerMonth') {
      newGoals.eggsPerMonth = value;
    } else {
      newGoals.profitTarget = value;
    }
    newGoals.updatedAt = new Date().toISOString();
    
    set({ goals: newGoals });
    
    // Save to backend
    try {
      await fetch(`${API_URL}/api/user/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          eggs_per_month: newGoals.eggsPerMonth,
          profit_target: newGoals.profitTarget,
        }),
      });
    } catch (error) {
      console.error('Failed to save goals to backend:', error);
    }
    
    // Always save locally as backup
    await AsyncStorage.setItem('user_goals', JSON.stringify({
      eggs_per_month: newGoals.eggsPerMonth,
      profit_target: newGoals.profitTarget,
      updated_at: newGoals.updatedAt,
    }));
  },
  
  calculateProgress: (currentEggs: number, currentProfit: number, daysInMonth: number, currentDay: number) => {
    const { goals } = get();
    const daysLeft = daysInMonth - currentDay;
    const avgEggsPerDay = currentDay > 0 ? currentEggs / currentDay : 0;
    const projectedTotal = Math.round(avgEggsPerDay * daysInMonth);
    
    const progress: GoalsProgress = {
      eggs: {
        current: currentEggs,
        target: goals.eggsPerMonth,
        percentage: goals.eggsPerMonth ? Math.round((currentEggs / goals.eggsPerMonth) * 100) : 0,
        daysLeft,
        onTrack: goals.eggsPerMonth ? projectedTotal >= goals.eggsPerMonth : true,
        projectedTotal,
      },
      profit: {
        current: currentProfit,
        target: goals.profitTarget,
        percentage: goals.profitTarget ? Math.round((currentProfit / goals.profitTarget) * 100) : 0,
        onTrack: goals.profitTarget ? currentProfit >= 0 : true,
      },
    };
    
    set({ progress });
  },
}));

export default useGoalsStore;
