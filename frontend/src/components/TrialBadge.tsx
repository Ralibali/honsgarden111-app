/**
 * TrialBadge Component
 * Shows Premium trial status with days remaining
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '../store/premiumStore';
import { useThemeStore } from '../store/themeStore';
import i18n from '../i18n';

interface TrialBadgeProps {
  compact?: boolean;
  showUpgradeOnExpiring?: boolean;
}

export const TrialBadge: React.FC<TrialBadgeProps> = ({ 
  compact = false,
  showUpgradeOnExpiring = true 
}) => {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { isPremium, isTrial, daysRemaining, trialExpiryWarning, isLifetime } = usePremiumStore();
  
  const isSv = i18n.locale.startsWith('sv');
  
  // Don't show if not premium
  if (!isPremium) return null;
  
  // If paid premium (not trial), show small badge
  if (!isTrial) {
    if (compact) return null;
    return (
      <View style={[styles.paidBadge, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name="star" size={14} color={colors.primary} />
        <Text style={[styles.paidText, { color: colors.primary }]}>
          {isLifetime 
            ? (isSv ? 'Livstid' : 'Lifetime')
            : 'Premium'
          }
        </Text>
      </View>
    );
  }
  
  // Trial badge with days remaining
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 2;
  const badgeColor = isExpiringSoon ? colors.warning : colors.success;
  
  // Helper to render days remaining text safely (never show "null")
  const renderDaysText = () => {
    // If daysRemaining is null or undefined, show generic "Premium aktiv"
    if (daysRemaining === null || daysRemaining === undefined) {
      return isSv ? 'Premium aktiv' : 'Premium active';
    }
    
    if (isExpiringSoon) {
      return isSv 
        ? `${daysRemaining} ${daysRemaining === 1 ? 'dag' : 'dagar'} kvar av testperioden`
        : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left in trial`;
    }
    
    return isSv 
      ? `${daysRemaining} dagar kvar`
      : `${daysRemaining} days remaining`;
  };
  
  if (compact) {
    // Don't show days count if null
    if (daysRemaining === null || daysRemaining === undefined) {
      return (
        <View style={[styles.compactBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
          <Ionicons name="star" size={12} color={badgeColor} />
          <Text style={[styles.compactText, { color: badgeColor }]}>
            {isSv ? 'Aktiv' : 'Active'}
          </Text>
        </View>
      );
    }
    
    return (
      <TouchableOpacity 
        style={[styles.compactBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}
        onPress={() => router.push('/paywall')}
      >
        <Ionicons name="star" size={12} color={badgeColor} />
        <Text style={[styles.compactText, { color: badgeColor }]}>
          {daysRemaining} {isSv ? 'd' : 'd'}
        </Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={[
        styles.trialBadge, 
        { 
          backgroundColor: badgeColor + '15',
          borderColor: badgeColor + '40',
        }
      ]}
      onPress={() => router.push('/paywall')}
      activeOpacity={0.8}
    >
      <View style={styles.trialContent}>
        <View style={[styles.iconContainer, { backgroundColor: badgeColor + '20' }]}>
          <Ionicons name="star" size={18} color={badgeColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.trialTitle, { color: colors.text }]}>
            {isSv ? 'Premium aktiv' : 'Premium Active'}
          </Text>
          <Text style={[styles.trialDays, { color: badgeColor }]}>
            {renderDaysText()}
          </Text>
        </View>
        {isExpiringSoon && daysRemaining !== null && showUpgradeOnExpiring && (
          <View style={[styles.upgradeButton, { backgroundColor: badgeColor }]}>
            <Text style={styles.upgradeText}>
              {isSv ? 'Behåll' : 'Keep'}
            </Text>
          </View>
        )}
      </View>
      
      {/* Expiry warning message - only show if daysRemaining is known */}
      {isExpiringSoon && daysRemaining !== null && (
        <View style={[styles.warningMessage, { backgroundColor: badgeColor + '10' }]}>
          <Text style={[styles.warningText, { color: colors.text }]}>
            {isSv 
              ? 'Vill du fortsätta få prognoser och optimeringsförslag?' 
              : 'Want to keep getting forecasts and optimization tips?'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paidText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trialBadge: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  trialDays: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  upgradeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  warningMessage: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default TrialBadge;
