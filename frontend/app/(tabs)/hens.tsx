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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import i18n from '../../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Hen {
  id: string;
  name: string;
  breed?: string;
  color?: string;
  birth_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

const HEN_COLORS = [
  { value: 'brown', label: 'Brun', color: '#8B4513' },
  { value: 'white', label: 'Vit', color: '#F5F5F5' },
  { value: 'black', label: 'Svart', color: '#2D2D2D' },
  { value: 'red', label: 'Röd', color: '#CD5C5C' },
  { value: 'gold', label: 'Guld', color: '#DAA520' },
  { value: 'gray', label: 'Grå', color: '#808080' },
  { value: 'mixed', label: 'Blandad', color: 'linear' },
];

export default function HensScreen() {
  const { colors, isDark } = useThemeStore();
  const [hens, setHens] = useState<Hen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHen, setEditingHen] = useState<Hen | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  const t = i18n.t.bind(i18n);
  const isSv = i18n.locale.startsWith('sv');
  
  useEffect(() => {
    loadHens();
  }, []);
  
  const loadHens = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hens`);
      if (response.ok) {
        const data = await response.json();
        setHens(data);
      }
    } catch (error) {
      console.error('Failed to load hens:', error);
    }
    setLoading(false);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadHens();
    setRefreshing(false);
  };
  
  const resetForm = () => {
    setName('');
    setBreed('');
    setSelectedColor('');
    setNotes('');
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
        await loadHens();
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
              await loadHens();
            } catch (error) {
              console.error('Failed to delete hen:', error);
            }
          },
        },
      ]
    );
  };
  
  const getColorStyle = (colorValue: string) => {
    const colorInfo = HEN_COLORS.find(c => c.value === colorValue);
    return colorInfo?.color || '#808080';
  };
  
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
        
        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>
            {isSv ? 'Lägg till höna' : 'Add hen'}
          </Text>
        </TouchableOpacity>
        
        {/* Hens List */}
        {hens.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {isSv ? 'Inga hönor ännu' : 'No hens yet'}
            </Text>
            <Text style={styles.emptyText}>
              {isSv 
                ? 'Lägg till dina hönor för att kunna följa deras äggproduktion individuellt!'
                : 'Add your hens to track their egg production individually!'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.hensList}>
            {hens.map((hen) => (
              <TouchableOpacity
                key={hen.id}
                style={styles.henCard}
                onPress={() => openEditModal(hen)}
                onLongPress={() => handleDelete(hen)}
              >
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
                  {hen.breed && (
                    <Text style={styles.henBreed}>{hen.breed}</Text>
                  )}
                  {hen.notes && (
                    <Text style={styles.henNotes} numberOfLines={1}>{hen.notes}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Add/Edit Modal */}
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
            
            {/* Name Input */}
            <Text style={styles.inputLabel}>{isSv ? 'Namn' : 'Name'} *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder={isSv ? 'T.ex. Gull-Britt' : 'E.g. Henrietta'}
              placeholderTextColor={colors.textMuted}
            />
            
            {/* Breed Input */}
            <Text style={styles.inputLabel}>{isSv ? 'Ras (valfritt)' : 'Breed (optional)'}</Text>
            <TextInput
              style={styles.textInput}
              value={breed}
              onChangeText={setBreed}
              placeholder={isSv ? 'T.ex. Skånsk blåmmehöna' : 'E.g. Rhode Island Red'}
              placeholderTextColor={colors.textMuted}
            />
            
            {/* Color Selection */}
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
                  <View style={[
                    styles.colorDot,
                    { backgroundColor: colorOption.color }
                  ]} />
                  <Text style={[
                    styles.colorLabel,
                    selectedColor === colorOption.value && styles.colorLabelSelected,
                  ]}>
                    {isSv ? colorOption.label : colorOption.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Notes Input */}
            <Text style={styles.inputLabel}>{isSv ? 'Anteckningar (valfritt)' : 'Notes (optional)'}</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={isSv ? 'T.ex. Favorithönan, värper mycket' : 'E.g. Best layer, very friendly'}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            
            {/* Buttons */}
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
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  hensList: {
    gap: 12,
  },
  henCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  henAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  henAvatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  henInfo: {
    flex: 1,
  },
  henName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  henBreed: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  henNotes: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorScroll: {
    marginBottom: 8,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: colors.primary,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  colorLabelSelected: {
    color: colors.text,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
