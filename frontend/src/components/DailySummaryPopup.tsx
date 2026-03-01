/**
 * Daily Summary Popup Component
 * Shows yesterday's egg production summary when opening the app
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../store/themeStore';
import { apiFetch } from '../store/appStore';
import i18n from '../i18n';

import config from '../config/env';
const API_URL = config.apiBaseUrl;
const { width } = Dimensions.get('window');

interface DailySummaryData {
  eggs_yesterday: number;
  hen_count: number;
  laying_percentage: number;
  eggs_this_week: number;
  estimated_monthly_value: number;
  yesterday_date: string;
}

interface DailySummaryPopupProps {
  visible: boolean;
  onClose: () => void;
}

export const DailySummaryPopup: React.FC<DailySummaryPopupProps> = ({ visible, onClose }) => {
  const { colors } = useThemeStore();
  const [data, setData] = useState<DailySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];
  
  const isSv = i18n.locale?.startsWith('sv') ?? true;

  useEffect(() => {
    if (visible) {
      loadYesterdayData();
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const loadYesterdayData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${API_URL}/api/stats/yesterday-summary`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to load yesterday summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const days = isSv 
        ? ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = isSv
        ? ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return isSv ? 'Igår' : 'Yesterday';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return isSv ? 'God morgon!' : 'Good morning!';
    if (hour < 18) return isSv ? 'Hej!' : 'Hello!';
    return isSv ? 'God kväll!' : 'Good evening!';
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={handleClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.greeting, { color: colors.text }]}>
                {getGreeting()} <Text style={styles.emoji}>🥚</Text>
              </Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {data ? formatDate(data.yesterday_date) : (isSv ? 'Igår' : 'Yesterday')}
              </Text>
            </View>

            {/* Main Egg Display */}
            <View style={[styles.mainEggContainer, { backgroundColor: colors.background }]}>
              <View style={styles.eggIconContainer}>
                <Text style={styles.eggIcon}>🥚</Text>
              </View>
              <Text style={[styles.eggCount, { color: colors.text }]}>
                {loading ? '...' : (data?.eggs_yesterday ?? 0)}
              </Text>
              <Text style={[styles.eggLabel, { color: colors.textSecondary }]}>
                {isSv ? 'ägg igår' : 'eggs yesterday'}
              </Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {/* Hens */}
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Text style={styles.statEmoji}>🐔</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {loading ? '...' : (data?.hen_count ?? 0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {isSv ? 'hönor' : 'hens'}
                </Text>
              </View>

              {/* Laying percentage */}
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Text style={styles.statEmoji}>📊</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {loading ? '...' : `${data?.laying_percentage ?? 0}%`}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {isSv ? 'värpprocent' : 'laying rate'}
                </Text>
              </View>

              {/* This week */}
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Text style={styles.statEmoji}>📅</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {loading ? '...' : (data?.eggs_this_week ?? 0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {isSv ? 'denna vecka' : 'this week'}
                </Text>
              </View>

              {/* Monthly value */}
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Text style={styles.statEmoji}>💰</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {loading ? '...' : `+${data?.estimated_monthly_value ?? 0}`}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {isSv ? 'kr i månaden' : 'kr/month'}
                </Text>
              </View>
            </View>

            {/* Close hint */}
            <Text style={[styles.closeHint, { color: colors.textSecondary }]}>
              {isSv ? 'Tryck var som helst för att stänga' : 'Tap anywhere to close'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: Math.min(width - 48, 340),
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 20,
  },
  date: {
    fontSize: 14,
  },
  mainEggContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 20,
    marginBottom: 16,
  },
  eggIconContainer: {
    marginBottom: 8,
  },
  eggIcon: {
    fontSize: 48,
  },
  eggCount: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
  },
  eggLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  closeHint: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default DailySummaryPopup;
