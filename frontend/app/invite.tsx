import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useThemeStore } from '../src/store/themeStore';
import { getAuthHeaders } from '../src/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ReferralInfo {
  referral_code: string;
  referral_link: string;
  referrals_count: number;
  bonus_days_earned: number;
}

interface Referral {
  referred_name: string;
  referred_email: string;
  bonus_days: number;
  created_at: string;
}

export default function InviteFriendsPage() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);

  // Detect Swedish language from system
  const isSv = true; // Default to Swedish for this app

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const [infoRes, listRes] = await Promise.all([
        fetch(`${API_URL}/api/referral/info`, {
          credentials: 'include',
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/api/referral/list`, {
          credentials: 'include',
          headers: getAuthHeaders(),
        }),
      ]);

      if (infoRes.ok) {
        const info = await infoRes.json();
        setReferralInfo(info);
      }

      if (listRes.ok) {
        const list = await listRes.json();
        setReferrals(list.referrals || []);
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!referralInfo) return;

    const message = isSv
      ? `Hej! Jag använder Hönsgården för att hålla koll på mina höns och ägg. Registrera dig med min länk så får vi båda 7 dagars gratis Premium! 🐔\n\n${referralInfo.referral_link}`
      : `Hey! I'm using Hönsgården to track my hens and eggs. Sign up with my link and we both get 7 days free Premium! 🐔\n\n${referralInfo.referral_link}`;

    try {
      await Share.share({
        message,
        title: isSv ? 'Bjud in till Hönsgården' : 'Invite to Hönsgården',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyCode = async () => {
    if (!referralInfo) return;
    
    await Clipboard.setStringAsync(referralInfo.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!referralInfo) return;
    
    await Clipboard.setStringAsync(referralInfo.referral_link);
    Alert.alert(
      isSv ? 'Kopierat!' : 'Copied!',
      isSv ? 'Länken har kopierats till urklipp' : 'Link copied to clipboard'
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {isSv ? 'Bjud in vänner' : 'Invite Friends'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary + '15' }]}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {isSv ? 'Ge & Få sju dagars Premium!' : 'Give & Get 7 Days Premium!'}
          </Text>
          <Text style={[styles.heroText, { color: colors.textSecondary }]}>
            {isSv 
              ? 'När en vän skapar ett konto med din kod får ni båda sju dagars gratis Premium.'
              : 'When a friend creates an account with your code, you both get 7 days free Premium.'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {referralInfo?.referrals_count || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {isSv ? 'Värvade vänner' : 'Friends invited'}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: '#22c55e' }]}>
              {referralInfo?.bonus_days_earned || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {isSv ? 'Bonusdagar' : 'Bonus days'}
            </Text>
          </View>
        </View>

        {/* Referral Code */}
        <View style={[styles.codeCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
            {isSv ? 'Din värvningskod' : 'Your referral code'}
          </Text>
          <View style={styles.codeRow}>
            <Text style={[styles.codeText, { color: colors.text }]}>
              {referralInfo?.referral_code || '---'}
            </Text>
            <TouchableOpacity 
              style={[styles.copyButton, { backgroundColor: colors.primary + '20' }]}
              onPress={handleCopyCode}
            >
              <Ionicons 
                name={copied ? "checkmark" : "copy-outline"} 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Buttons */}
        <View style={styles.shareSection}>
          <TouchableOpacity 
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={22} color="#FFF" />
            <Text style={styles.shareButtonText}>
              {isSv ? 'Dela med vänner' : 'Share with friends'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.linkButton, { borderColor: colors.border }]}
            onPress={handleCopyLink}
          >
            <Ionicons name="link-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.linkButtonText, { color: colors.textSecondary }]}>
              {isSv ? 'Kopiera länk' : 'Copy link'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Referral List */}
        {referrals.length > 0 && (
          <View style={styles.referralList}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              {isSv ? 'Dina värvningar' : 'Your referrals'}
            </Text>
            {referrals.map((ref, index) => (
              <View 
                key={index} 
                style={[styles.referralItem, { backgroundColor: colors.surface }]}
              >
                <View style={[styles.referralAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={styles.avatarText}>
                    {ref.referred_name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.referralInfo}>
                  <Text style={[styles.referralName, { color: colors.text }]}>
                    {ref.referred_name || 'Okänd'}
                  </Text>
                  <Text style={[styles.referralDate, { color: colors.textSecondary }]}>
                    {formatDate(ref.created_at)}
                  </Text>
                </View>
                <View style={[styles.bonusBadge, { backgroundColor: '#22c55e20' }]}>
                  <Text style={{ color: '#22c55e', fontWeight: '600' }}>
                    +{ref.bonus_days} {isSv ? 'dagar' : 'days'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* How it works */}
        <View style={[styles.howItWorks, { backgroundColor: colors.surface }]}>
          <Text style={[styles.howTitle, { color: colors.text }]}>
            {isSv ? 'Så fungerar det' : 'How it works'}
          </Text>
          <View style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              {isSv ? 'Dela din kod eller länk med en vän' : 'Share your code or link with a friend'}
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              {isSv ? 'Vännen skapar ett konto med din kod' : 'Friend creates an account with your code'}
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              {isSv ? 'Ni får båda sju dagars gratis Premium!' : 'You both get 7 days free Premium!'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  heroCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  codeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
  },
  copyButton: {
    padding: 10,
    borderRadius: 10,
  },
  shareSection: {
    gap: 12,
    marginBottom: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 15,
  },
  referralList: {
    marginBottom: 24,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  referralInfo: {
    flex: 1,
    marginLeft: 12,
  },
  referralName: {
    fontSize: 15,
    fontWeight: '500',
  },
  referralDate: {
    fontSize: 13,
    marginTop: 2,
  },
  bonusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  howItWorks: {
    borderRadius: 12,
    padding: 16,
  },
  howTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
