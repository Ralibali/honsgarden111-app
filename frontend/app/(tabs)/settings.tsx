import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';

export default function SettingsScreen() {
  const { coopSettings, fetchCoopSettings, updateCoopSettings, loading } = useAppStore();
  
  const [coopName, setCoopName] = useState('');
  const [henCount, setHenCount] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    fetchCoopSettings();
  }, []);
  
  useEffect(() => {
    if (coopSettings) {
      setCoopName(coopSettings.coop_name);
      setHenCount(coopSettings.hen_count.toString());
    }
  }, [coopSettings]);
  
  useEffect(() => {
    if (coopSettings) {
      const nameChanged = coopName !== coopSettings.coop_name;
      const countChanged = henCount !== coopSettings.hen_count.toString();
      setHasChanges(nameChanged || countChanged);
    }
  }, [coopName, henCount, coopSettings]);
  
  const handleSave = async () => {
    const count = parseInt(henCount);
    if (isNaN(count) || count < 0) {
      Alert.alert('Fel', 'Ange ett giltigt antal hönor');
      return;
    }
    
    await updateCoopSettings({
      coop_name: coopName.trim() || 'Min Hönsgård',
      hen_count: count,
    });
    
    Alert.alert('Sparat', 'Dina inställningar har sparats');
  };
  
  const adjustHenCount = (delta: number) => {
    const current = parseInt(henCount) || 0;
    const newCount = Math.max(0, current + delta);
    setHenCount(newCount.toString());
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Inställningar</Text>
          </View>
          
          {/* Coop Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hönsgård</Text>
            
            {/* Coop Name */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Namn på hönsgården</Text>
              <TextInput
                style={styles.textInput}
                value={coopName}
                onChangeText={setCoopName}
                placeholder="T.ex. Familjen Anderssons höns"
                placeholderTextColor="#666"
              />
            </View>
            
            {/* Hen Count */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Antal hönor</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => adjustHenCount(-1)}
                >
                  <Ionicons name="remove" size={24} color="#FFF" />
                </TouchableOpacity>
                
                <TextInput
                  style={styles.counterInput}
                  value={henCount}
                  onChangeText={setHenCount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#666"
                />
                
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => adjustHenCount(1)}
                >
                  <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.settingHint}>
                Uppdatera detta när du får nya hönor eller säljer/förlorar någon
              </Text>
            </View>
          </View>
          
          {/* Save Button */}
          {hasChanges && (
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>
                {loading ? 'Sparar...' : 'Spara ändringar'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Om appen</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="egg" size={24} color="#FFD93D" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Hönshus Statistik</Text>
                  <Text style={styles.infoText}>Version 1.0</Text>
                </View>
              </View>
              <Text style={styles.infoDescription}>
                Håll koll på dina höns, äggproduktion och ekonomi. 
                Perfekt för dig som vill följa upp din hönsgård!
              </Text>
            </View>
          </View>
          
          {/* Tips Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tips</Text>
            
            <View style={styles.tipCard}>
              <Ionicons name="bulb" size={20} color="#FFD93D" />
              <Text style={styles.tipText}>
                Registrera ägg dagligen för bästa statistik. Du kan swipea för att radera poster.
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <Ionicons name="calculator" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>
                Logga kostnader för foder och utrustning för att se verklig lönsamhet.
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <Ionicons name="stats-chart" size={20} color="#6B7FD7" />
              <Text style={styles.tipText}>
                Kolla statistik-sidan för att se trender och jämföra månader.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterInput: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    minWidth: 80,
  },
  settingHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
});
