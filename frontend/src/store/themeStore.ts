import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system' | 'rural';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Borders
  border: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  
  // Accent
  primary: string;
  primaryLight: string;
  
  // Tab bar
  tabBar: string;
  tabBarBorder: string;
}

export const lightTheme: ThemeColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#E8E8E8',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#FF6B6B',
  warning: '#FFD93D',
  primary: '#4CAF50',
  primaryLight: '#4CAF5022',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E0E0E0',
};

export const darkTheme: ThemeColors = {
  background: '#0D0D0D',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#666666',
  border: '#2C2C2E',
  success: '#4CAF50',
  error: '#FF6B6B',
  warning: '#FFD93D',
  primary: '#4CAF50',
  primaryLight: '#4CAF5022',
  tabBar: '#1C1C1E',
  tabBarBorder: '#2C2C2E',
};

// Lantligt tema - varma, jordnära färger inspirerade av svenska landsbygden
export const ruralTheme: ThemeColors = {
  background: '#F5F0E6',      // Varm havremjölk/papper
  surface: '#FDF8F0',         // Kremvit som äggvita
  surfaceSecondary: '#E8DFD0', // Ljust trä
  card: '#FDF8F0',
  text: '#3D2E1C',            // Mörk brun jord
  textSecondary: '#6B5744',   // Varm brun
  textMuted: '#8B7355',       // Ljusare brun
  border: '#D4C4A8',          // Halm/vete-färg
  success: '#5A8F4C',         // Gräsgrön
  error: '#B54D42',           // Röd lada
  warning: '#D4A03E',         // Gyllene vete
  primary: '#7B6B3C',         // Ockra/jord
  primaryLight: '#7B6B3C22',
  tabBar: '#E8DFD0',          // Ljust trä
  tabBarBorder: '#D4C4A8',    // Halm
};

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  initializeTheme: () => Promise<void>;
}

const getEffectiveTheme = (mode: ThemeMode): { colors: ThemeColors; isDark: boolean } => {
  if (mode === 'system') {
    const systemColorScheme = Appearance.getColorScheme();
    const isDark = systemColorScheme === 'dark';
    return { colors: isDark ? darkTheme : lightTheme, isDark };
  }
  if (mode === 'rural') {
    return { colors: ruralTheme, isDark: false };
  }
  const isDark = mode === 'dark';
  return { colors: isDark ? darkTheme : lightTheme, isDark };
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'rural',
  colors: ruralTheme,
  isDark: false,
  
  setThemeMode: async (mode: ThemeMode) => {
    const { colors, isDark } = getEffectiveTheme(mode);
    set({ mode, colors, isDark });
    await AsyncStorage.setItem('theme_mode', mode);
  },
  
  initializeTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem('theme_mode') as ThemeMode | null;
      const mode = savedMode || 'rural';
      const { colors, isDark } = getEffectiveTheme(mode);
      set({ mode, colors, isDark });
      
      // Listen for system theme changes
      Appearance.addChangeListener(({ colorScheme }) => {
        if (get().mode === 'system') {
          const isDark = colorScheme === 'dark';
          set({ colors: isDark ? darkTheme : lightTheme, isDark });
        }
      });
    } catch (error) {
      console.error('Failed to initialize theme:', error);
    }
  },
}));
