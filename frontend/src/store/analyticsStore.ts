/**
 * Analytics Store for Hönsgården
 * Tracks user engagement for conversion optimization
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthHeaders } from './authStore';

import config from '../config/env';
const API_URL = config.apiBaseUrl;

export interface AnalyticsData {
  // User engagement metrics
  totalEggsRegistered: number;
  currentStreak: number;
  longestStreak: number;
  daysActive: number;
  firstActivityDate: string | null;
  lastActivityDate: string | null;
  
  // Screen visits
  statisticsViews: number;
  paywallViews: number;
  lockedFeatureClicks: number;
  
  // Conversion context
  screenOnConversion: string | null;
  eggsAtConversion: number | null;
  streakAtConversion: number | null;
  daysToConversion: number | null;
}

interface AnalyticsState {
  data: AnalyticsData;
  loading: boolean;
  
  // Actions
  loadAnalytics: () => Promise<void>;
  trackEggRegistration: (count: number) => Promise<void>;
  trackScreenView: (screen: 'statistics' | 'paywall' | 'locked_feature') => Promise<void>;
  trackConversion: (screen: string) => Promise<void>;
  incrementStreak: () => Promise<void>;
  resetStreak: () => Promise<void>;
  getConversionTrigger: () => 'eggs_30' | 'streak_7' | 'multiple_stats_views' | null;
}

const defaultAnalytics: AnalyticsData = {
  totalEggsRegistered: 0,
  currentStreak: 0,
  longestStreak: 0,
  daysActive: 0,
  firstActivityDate: null,
  lastActivityDate: null,
  statisticsViews: 0,
  paywallViews: 0,
  lockedFeatureClicks: 0,
  screenOnConversion: null,
  eggsAtConversion: null,
  streakAtConversion: null,
  daysToConversion: null,
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  data: defaultAnalytics,
  loading: false,
  
  loadAnalytics: async () => {
    set({ loading: true });
    try {
      // Load from local storage first for speed
      const cached = await AsyncStorage.getItem('analytics_data');
      if (cached) {
        set({ data: { ...defaultAnalytics, ...JSON.parse(cached) } });
      }
      
      // Then sync with backend
      const res = await fetch(`${API_URL}/api/analytics/user`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (res.ok) {
        const backendData = await res.json();
        const mergedData = {
          ...defaultAnalytics,
          totalEggsRegistered: backendData.total_eggs || 0,
          currentStreak: backendData.current_streak || 0,
          longestStreak: backendData.longest_streak || 0,
          daysActive: backendData.days_active || 0,
          firstActivityDate: backendData.first_activity_date || null,
          lastActivityDate: backendData.last_activity_date || null,
        };
        set({ data: mergedData });
        await AsyncStorage.setItem('analytics_data', JSON.stringify(mergedData));
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  trackEggRegistration: async (count: number) => {
    const { data } = get();
    const today = new Date().toISOString().split('T')[0];
    
    const newData = {
      ...data,
      totalEggsRegistered: data.totalEggsRegistered + count,
      lastActivityDate: today,
      firstActivityDate: data.firstActivityDate || today,
    };
    
    set({ data: newData });
    await AsyncStorage.setItem('analytics_data', JSON.stringify(newData));
    
    // Send to backend
    try {
      await fetch(`${API_URL}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          event: 'egg_registration',
          count,
          total_eggs: newData.totalEggsRegistered,
        }),
      });
    } catch (error) {
      console.error('Failed to track egg registration:', error);
    }
  },
  
  trackScreenView: async (screen: 'statistics' | 'paywall' | 'locked_feature') => {
    const { data } = get();
    
    const newData = { ...data };
    if (screen === 'statistics') {
      newData.statisticsViews = (data.statisticsViews || 0) + 1;
    } else if (screen === 'paywall') {
      newData.paywallViews = (data.paywallViews || 0) + 1;
    } else if (screen === 'locked_feature') {
      newData.lockedFeatureClicks = (data.lockedFeatureClicks || 0) + 1;
    }
    
    set({ data: newData });
    await AsyncStorage.setItem('analytics_data', JSON.stringify(newData));
    
    // Send to backend
    try {
      await fetch(`${API_URL}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          event: 'screen_view',
          screen,
        }),
      });
    } catch (error) {
      // Silent fail for analytics
    }
  },
  
  trackConversion: async (screen: string) => {
    const { data } = get();
    
    const firstDate = data.firstActivityDate ? new Date(data.firstActivityDate) : new Date();
    const daysToConversion = Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const conversionData = {
      screenOnConversion: screen,
      eggsAtConversion: data.totalEggsRegistered,
      streakAtConversion: data.currentStreak,
      daysToConversion,
    };
    
    const newData = { ...data, ...conversionData };
    set({ data: newData });
    await AsyncStorage.setItem('analytics_data', JSON.stringify(newData));
    
    // Send conversion event to backend
    try {
      await fetch(`${API_URL}/api/analytics/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(conversionData),
      });
    } catch (error) {
      console.error('Failed to track conversion:', error);
    }
  },
  
  incrementStreak: async () => {
    const { data } = get();
    const newStreak = data.currentStreak + 1;
    const newData = {
      ...data,
      currentStreak: newStreak,
      longestStreak: Math.max(data.longestStreak, newStreak),
      daysActive: data.daysActive + 1,
    };
    
    set({ data: newData });
    await AsyncStorage.setItem('analytics_data', JSON.stringify(newData));
  },
  
  resetStreak: async () => {
    const { data } = get();
    const newData = { ...data, currentStreak: 0 };
    
    set({ data: newData });
    await AsyncStorage.setItem('analytics_data', JSON.stringify(newData));
  },
  
  getConversionTrigger: () => {
    const { data } = get();
    
    // Check conversion triggers in priority order
    if (data.totalEggsRegistered >= 30) {
      return 'eggs_30';
    }
    if (data.currentStreak >= 7) {
      return 'streak_7';
    }
    if (data.statisticsViews >= 5) {
      return 'multiple_stats_views';
    }
    
    return null;
  },
}));

export default useAnalyticsStore;
