import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../src/store/themeStore';
import { usePremiumStore } from '../src/store/premiumStore';
import { useRouter } from 'expo-router';
import i18n from '../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Hatching {
  id: string;
  start_date: string;
  expected_hatch_date: string;
  egg_count: number;
  hen_id?: string;
  hen_name?: string;
  incubator_name?: string;
  notes?: string;
  status: 'incubating' | 'hatched' | 'failed' | 'cancelled';
  hatched_count?: number;
  actual_hatch_date?: string;
  days_remaining: number;
  days_elapsed?: number;
  progress_percent?: number;
  is_overdue?: boolean;
  is_due_soon?: boolean;
}

interface Hen {
  id: string;
  name: string;
}

export default function HatchingScreen() {
  const { colors, isDark } = useThemeStore();
  const { isPremium } = usePremiumStore();
  const router = useRouter();
  
  const [hatchings, setHatchings] = useState<Hatching[]>([]);
  const [hens, setHens] = useState<Hen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedHatching, setSelectedHatching] = useState<Hatching | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Form state
  const [eggCount, setEggCount] = useState('');
  const [selectedHenId, setSelectedHenId] = useState<string>('');
  const [incubatorName, setIncubatorName] = useState('');
  const [notes, setNotes] = useState('');
  const [hatchDays, setHatchDays] = useState('21');
  const [saving, setSaving] = useState(false);
  
  // Complete form
  const [hatchedCount, setHatchedCount] = useState('');
  const [completeStatus, setCompleteStatus] = useState<'hatched' | 'failed'>('hatched');
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  
  useEffect(() => {
    loadData();
  }, [showHistory]);
  
  const loadData = async () => {
    try {
      const [hatchRes, hensRes] = await Promise.all([
        fetch(`${API_URL}/api/hatching?include_completed=${showHistory}`),
        fetch(`${API_URL}/api/hens?active_only=true`)
      ]);
      
      if (hatchRes.ok) {
        const data = await hatchRes.json();
        setHatchings(data);
      }
      
      if (hensRes.ok) {
        const data = await hensRes.json();
        setHens(data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const handleCreateHatching = async () => {
    if (!eggCount || parseInt(eggCount) < 1) {
      Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Ange antal ägg' : 'Enter egg count');
      return;
    }
    
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/api/hatching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: today,
          egg_count: parseInt(eggCount),
          hen_id: selectedHenId || undefined,
          incubator_name: incubatorName || undefined,
          notes: notes || undefined,
          expected_hatch_days: parseInt(hatchDays) || 21
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert('🥚', data.message);
        await loadData();
        resetForm();
        setShowAddModal(false);
      } else {
        const error = await response.json();
        Alert.alert(isSv ? 'Fel' : 'Error', error.detail || 'Kunde inte skapa kläckning');
      }
    } catch (error) {
      console.error('Failed to create hatching:', error);
    }
    setSaving(false);
  };
  
  const handleCompleteHatching = async () => {
    if (!selectedHatching) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/hatching/${selectedHatching.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: completeStatus,
          hatched_count: completeStatus === 'hatched' ? parseInt(hatchedCount) || selectedHatching.egg_count : 0
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert(completeStatus === 'hatched' ? '🐣' : '😢', data.message);
        await loadData();
        setShowCompleteModal(false);
        setSelectedHatching(null);
      }
    } catch (error) {
      console.error('Failed to complete hatching:', error);
    }
    setSaving(false);
  };
  
  const handleDeleteHatching = (hatching: Hatching) => {
    Alert.alert(
      isSv ? 'Ta bort kläckning' : 'Delete hatching',
      isSv ? 'Är du säker?' : 'Are you sure?',
      [
        { text: isSv ? 'Avbryt' : 'Cancel', style: 'cancel' },
        {
          text: isSv ? 'Ta bort' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/hatching/${hatching.id}`, { method: 'DELETE' });
              await loadData();
            } catch (error) {
              console.error('Failed to delete hatching:', error);
            }
          }
        }
      ]
    );
  };
  
  const resetForm = () => {
    setEggCount('');
    setSelectedHenId('');
    setIncubatorName('');
    setNotes('');
    setHatchDays('21');
  };
  
  const openCompleteModal = (hatching: Hatching) => {
    setSelectedHatching(hatching);
    setHatchedCount(hatching.egg_count.toString());
    setCompleteStatus('hatched');
    setShowCompleteModal(true);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hatched': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return colors.primary;
    }
  };
  
  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'hatched': return '🐣';
      case 'failed': return '😢';
      case 'cancelled': return '❌';
      default: return '🥚';
    }
  };
  
  const styles = createStyles(colors, isDark);
  
  // Show paywall if not premium
  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.backText}>{isSv ? 'Tillbaka' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.premiumRequired}>
          <Text style={styles.premiumEmoji}>🥚</Text>
          <Text style={styles.premiumTitle}>{isSv ? 'Premium-funktion' : 'Premium Feature'}</Text>
          <Text style={styles.premiumText}>
            {isSv 
              ? 'Kläckningsmodulen hjälper dig hålla koll på ruvande ägg och beräknar automatiskt kläckningsdatum.'
              : 'The hatching module helps you track incubating eggs and automatically calculates hatch dates.'
            }
          </Text>
          <TouchableOpacity 
            style={styles.upgradeBtn}
            onPress={() => router.push('/paywall')}
          >
            <Text style={styles.upgradeBtnText}>🌟 {isSv ? 'Uppgradera till Premium' : 'Upgrade to Premium'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButtonSmall} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{isSv ? 'Kläckning' : 'Hatching'}</Text>
            <Text style={styles.subtitle}>
              {isSv ? 'Håll koll på ruvande ägg' : 'Track incubating eggs'}
            </Text>
          </View>
        </View>
        
        {/* Add Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>
            {isSv ? 'Starta ny kläckning' : 'Start new hatching'}
          </Text>
        </TouchableOpacity>
        
        {/* Active Hatchings */}
        {hatchings.filter(h => h.status === 'incubating').length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isSv ? 'Aktiva kläckningar' : 'Active hatchings'}</Text>
            {hatchings.filter(h => h.status === 'incubating').map(hatching => (
              <TouchableOpacity 
                key={hatching.id}
                style={[
                  styles.hatchingCard,
                  hatching.is_due_soon && styles.hatchingDueSoon,
                  hatching.is_overdue && styles.hatchingOverdue
                ]}
                onLongPress={() => handleDeleteHatching(hatching)}
              >
                {/* Badge */}
                {hatching.is_due_soon && (
                  <View style={styles.dueSoonBadge}>
                    <Text style={styles.dueSoonText}>
                      {hatching.days_remaining === 0 
                        ? (isSv ? '🐣 Idag!' : '🐣 Today!')
                        : (isSv ? `🔔 ${hatching.days_remaining} dag${hatching.days_remaining === 1 ? '' : 'ar'} kvar` : `🔔 ${hatching.days_remaining} day${hatching.days_remaining === 1 ? '' : 's'} left`)
                      }
                    </Text>
                  </View>
                )}
                {hatching.is_overdue && (
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueText}>
                      ⚠️ {isSv ? 'Försenad' : 'Overdue'}
                    </Text>
                  </View>
                )}
                
                <View style={styles.hatchingHeader}>
                  <View style={styles.hatchingIcon}>
                    <Text style={styles.hatchingEmoji}>🥚</Text>
                  </View>
                  <View style={styles.hatchingInfo}>
                    <Text style={styles.hatchingTitle}>
                      {hatching.egg_count} {isSv ? 'ägg' : 'eggs'}
                    </Text>
                    <Text style={styles.hatchingSource}>
                      {hatching.hen_name || hatching.incubator_name || (isSv ? 'Kuvös' : 'Incubator')}
                    </Text>
                  </View>
                  <View style={styles.hatchingDays}>
                    <Text style={styles.daysCount}>{hatching.days_remaining}</Text>
                    <Text style={styles.daysLabel}>{isSv ? 'dagar' : 'days'}</Text>
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${hatching.progress_percent || 0}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {hatching.progress_percent || 0}%
                  </Text>
                </View>
                
                <View style={styles.hatchingDates}>
                  <Text style={styles.dateText}>
                    {isSv ? 'Start:' : 'Start:'} {hatching.start_date}
                  </Text>
                  <Text style={styles.dateText}>
                    {isSv ? 'Förväntat:' : 'Expected:'} {hatching.expected_hatch_date}
                  </Text>
                </View>
                
                {hatching.notes && (
                  <Text style={styles.hatchingNotes}>{hatching.notes}</Text>
                )}
                
                <TouchableOpacity 
                  style={styles.completeButton}
                  onPress={() => openCompleteModal(hatching)}
                >
                  <Text style={styles.completeButtonText}>
                    {isSv ? '✓ Markera som kläckt' : '✓ Mark as hatched'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥚</Text>
            <Text style={styles.emptyTitle}>
              {isSv ? 'Inga aktiva kläckningar' : 'No active hatchings'}
            </Text>
            <Text style={styles.emptyText}>
              {isSv 
                ? 'Starta en kläckning för att hålla koll på ruvande ägg'
                : 'Start a hatching to track incubating eggs'
              }
            </Text>
          </View>
        )}
        
        {/* History Toggle */}
        <TouchableOpacity 
          style={styles.historyToggle}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Ionicons 
            name={showHistory ? 'checkbox' : 'square-outline'} 
            size={22} 
            color={colors.primary} 
          />
          <Text style={styles.historyToggleText}>
            {isSv ? 'Visa historik' : 'Show history'}
          </Text>
        </TouchableOpacity>
        
        {/* Completed Hatchings */}
        {showHistory && hatchings.filter(h => h.status !== 'incubating').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isSv ? 'Historik' : 'History'}</Text>
            {hatchings.filter(h => h.status !== 'incubating').map(hatching => (
              <View 
                key={hatching.id}
                style={[styles.historyCard, { borderLeftColor: getStatusColor(hatching.status) }]}
              >
                <Text style={styles.historyEmoji}>{getStatusEmoji(hatching.status)}</Text>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>
                    {hatching.status === 'hatched' 
                      ? `${hatching.hatched_count}/${hatching.egg_count} ${isSv ? 'kläckta' : 'hatched'}`
                      : `${hatching.egg_count} ${isSv ? 'ägg' : 'eggs'} - ${hatching.status === 'failed' ? (isSv ? 'Misslyckad' : 'Failed') : (isSv ? 'Avbruten' : 'Cancelled')}`
                    }
                  </Text>
                  <Text style={styles.historyDate}>
                    {hatching.actual_hatch_date || hatching.start_date}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Add Hatching Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🥚 {isSv ? 'Starta kläckning' : 'Start hatching'}</Text>
            
            <Text style={styles.inputLabel}>{isSv ? 'Antal ägg' : 'Egg count'} *</Text>
            <TextInput
              style={styles.textInput}
              value={eggCount}
              onChangeText={setEggCount}
              placeholder="12"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            
            <Text style={styles.inputLabel}>{isSv ? 'Källa (valfritt)' : 'Source (optional)'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceOptions}>
              <TouchableOpacity
                style={[styles.sourceOption, !selectedHenId && !incubatorName && styles.sourceOptionSelected]}
                onPress={() => { setSelectedHenId(''); setIncubatorName('Kuvös'); }}
              >
                <Text style={styles.sourceEmoji}>📦</Text>
                <Text style={[styles.sourceText, !selectedHenId && !incubatorName && { color: colors.primary }]}>
                  {isSv ? 'Kuvös' : 'Incubator'}
                </Text>
              </TouchableOpacity>
              {hens.map(hen => (
                <TouchableOpacity
                  key={hen.id}
                  style={[styles.sourceOption, selectedHenId === hen.id && styles.sourceOptionSelected]}
                  onPress={() => { setSelectedHenId(hen.id); setIncubatorName(''); }}
                >
                  <Text style={styles.sourceEmoji}>🐔</Text>
                  <Text style={[styles.sourceText, selectedHenId === hen.id && { color: colors.primary }]}>
                    {hen.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.inputLabel}>{isSv ? 'Ruvningstid (dagar)' : 'Incubation days'}</Text>
            <View style={styles.daysSelector}>
              {['18', '21', '24', '28'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayOption, hatchDays === d && styles.dayOptionSelected]}
                  onPress={() => setHatchDays(d)}
                >
                  <Text style={[styles.dayOptionText, hatchDays === d && { color: '#FFF' }]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.daysHint}>
              {isSv ? '21 dagar för höns, 28 för ankor' : '21 days for chickens, 28 for ducks'}
            </Text>
            
            <Text style={styles.inputLabel}>{isSv ? 'Anteckningar (valfritt)' : 'Notes (optional)'}</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={isSv ? 'T.ex. ägg från grannens tupp' : 'E.g. eggs from neighbor\'s rooster'}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.5 }]}
                onPress={handleCreateHatching}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? '...' : (isSv ? 'Starta' : 'Start')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Complete Hatching Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isSv ? 'Avsluta kläckning' : 'Complete hatching'}
            </Text>
            
            <View style={styles.statusOptions}>
              <TouchableOpacity
                style={[styles.statusOption, completeStatus === 'hatched' && styles.statusOptionHatched]}
                onPress={() => setCompleteStatus('hatched')}
              >
                <Text style={styles.statusEmoji}>🐣</Text>
                <Text style={[styles.statusLabel, completeStatus === 'hatched' && { color: '#22c55e' }]}>
                  {isSv ? 'Kläckt' : 'Hatched'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusOption, completeStatus === 'failed' && styles.statusOptionFailed]}
                onPress={() => setCompleteStatus('failed')}
              >
                <Text style={styles.statusEmoji}>😢</Text>
                <Text style={[styles.statusLabel, completeStatus === 'failed' && { color: '#ef4444' }]}>
                  {isSv ? 'Misslyckad' : 'Failed'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {completeStatus === 'hatched' && (
              <>
                <Text style={styles.inputLabel}>
                  {isSv ? `Antal kläckta (av ${selectedHatching?.egg_count})` : `Number hatched (of ${selectedHatching?.egg_count})`}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={hatchedCount}
                  onChangeText={setHatchedCount}
                  keyboardType="number-pad"
                  placeholder={selectedHatching?.egg_count.toString()}
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCompleteModal(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  completeStatus === 'hatched' && { backgroundColor: '#22c55e' },
                  completeStatus === 'failed' && { backgroundColor: '#ef4444' },
                  saving && { opacity: 0.5 }
                ]}
                onPress={handleCompleteHatching}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? '...' : (isSv ? 'Spara' : 'Save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  
  // Premium required
  premiumRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  premiumEmoji: { fontSize: 64, marginBottom: 16 },
  premiumTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  premiumText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  upgradeBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  upgradeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  // Add button
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginBottom: 24, gap: 8 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  // Section
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  
  // Hatching card
  hatchingCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, position: 'relative' },
  hatchingDueSoon: { borderWidth: 2, borderColor: '#f59e0b' },
  hatchingOverdue: { borderWidth: 2, borderColor: '#ef4444' },
  dueSoonBadge: { position: 'absolute', top: -10, right: 12, backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  dueSoonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  overdueBadge: { position: 'absolute', top: -10, right: 12, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  overdueText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  hatchingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  hatchingIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  hatchingEmoji: { fontSize: 28 },
  hatchingInfo: { flex: 1 },
  hatchingTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  hatchingSource: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  hatchingDays: { alignItems: 'center' },
  daysCount: { fontSize: 28, fontWeight: '700', color: colors.primary },
  daysLabel: { fontSize: 12, color: colors.textMuted },
  
  // Progress
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  progressBar: { flex: 1, height: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, width: 40, textAlign: 'right' },
  
  hatchingDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateText: { fontSize: 13, color: colors.textMuted },
  hatchingNotes: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 12 },
  
  completeButton: { backgroundColor: colors.success, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  completeButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textSecondary },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  
  // History toggle
  historyToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  historyToggleText: { fontSize: 14, color: colors.textSecondary },
  
  // History card
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4 },
  historyEmoji: { fontSize: 24, marginRight: 12 },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  historyDate: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  textInput: { backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  
  // Source options
  sourceOptions: { marginBottom: 8 },
  sourceOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceSecondary, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: 'transparent', gap: 6 },
  sourceOptionSelected: { borderColor: colors.primary },
  sourceEmoji: { fontSize: 18 },
  sourceText: { fontSize: 14, color: colors.textSecondary },
  
  // Days selector
  daysSelector: { flexDirection: 'row', gap: 8 },
  dayOption: { flex: 1, paddingVertical: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 10, alignItems: 'center' },
  dayOptionSelected: { backgroundColor: colors.primary },
  dayOptionText: { fontSize: 16, fontWeight: '600', color: colors.text },
  daysHint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  
  // Status options
  statusOptions: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 20 },
  statusOption: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
  statusOptionHatched: { borderColor: '#22c55e' },
  statusOptionFailed: { borderColor: '#ef4444' },
  statusEmoji: { fontSize: 36, marginBottom: 8 },
  statusLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  
  // Modal buttons
  modalButtons: { flexDirection: 'row', marginTop: 24, gap: 12 },
  cancelButton: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelButtonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
