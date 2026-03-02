/**
 * CompactDashboard Component
 * Compact stat-strip + primary CTA + premium teaser
 * Matches the web app's new dashboard design
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../store/themeStore';

interface CompactDashboardProps {
  eggsYesterday: number;
  henCount: number;
  eggsThisWeek: number;
  estimatedMonthlyValue: number;
  todayEggCount: number;
  isPremium: boolean;
  onRegisterEggs: () => void;
  greeting: string;
  coopName: string;
  dateString: string;
  streak?: number;  // Registreringsstreak i dagar
  weather?: { temperature: number; description: string } | null;  // Väderdata
}

export default function CompactDashboard({
  eggsYesterday,
  henCount,
  eggsThisWeek,
  estimatedMonthlyValue,
  todayEggCount,
  isPremium,
  onRegisterEggs,
  greeting,
  coopName,
  dateString,
  streak = 0,
  weather = null,
}: CompactDashboardProps) {
  const router = useRouter();
  const { colors } = useThemeStore();

  // UI guard for unreasonable laying percentage
  const getLayingPercentage = (): string => {
    if (henCount <= 0) return '—';
    if (eggsYesterday > henCount) return '—';
    const pct = Math.round((eggsYesterday / henCount) * 100);
    return `${pct}%`;
  };

  // Preview AI insight for non-premium
  const getPreviewInsight = () => {
    if (henCount === 0) return "Lägg till dina hönor för personlig analys.";
    if (eggsYesterday === 0) return "Registrera ägg för att få AI-analys.";
    const pct = Math.round((eggsYesterday / henCount) * 100);
    if (pct >= 80) return "Äggproduktionen ser stabil ut idag.";
    if (pct >= 50) return "Produktionen är normal för årstiden.";
    return "Vi ser potential för optimering.";
  };

  const styles = createStyles(colors);
  
  // Väderikon baserat på beskrivning
  const getWeatherIcon = (desc: string) => {
    if (!desc) return '☀️';
    const d = desc.toLowerCase();
    if (d.includes('rain') || d.includes('regn')) return '🌧️';
    if (d.includes('cloud') || d.includes('moln')) return '☁️';
    if (d.includes('snow') || d.includes('snö')) return '❄️';
    if (d.includes('thunder') || d.includes('åska')) return '⛈️';
    if (d.includes('fog') || d.includes('dimma')) return '🌫️';
    if (d.includes('clear') || d.includes('klar')) return '☀️';
    return '🌤️';
  };

  return (
    <View style={styles.container}>
      {/* Header with weather */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.coopName}>{coopName}</Text>
            <Text style={styles.dateText}>{dateString}</Text>
          </View>
          {weather && (
            <View style={{ alignItems: 'center', marginLeft: 12 }}>
              <Text style={{ fontSize: 28 }}>{getWeatherIcon(weather.description)}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {Math.round(weather.temperature)}°
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Compact Stat Strip - now includes productivity and streak */}
      <View style={styles.statStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🥚</Text>
          <Text style={styles.statValue}>{eggsYesterday}</Text>
          <Text style={styles.statLabel}>igår</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🐔</Text>
          <Text style={styles.statValue}>{henCount}</Text>
          <Text style={styles.statLabel}>{henCount === 1 ? 'höna' : 'hönor'}</Text>
        </View>
        <View style={styles.statDivider} />
        {streak > 0 && (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={[styles.statValue, streak >= 7 && { color: '#f59e0b' }]}>{streak}</Text>
              <Text style={styles.statLabel}>dagar</Text>
            </View>
            <View style={styles.statDivider} />
          </>
        )}
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statValue}>{eggsThisWeek}</Text>
          <Text style={styles.statLabel}>veckan</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={[styles.statValue, styles.statValueSuccess]}>+{estimatedMonthlyValue}</Text>
          <Text style={styles.statLabel}>kr/mån</Text>
        </View>
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.primaryCta}
        onPress={onRegisterEggs}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaIcon}>🥚</Text>
        <View style={styles.ctaContent}>
          <Text style={styles.ctaTitle}>Registrera ägg</Text>
          <Text style={styles.ctaSubtitle}>
            {todayEggCount > 0 ? `${todayEggCount} ägg idag` : 'Tryck för att lägga till'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* Premium Teaser (non-premium only) */}
      {!isPremium && (
        <View style={styles.premiumTeaser}>
          <View style={styles.aiPreviewCard}>
            <View style={styles.aiPreviewHeader}>
              <Text style={styles.aiRobot}>🤖</Text>
              <Text style={styles.aiLabel}>AI-INSIKT</Text>
            </View>
            <Text style={styles.aiPreviewText}>"{getPreviewInsight()}"</Text>
            <TouchableOpacity
              style={styles.unlockBtn}
              onPress={() => router.push('/paywall')}
              activeOpacity={0.8}
            >
              <Text style={styles.unlockBtnIcon}>⭐</Text>
              <Text style={styles.unlockBtnText}>Lås upp djupare analys</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.premiumFeaturesPreview}>
            <TouchableOpacity 
              style={styles.featurePreview}
              onPress={() => router.push('/paywall')}
            >
              <Text>📈</Text>
              <Text style={styles.featurePreviewText}>Se 7-dagars prognos</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.featurePreview}
              onPress={() => router.push('/paywall')}
            >
              <Text>🐔</Text>
              <Text style={styles.featurePreviewText}>Få smart flockråd</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  // Header
  header: {
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  coopName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  dateText: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  
  // Stat Strip
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statValueSuccess: {
    color: colors.success,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  
  // Primary CTA
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: colors.success,
    borderRadius: 12,
    marginBottom: 16,
  },
  ctaIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  
  // Premium Teaser
  premiumTeaser: {
    marginBottom: 8,
  },
  aiPreviewCard: {
    padding: 14,
    backgroundColor: '#FDF6EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D9C8',
    marginBottom: 10,
  },
  aiPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiRobot: {
    fontSize: 16,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B5744',
    letterSpacing: 0.5,
  },
  aiPreviewText: {
    fontSize: 14,
    color: '#3D2E1C',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    backgroundColor: '#C9A66B',
    borderRadius: 8,
  },
  unlockBtnIcon: {
    fontSize: 14,
  },
  unlockBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  premiumFeaturesPreview: {
    flexDirection: 'row',
    gap: 8,
  },
  featurePreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featurePreviewText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
});
