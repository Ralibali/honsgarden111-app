import React, { useEffect, useState, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import { useRouter } from 'expo-router';
import i18n from '../../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

interface Flock {
  id: string;
  name: string;
  description?: string;
}

interface Hen {
  id: string;
  name: string;
  breed?: string;
  color?: string;
  birth_date?: string;
  notes?: string;
  is_active: boolean;
  flock_id?: string;
  status: 'active' | 'sold' | 'deceased';
  status_date?: string;
  last_seen?: string;
  last_seen_warning_days: number;
  created_at: string;
}

interface HealthLog {
  id: string;
  hen_id: string;
  date: string;
  type: string;
  description?: string;
}

const HEN_COLORS = [
  { value: 'brown', label: 'Brun', color: '#8B4513' },
  { value: 'white', label: 'Vit', color: '#F5F5F5' },
  { value: 'black', label: 'Svart', color: '#2D2D2D' },
  { value: 'red', label: 'Röd', color: '#CD5C5C' },
  { value: 'gold', label: 'Guld', color: '#DAA520' },
  { value: 'gray', label: 'Grå', color: '#808080' },
  { value: 'mixed', label: 'Blandad', color: '#A0A0A0' },
];

const HEALTH_TYPES = [
  { value: 'sick', label: 'Sjuk', color: '#ef4444', emoji: '🤒' },
  { value: 'molting', label: 'Ruggning', color: '#f59e0b', emoji: '🪶' },
  { value: 'vet_visit', label: 'Veterinärbesök', color: '#6366f1', emoji: '🏥' },
  { value: 'vaccination', label: 'Vaccination', color: '#10b981', emoji: '💉' },
  { value: 'deworming', label: 'Avmaskning', color: '#8b5cf6', emoji: '💊' },
  { value: 'injury', label: 'Skada', color: '#ef4444', emoji: '🩹' },
  { value: 'recovered', label: 'Frisk', color: '#22c55e', emoji: '✅' },
  { value: 'note', label: 'Anteckning', color: '#64748b', emoji: '📝' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktiv', color: '#4ade80', emoji: '🐔' },
  { value: 'sold', label: 'Såld', color: '#f59e0b', emoji: '💰' },
  { value: 'deceased', label: 'Avliden', color: '#ef4444', emoji: '🕊️' },
];

export default function HensScreen() {
  const { colors, isDark } = useThemeStore();
  const router = useRouter();
  const [hens, setHens] = useState<Hen[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [healthLogs, setHealthLogs] = useState<Record<string, HealthLog[]>>({});
  const [henStats, setHenStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHen, setEditingHen] = useState<Hen | null>(null);
  const [selectedFlock, setSelectedFlock] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [notes, setNotes] = useState('');
  const [henFlockId, setHenFlockId] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Flock modal
  const [showFlockModal, setShowFlockModal] = useState(false);
  const [flockName, setFlockName] = useState('');
  const [flockDescription, setFlockDescription] = useState('');
  
  // Health modal
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthHenId, setHealthHenId] = useState('');
  const [healthType, setHealthType] = useState('note');
  const [healthDescription, setHealthDescription] = useState('');
  
  // Status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusHen, setStatusHen] = useState<Hen | null>(null);
  const [newStatus, setNewStatus] = useState('active');
  
  // Hen profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedHen, setSelectedHen] = useState<Hen | null>(null);
  const [henProfile, setHenProfile] = useState<any>(null);
  
  // Quick action bottom sheet
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [quickActionHen, setQuickActionHen] = useState<Hen | null>(null);
  const [addingEgg, setAddingEgg] = useState(false);
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  
  useEffect(() => {
    loadData();
  }, [showInactive]);
  
  const loadData = async () => {
    try {
      const [hensRes, flocksRes, eggsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/hens?active_only=${!showInactive}`),
        fetch(`${API_URL}/api/flocks`),
        fetch(`${API_URL}/api/eggs?limit=1000`),
        fetch(`${API_URL}/api/health-logs`)
      ]);
      
      if (hensRes.ok) {
        const data = await hensRes.json();
        setHens(data);
      }
      
      if (flocksRes.ok) {
        const data = await flocksRes.json();
        setFlocks(data);
      }
      
      if (eggsRes.ok) {
        const eggsData = await eggsRes.json();
        const stats: Record<string, number> = {};
        eggsData.forEach((egg: { hen_id?: string; count: number }) => {
          if (egg.hen_id) {
            stats[egg.hen_id] = (stats[egg.hen_id] || 0) + egg.count;
          }
        });
        setHenStats(stats);
      }
      
      if (logsRes.ok) {
        const logs: HealthLog[] = await logsRes.json();
        const logsMap: Record<string, HealthLog[]> = {};
        logs.forEach(log => {
          if (!logsMap[log.hen_id]) logsMap[log.hen_id] = [];
          logsMap[log.hen_id].push(log);
        });
        setHealthLogs(logsMap);
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
  
  const resetForm = () => {
    setName('');
    setBreed('');
    setSelectedColor('');
    setNotes('');
    setHenFlockId('');
    setEditingHen(null);
  };
  
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };
  
  const openEditModal = (hen: Hen) => {
    setEditingHen(hen);
    setName(hen.name);
    setBreed(hen.breed || '');
    setSelectedColor(hen.color || '');
    setNotes(hen.notes || '');
    setHenFlockId(hen.flock_id || '');
    setShowAddModal(true);
  };
  
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Ange ett namn' : 'Enter a name');
      return;
    }
    
    setSaving(true);
    try {
      const henData = {
        name: name.trim(),
        breed: breed.trim() || undefined,
        color: selectedColor || undefined,
        notes: notes.trim() || undefined,
        flock_id: henFlockId || undefined,
      };
      
      let response;
      if (editingHen) {
        response = await fetch(`${API_URL}/api/hens/${editingHen.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(henData),
        });
      } else {
        response = await fetch(`${API_URL}/api/hens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(henData),
        });
      }
      
      if (response.ok) {
        await loadData();
        setShowAddModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save hen:', error);
      Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Kunde inte spara' : 'Could not save');
    }
    setSaving(false);
  };
  
  const handleDelete = (hen: Hen) => {
    Alert.alert(
      isSv ? 'Ta bort höna' : 'Remove hen',
      isSv ? `Vill du ta bort ${hen.name}?` : `Remove ${hen.name}?`,
      [
        { text: isSv ? 'Avbryt' : 'Cancel', style: 'cancel' },
        {
          text: isSv ? 'Ta bort' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/hens/${hen.id}`, { method: 'DELETE' });
              await loadData();
            } catch (error) {
              console.error('Failed to delete hen:', error);
            }
          },
        },
      ]
    );
  };
  
  // Flock functions
  const handleSaveFlock = async () => {
    if (!flockName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/flocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flockName.trim(),
          description: flockDescription.trim() || undefined,
        }),
      });
      
      if (response.ok) {
        await loadData();
        setShowFlockModal(false);
        setFlockName('');
        setFlockDescription('');
      } else {
        Alert.alert(
          isSv ? 'Fel' : 'Error',
          isSv ? 'Kunde inte skapa flock. Uppgradera till Premium för obegränsade flockar.' : 'Could not create flock.'
        );
      }
    } catch (error) {
      console.error('Failed to save flock:', error);
    }
    setSaving(false);
  };
  
  // Health log functions
  const openHealthModal = (henId: string) => {
    setHealthHenId(henId);
    setHealthType('note');
    setHealthDescription('');
    setShowHealthModal(true);
  };
  
  // Quick action functions
  const openQuickAction = (hen: Hen) => {
    setQuickActionHen(hen);
    setShowQuickAction(true);
  };
  
  const handleQuickAddEgg = async (count: number) => {
    if (!quickActionHen) return;
    setAddingEgg(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/api/eggs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          count,
          hen_id: quickActionHen.id
        })
      });
      await loadData();
      // Keep modal open to allow adding more
      Alert.alert('🥚', `${count} ägg registrerat för ${quickActionHen.name}!`);
    } catch (error) {
      console.error('Failed to add egg:', error);
      Alert.alert(isSv ? 'Fel' : 'Error', isSv ? 'Kunde inte registrera ägg' : 'Could not register egg');
    }
    setAddingEgg(false);
  };
  
  const handleSaveHealth = async () => {
    if (!healthHenId) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/api/health-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hen_id: healthHenId,
          date: today,
          type: healthType,
          description: healthDescription || undefined,
        }),
      });
      await loadData();
      setShowHealthModal(false);
    } catch (error) {
      console.error('Failed to save health log:', error);
    }
    setSaving(false);
  };
  
  // Status functions
  const openStatusModal = (hen: Hen) => {
    setStatusHen(hen);
    setNewStatus(hen.status);
    setShowStatusModal(true);
  };
  
  const handleStatusChange = async () => {
    if (!statusHen) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/api/hens/${statusHen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          status_date: newStatus !== 'active' ? today : undefined,
          is_active: newStatus === 'active',
        }),
      });
      await loadData();
      setShowStatusModal(false);
      setStatusHen(null);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setSaving(false);
  };
  
  // Mark as seen
  const handleMarkSeen = async (henId: string) => {
    try {
      await fetch(`${API_URL}/api/hens/${henId}/seen`, { method: 'POST' });
      await loadData();
    } catch (error) {
      console.error('Failed to mark seen:', error);
    }
  };
  
  // Open hen profile
  const openHenProfile = async (hen: Hen) => {
    setSelectedHen(hen);
    setShowProfileModal(true);
    try {
      const res = await fetch(`${API_URL}/api/hens/${hen.id}/profile`);
      if (res.ok) {
        const data = await res.json();
        setHenProfile(data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };
  
  // Helper functions
  const getColorStyle = (colorValue: string) => {
    const colorInfo = HEN_COLORS.find(c => c.value === colorValue);
    return colorInfo?.color || '#808080';
  };
  
  const getLastSeenWarning = (hen: Hen): boolean => {
    if (!hen.last_seen) return true;
    const lastSeen = new Date(hen.last_seen);
    const daysSince = Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= (hen.last_seen_warning_days || 3);
  };
  
  const getFlockName = (flockId?: string) => {
    if (!flockId) return null;
    const flock = flocks.find(f => f.id === flockId);
    return flock?.name || null;
  };
  
  const getHealthTypeInfo = (type: string) => {
    return HEALTH_TYPES.find(t => t.value === type) || HEALTH_TYPES[7];
  };
  
  // Filter hens
  const filteredHens = hens.filter(hen => {
    if (selectedFlock !== 'all' && selectedFlock !== 'none') {
      if (hen.flock_id !== selectedFlock) return false;
    }
    if (selectedFlock === 'none' && hen.flock_id) return false;
    return true;
  });
  
  const styles = createStyles(colors, isDark);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isSv ? 'Mina Hönor' : 'My Hens'}</Text>
          <Text style={styles.subtitle}>
            {hens.length} {isSv ? 'hönor registrerade' : 'hens registered'}
          </Text>
        </View>
        
        {/* Flock Tabs */}
        <View style={styles.flockSection}>
          <View style={styles.flockHeader}>
            <Text style={styles.sectionTitle}>{isSv ? 'Flockar' : 'Flocks'}</Text>
            <TouchableOpacity style={styles.addFlockBtn} onPress={() => setShowFlockModal(true)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addFlockText}>{isSv ? 'Ny flock' : 'New flock'}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flockTabs}>
            <TouchableOpacity 
              style={[styles.flockTab, selectedFlock === 'all' && styles.flockTabActive]}
              onPress={() => setSelectedFlock('all')}
            >
              <Text style={[styles.flockTabText, selectedFlock === 'all' && styles.flockTabTextActive]}>
                {isSv ? 'Alla' : 'All'} ({hens.length})
              </Text>
            </TouchableOpacity>
            
            {flocks.map(flock => {
              const count = hens.filter(h => h.flock_id === flock.id).length;
              return (
                <TouchableOpacity 
                  key={flock.id}
                  style={[styles.flockTab, selectedFlock === flock.id && styles.flockTabActive]}
                  onPress={() => setSelectedFlock(flock.id)}
                >
                  <Text style={[styles.flockTabText, selectedFlock === flock.id && styles.flockTabTextActive]}>
                    {flock.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
            
            <TouchableOpacity 
              style={[styles.flockTab, selectedFlock === 'none' && styles.flockTabActive]}
              onPress={() => setSelectedFlock('none')}
            >
              <Text style={[styles.flockTabText, selectedFlock === 'none' && styles.flockTabTextActive]}>
                {isSv ? 'Utan flock' : 'No flock'} ({hens.filter(h => !h.flock_id).length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Show Inactive Toggle */}
        <TouchableOpacity 
          style={styles.toggleRow}
          onPress={() => setShowInactive(!showInactive)}
        >
          <Ionicons 
            name={showInactive ? 'checkbox' : 'square-outline'} 
            size={22} 
            color={colors.primary} 
          />
          <Text style={styles.toggleText}>
            {isSv ? 'Visa inaktiva (sålda/avlidna)' : 'Show inactive (sold/deceased)'}
          </Text>
        </TouchableOpacity>
        
        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>
            {isSv ? 'Lägg till höna' : 'Add hen'}
          </Text>
        </TouchableOpacity>
        
        {/* Hens List */}
        {filteredHens.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {isSv ? 'Inga hönor' : 'No hens'}
            </Text>
            <Text style={styles.emptyText}>
              {isSv 
                ? selectedFlock !== 'all' ? 'Inga hönor i denna flock' : 'Lägg till dina hönor för att följa deras äggproduktion!'
                : selectedFlock !== 'all' ? 'No hens in this flock' : 'Add your hens to track their egg production!'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.hensList}>
            {filteredHens.map((hen) => {
              const lastSeenWarning = hen.status === 'active' && getLastSeenWarning(hen);
              const statusInfo = STATUS_OPTIONS.find(s => s.value === hen.status);
              
              return (
                <TouchableOpacity
                  key={hen.id}
                  style={[
                    styles.henCard,
                    hen.status !== 'active' && styles.henCardInactive,
                    lastSeenWarning && styles.henCardWarning
                  ]}
                  onPress={() => openQuickAction(hen)}
                  onLongPress={() => handleDelete(hen)}
                >
                  {/* Status Badge */}
                  {hen.status !== 'active' && (
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo?.color }]}>
                      <Text style={styles.statusBadgeText}>
                        {statusInfo?.emoji} {statusInfo?.label}
                      </Text>
                    </View>
                  )}
                  
                  {/* Warning Badge */}
                  {lastSeenWarning && (
                    <View style={styles.warningBadge}>
                      <Text style={styles.warningBadgeText}>⚠️ {isSv ? 'Ej sedd på länge' : 'Not seen recently'}</Text>
                    </View>
                  )}
                  
                  <View style={styles.henCardContent}>
                    <View style={[
                      styles.henAvatar,
                      { backgroundColor: getColorStyle(hen.color || 'brown') + '33' }
                    ]}>
                      <Text style={styles.henAvatarText}>
                        {hen.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    
                    <View style={styles.henInfo}>
                      <Text style={styles.henName}>{hen.name}</Text>
                      {hen.breed && <Text style={styles.henBreed}>{hen.breed}</Text>}
                      {getFlockName(hen.flock_id) && (
                        <View style={styles.flockBadge}>
                          <Text style={styles.flockBadgeText}>{getFlockName(hen.flock_id)}</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.henStatsColumn}>
                      <Text style={styles.henEggCount}>{henStats[hen.id] || 0}</Text>
                      <Text style={styles.henEggLabel}>{isSv ? 'ägg' : 'eggs'}</Text>
                    </View>
                  </View>
                  
                  {/* Last Seen Row */}
                  {hen.status === 'active' && (
                    <View style={styles.lastSeenRow}>
                      <Text style={styles.lastSeenText}>
                        {isSv ? 'Senast sedd:' : 'Last seen:'} {hen.last_seen || (isSv ? 'Aldrig' : 'Never')}
                      </Text>
                      <TouchableOpacity 
                        style={styles.markSeenBtn}
                        onPress={() => handleMarkSeen(hen.id)}
                      >
                        <Text style={styles.markSeenText}>✓ {isSv ? 'Sedd' : 'Seen'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {/* Action Buttons */}
                  <View style={styles.henActions}>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => openHealthModal(hen.id)}
                    >
                      <Text style={styles.actionBtnText}>🩺 {isSv ? 'Hälsa' : 'Health'}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => openStatusModal(hen)}
                    >
                      <Text style={styles.actionBtnText}>📋 Status</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => openEditModal(hen)}
                    >
                      <Text style={styles.actionBtnText}>✏️ {isSv ? 'Ändra' : 'Edit'}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Health Log Preview */}
                  {healthLogs[hen.id] && healthLogs[hen.id].length > 0 && (
                    <View style={styles.healthPreview}>
                      <Text style={styles.healthPreviewTitle}>
                        📋 {isSv ? 'Senaste hälsologg' : 'Latest health log'}
                      </Text>
                      {(() => {
                        const log = healthLogs[hen.id][0];
                        const typeInfo = getHealthTypeInfo(log.type);
                        return (
                          <View style={[styles.healthLogItem, { borderLeftColor: typeInfo.color }]}>
                            <Text style={styles.healthLogType}>{typeInfo.emoji} {typeInfo.label}</Text>
                            <Text style={styles.healthLogDate}>{log.date}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      
      {/* Add/Edit Hen Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingHen 
                ? (isSv ? 'Redigera höna' : 'Edit hen')
                : (isSv ? 'Lägg till höna' : 'Add hen')
              }
            </Text>
            
            <Text style={styles.inputLabel}>{isSv ? 'Namn' : 'Name'} *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder={isSv ? 'T.ex. Gull-Britt' : 'E.g. Henrietta'}
              placeholderTextColor={colors.textMuted}
            />
            
            <Text style={styles.inputLabel}>{isSv ? 'Flock (valfritt)' : 'Flock (optional)'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flockSelect}>
              <TouchableOpacity
                style={[styles.flockOption, !henFlockId && styles.flockOptionSelected]}
                onPress={() => setHenFlockId('')}
              >
                <Text style={[styles.flockOptionText, !henFlockId && styles.flockOptionTextSelected]}>
                  {isSv ? 'Ingen flock' : 'No flock'}
                </Text>
              </TouchableOpacity>
              {flocks.map(flock => (
                <TouchableOpacity
                  key={flock.id}
                  style={[styles.flockOption, henFlockId === flock.id && styles.flockOptionSelected]}
                  onPress={() => setHenFlockId(flock.id)}
                >
                  <Text style={[styles.flockOptionText, henFlockId === flock.id && styles.flockOptionTextSelected]}>
                    {flock.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.inputLabel}>{isSv ? 'Ras (valfritt)' : 'Breed (optional)'}</Text>
            <TextInput
              style={styles.textInput}
              value={breed}
              onChangeText={setBreed}
              placeholder={isSv ? 'T.ex. Skånsk blåmmehöna' : 'E.g. Rhode Island Red'}
              placeholderTextColor={colors.textMuted}
            />
            
            <Text style={styles.inputLabel}>{isSv ? 'Färg (valfritt)' : 'Color (optional)'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
              {HEN_COLORS.map((colorOption) => (
                <TouchableOpacity
                  key={colorOption.value}
                  style={[
                    styles.colorButton,
                    selectedColor === colorOption.value && styles.colorButtonSelected,
                  ]}
                  onPress={() => setSelectedColor(
                    selectedColor === colorOption.value ? '' : colorOption.value
                  )}
                >
                  <View style={[styles.colorDot, { backgroundColor: colorOption.color }]} />
                  <Text style={[
                    styles.colorLabel,
                    selectedColor === colorOption.value && styles.colorLabelSelected,
                  ]}>
                    {isSv ? colorOption.label : colorOption.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.inputLabel}>{isSv ? 'Anteckningar (valfritt)' : 'Notes (optional)'}</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={isSv ? 'T.ex. Favorithönan, värper mycket' : 'E.g. Best layer, very friendly'}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? t('common.loading') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Flock Modal */}
      <Modal
        visible={showFlockModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFlockModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isSv ? 'Skapa ny flock' : 'Create new flock'}</Text>
            
            <Text style={styles.inputLabel}>{isSv ? 'Namn' : 'Name'} *</Text>
            <TextInput
              style={styles.textInput}
              value={flockName}
              onChangeText={setFlockName}
              placeholder={isSv ? 'T.ex. Hönshus 1' : 'E.g. Coop 1'}
              placeholderTextColor={colors.textMuted}
            />
            
            <Text style={styles.inputLabel}>{isSv ? 'Beskrivning (valfritt)' : 'Description (optional)'}</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={flockDescription}
              onChangeText={setFlockDescription}
              placeholder={isSv ? 'T.ex. Huvudhönshuset' : 'E.g. Main coop'}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowFlockModal(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveFlock}
                disabled={saving || !flockName.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? t('common.loading') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Health Log Modal */}
      <Modal
        visible={showHealthModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHealthModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🩺 {isSv ? 'Logga hälsa' : 'Log health'}</Text>
            <Text style={styles.modalSubtitle}>
              {isSv ? 'Registrera observation för' : 'Record observation for'} {hens.find(h => h.id === healthHenId)?.name}
            </Text>
            
            <Text style={styles.inputLabel}>{isSv ? 'Kategori' : 'Category'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.healthTypeScroll}>
              {HEALTH_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.healthTypeBtn,
                    healthType === type.value && { borderColor: type.color, backgroundColor: type.color + '20' }
                  ]}
                  onPress={() => setHealthType(type.value)}
                >
                  <Text style={styles.healthTypeEmoji}>{type.emoji}</Text>
                  <Text style={[styles.healthTypeLabel, healthType === type.value && { color: type.color }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={styles.inputLabel}>{isSv ? 'Beskrivning (valfritt)' : 'Description (optional)'}</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={healthDescription}
              onChangeText={setHealthDescription}
              placeholder={isSv ? 'T.ex. Symptom, beteende...' : 'E.g. Symptoms, behavior...'}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowHealthModal(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveHealth}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? t('common.loading') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isSv ? 'Ändra status' : 'Change status'}</Text>
            <Text style={styles.modalSubtitle}>
              {isSv ? 'Välj status för' : 'Select status for'} {statusHen?.name}
            </Text>
            
            <View style={styles.statusOptions}>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.statusOption,
                    newStatus === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '20' }
                  ]}
                  onPress={() => setNewStatus(opt.value)}
                >
                  <Text style={styles.statusEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.statusLabel, newStatus === opt.value && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleStatusChange}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? t('common.loading') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Hen Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowProfileModal(false); setHenProfile(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedHen && (
                <>
                  <Text style={styles.modalTitle}>{selectedHen.name}</Text>
                  
                  {henProfile?.last_seen_warning && (
                    <View style={styles.profileWarning}>
                      <Text style={styles.profileWarningText}>
                        ⚠️ {isSv ? `Ej sedd på ${henProfile.days_since_seen} dagar!` : `Not seen for ${henProfile.days_since_seen} days!`}
                      </Text>
                      <TouchableOpacity 
                        style={styles.markSeenBtnProfile}
                        onPress={() => { handleMarkSeen(selectedHen.id); setShowProfileModal(false); }}
                      >
                        <Text style={styles.markSeenText}>✓ {isSv ? 'Markera som sedd' : 'Mark as seen'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {henProfile?.statistics?.no_eggs_warning && (
                    <View style={[styles.profileWarning, { backgroundColor: '#fef3c7' }]}>
                      <Text style={[styles.profileWarningText, { color: '#92400e' }]}>
                        🥚 {isSv ? `Ingen värpning på ${henProfile.statistics.days_since_egg}+ dagar` : `No eggs for ${henProfile.statistics.days_since_egg}+ days`}
                      </Text>
                    </View>
                  )}
                  
                  {/* Stats Grid */}
                  {henProfile?.statistics && (
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{henProfile.statistics.total_eggs}</Text>
                        <Text style={styles.statLabel}>{isSv ? 'Totalt' : 'Total'}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{henProfile.statistics.eggs_this_week}</Text>
                        <Text style={styles.statLabel}>{isSv ? 'Denna vecka' : 'This week'}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{henProfile.statistics.weekly_average}</Text>
                        <Text style={styles.statLabel}>{isSv ? 'Snitt/v' : 'Avg/w'}</Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Health Timeline */}
                  <Text style={styles.profileSectionTitle}>🩺 {isSv ? 'Hälsohistorik' : 'Health history'}</Text>
                  {henProfile?.health_logs?.length > 0 ? (
                    henProfile.health_logs.slice(0, 5).map((log: HealthLog) => {
                      const typeInfo = getHealthTypeInfo(log.type);
                      return (
                        <View key={log.id} style={[styles.timelineItem, { borderLeftColor: typeInfo.color }]}>
                          <Text style={styles.timelineType}>{typeInfo.emoji} {typeInfo.label}</Text>
                          <Text style={styles.timelineDate}>{log.date}</Text>
                          {log.description && <Text style={styles.timelineDesc}>{log.description}</Text>}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noDataText}>{isSv ? 'Ingen hälsohistorik' : 'No health history'}</Text>
                  )}
                </>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeProfileBtn}
              onPress={() => { setShowProfileModal(false); setHenProfile(null); }}
            >
              <Text style={styles.closeProfileBtnText}>{isSv ? 'Stäng' : 'Close'}</Text>
            </TouchableOpacity>
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
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  
  // Flock Section
  flockSection: { marginBottom: 16 },
  flockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  addFlockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addFlockText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  flockTabs: { marginBottom: 8 },
  flockTab: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.surface, borderRadius: 20,
    marginRight: 8, borderWidth: 1, borderColor: colors.border,
  },
  flockTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  flockTabText: { fontSize: 14, color: colors.textSecondary },
  flockTabTextActive: { color: '#FFF', fontWeight: '600' },
  
  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  toggleText: { fontSize: 14, color: colors.textSecondary },
  
  // Add Button
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginBottom: 20, gap: 8,
  },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: 16 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  
  // Hens List
  hensList: { gap: 16 },
  henCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, position: 'relative',
  },
  henCardInactive: { opacity: 0.6 },
  henCardWarning: { borderWidth: 2, borderColor: '#f59e0b' },
  henCardContent: { flexDirection: 'row', alignItems: 'center' },
  
  // Status Badge
  statusBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  
  // Warning Badge
  warningBadge: { backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 12 },
  warningBadgeText: { color: '#f59e0b', fontSize: 12, fontWeight: '500' },
  
  // Hen Avatar
  henAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  henAvatarText: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  
  // Hen Info
  henInfo: { flex: 1 },
  henName: { fontSize: 17, fontWeight: '600', color: colors.text },
  henBreed: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  
  // Flock Badge
  flockBadge: { backgroundColor: 'rgba(99,102,241,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4, alignSelf: 'flex-start' },
  flockBadgeText: { fontSize: 11, color: '#6366f1', fontWeight: '500' },
  
  // Stats Column
  henStatsColumn: { alignItems: 'center' },
  henEggCount: { fontSize: 22, fontWeight: '700', color: '#f59e0b' },
  henEggLabel: { fontSize: 11, color: colors.textMuted },
  
  // Last Seen Row
  lastSeenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  lastSeenText: { fontSize: 12, color: colors.textMuted },
  markSeenBtn: { backgroundColor: '#4ade80', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  markSeenText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  
  // Action Buttons
  henActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: colors.surfaceSecondary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  
  // Health Preview
  healthPreview: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  healthPreviewTitle: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  healthLogItem: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderLeftWidth: 3 },
  healthLogType: { fontSize: 12, fontWeight: '500', color: colors.text },
  healthLogDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  textInput: { backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  
  // Flock Select
  flockSelect: { marginBottom: 8 },
  flockOption: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surfaceSecondary, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  flockOptionSelected: { borderColor: colors.primary },
  flockOptionText: { fontSize: 14, color: colors.textSecondary },
  flockOptionTextSelected: { color: colors.text, fontWeight: '500' },
  
  // Color Scroll
  colorScroll: { marginBottom: 8 },
  colorButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  colorButtonSelected: { borderColor: colors.primary },
  colorDot: { width: 16, height: 16, borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: colors.border },
  colorLabel: { fontSize: 14, color: colors.textSecondary },
  colorLabelSelected: { color: colors.text, fontWeight: '500' },
  
  // Health Type Scroll
  healthTypeScroll: { marginBottom: 12 },
  healthTypeBtn: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceSecondary, borderRadius: 12, marginRight: 8, borderWidth: 2, borderColor: 'transparent', minWidth: 80 },
  healthTypeEmoji: { fontSize: 24, marginBottom: 4 },
  healthTypeLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  
  // Status Options
  statusOptions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  statusOption: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
  statusEmoji: { fontSize: 32, marginBottom: 8 },
  statusLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  
  // Modal Buttons
  modalButtons: { flexDirection: 'row', marginTop: 24, gap: 12 },
  cancelButton: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelButtonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  // Profile Modal
  profileWarning: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 16 },
  profileWarningText: { color: '#dc2626', fontWeight: '500', fontSize: 14 },
  markSeenBtnProfile: { backgroundColor: '#4ade80', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: colors.surfaceSecondary, padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  profileSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  timelineItem: { backgroundColor: colors.surfaceSecondary, padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4 },
  timelineType: { fontSize: 14, fontWeight: '500', color: colors.text },
  timelineDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  timelineDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  noDataText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  closeProfileBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  closeProfileBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
