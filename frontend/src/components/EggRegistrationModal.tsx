import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import i18n from '../i18n';

import config from '../config/env';
const API_URL = config.apiBaseUrl;

interface Hen {
  id: string;
  name: string;
  breed?: string;
  color?: string;
}

interface EggRegistrationProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preSelectedHenId?: string;
  preSelectedHenName?: string;
}

export default function EggRegistrationModal({
  visible,
  onClose,
  onSuccess,
  preSelectedHenId,
  preSelectedHenName,
}: EggRegistrationProps) {
  const { colors, isDark } = useThemeStore();
  const [hens, setHens] = useState<Hen[]>([]);
  const [selectedHenId, setSelectedHenId] = useState<string>(preSelectedHenId || '');
  const [customCount, setCustomCount] = useState('');
  const [saving, setSaving] = useState(false);
  
  const isSv = i18n.locale.startsWith('sv');
  const today = new Date().toLocaleDateString('sv-SE');
  
  useEffect(() => {
    if (visible) {
      loadHens();
      setSelectedHenId(preSelectedHenId || '');
      setCustomCount('');
    }
  }, [visible, preSelectedHenId]);
  
  const loadHens = async () => {
    try {
      const res = await fetch(`${API_URL}/api/hens?active_only=true`);
      if (res.ok) {
        const data = await res.json();
        setHens(data);
      }
    } catch (error) {
      console.error('Failed to load hens:', error);
    }
  };
  
  const handleQuickAdd = async (count: number) => {
    setSaving(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/api/eggs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayStr,
          count,
          hen_id: selectedHenId || undefined
        })
      });
      
      if (response.ok) {
        const henName = selectedHenId 
          ? (preSelectedHenName || hens.find(h => h.id === selectedHenId)?.name || 'Vald höna')
          : (isSv ? 'Okänd höna' : 'Unknown hen');
        Alert.alert('🥚', `${count} ${isSv ? 'ägg registrerat' : 'eggs registered'}${selectedHenId ? ` (${henName})` : ''}`);
        onSuccess?.();
        onClose();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to add eggs:', error);
      Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Kunde inte spara' : 'Could not save');
    }
    setSaving(false);
  };
  
  const handleCustomAdd = () => {
    const count = parseInt(customCount);
    if (isNaN(count) || count < 1) {
      Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Ange ett giltigt antal' : 'Enter a valid number');
      return;
    }
    handleQuickAdd(count);
  };
  
  const styles = createStyles(colors, isDark);
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🥚 {isSv ? 'Registrera ägg' : 'Register eggs'}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          
          {/* Quick Add Buttons */}
          <Text style={styles.sectionLabel}>{isSv ? 'Snabbregistrera' : 'Quick add'}</Text>
          <View style={styles.quickButtons}>
            {[1, 2, 3, 5, 10].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.quickBtn, saving && styles.quickBtnDisabled]}
                onPress={() => handleQuickAdd(num)}
                disabled={saving}
              >
                <Text style={styles.quickBtnText}>+{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Custom Amount */}
          <Text style={styles.sectionLabel}>{isSv ? 'Eget antal' : 'Custom amount'}</Text>
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              value={customCount}
              onChangeText={setCustomCount}
              placeholder={isSv ? 'Ange antal...' : 'Enter amount...'}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[styles.customAddBtn, (!customCount || saving) && styles.customAddBtnDisabled]}
              onPress={handleCustomAdd}
              disabled={!customCount || saving}
            >
              <Text style={styles.customAddBtnText}>{isSv ? 'Lägg till' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Hen Selection */}
          <Text style={styles.sectionLabel}>{isSv ? 'Vilken höna? (valfritt)' : 'Which hen? (optional)'}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.henScroll}
            contentContainerStyle={styles.henScrollContent}
          >
            <TouchableOpacity
              style={[styles.henOption, !selectedHenId && styles.henOptionActive]}
              onPress={() => setSelectedHenId('')}
            >
              <Text style={styles.henEmoji}>🥚</Text>
              <Text style={[styles.henName, !selectedHenId && styles.henNameActive]}>
                {isSv ? 'Okänd' : 'Unknown'}
              </Text>
            </TouchableOpacity>
            {hens.map((hen) => (
              <TouchableOpacity
                key={hen.id}
                style={[styles.henOption, selectedHenId === hen.id && styles.henOptionActive]}
                onPress={() => setSelectedHenId(hen.id)}
              >
                <Text style={styles.henEmoji}>🐔</Text>
                <Text style={[styles.henName, selectedHenId === hen.id && styles.henNameActive]}>
                  {hen.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Selected Hen Info */}
          {selectedHenId && (
            <View style={styles.selectedHenBadge}>
              <Text style={styles.selectedHenText}>
                ✓ {isSv ? 'Registreras på' : 'Will be registered to'}: {preSelectedHenName || hens.find(h => h.id === selectedHenId)?.name}
              </Text>
            </View>
          )}
          
          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>{isSv ? 'Avbryt' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    marginTop: 16,
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  quickBtnDisabled: {
    opacity: 0.5,
  },
  quickBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  customRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customInput: {
    flex: 1,
    height: 56,
    minWidth: 140,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  customAddBtn: {
    height: 50,
    paddingHorizontal: 24,
    backgroundColor: colors.success,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddBtnDisabled: {
    opacity: 0.5,
  },
  customAddBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  henScroll: {
    marginBottom: 8,
  },
  henScrollContent: {
    paddingRight: 16,
  },
  henOption: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  henOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  henEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  henName: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  henNameActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedHenBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  selectedHenText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
