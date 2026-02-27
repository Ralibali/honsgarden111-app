import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { getAuthHeaders } from '../src/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
  is_premium: boolean;
  plan?: string;
  reminder_enabled: boolean;
  auth_provider: string;
  accepted_terms: boolean;
  accepted_marketing: boolean;
}

interface Subscription {
  user_id: string;
  email: string;
  name: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}

interface Feedback {
  id: string;
  user_id?: string;
  type: string;
  message: string;
  email?: string;
  status: string;
  created_at: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'subscriptions' | 'feedback' | 'community'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionSearchQuery, setSubscriptionSearchQuery] = useState('');
  
  // Multi-select state for users
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/check`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.is_admin === true);
        if (!data.is_admin) {
          Alert.alert('Ingen åtkomst', 'Du har inte admin-behörighet');
          router.back();
        }
      } else {
        router.back();
      }
    } catch (error) {
      router.back();
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users?limit=100`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalUsers(data.total);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const loadFeedback = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/feedback`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback);
      }
    } catch (error) {
      console.error('Failed to load feedback:', error);
    }
  };

  const loadCommunityPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/community/posts?include_hidden=true`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCommunityPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to load community posts:', error);
    }
  };

  const handleHidePost = async (postId: string) => {
    Alert.alert(
      'Dölj inlägg',
      'Är du säker på att du vill dölja detta inlägg? Det kommer inte längre synas för användare.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Dölj',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/community/posts/${postId}/hide`, {
                method: 'POST',
                credentials: 'include',
                headers: getAuthHeaders(),
              });
              if (res.ok) {
                Alert.alert('Klart', 'Inlägget har dolts');
                loadCommunityPosts();
              } else {
                Alert.alert('Fel', 'Kunde inte dölja inlägget');
              }
            } catch (error) {
              Alert.alert('Fel', 'Kunde inte ansluta till servern');
            }
          },
        },
      ]
    );
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Radera inlägg',
      'Är du säker på att du vill radera detta inlägg permanent?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Radera',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/community/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: getAuthHeaders(),
              });
              if (res.ok) {
                Alert.alert('Klart', 'Inlägget har raderats');
                loadCommunityPosts();
              } else {
                Alert.alert('Fel', 'Kunde inte radera inlägget');
              }
            } catch (error) {
              Alert.alert('Fel', 'Kunde inte ansluta till servern');
            }
          },
        },
      ]
    );
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadSubscriptions(), loadFeedback(), loadCommunityPosts()]);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    checkAdmin().then(() => loadData());
  }, []);

  const handleDeleteUser = async (userId: string, email: string) => {
    Alert.alert(
      'Radera användare',
      `Är du säker på att du vill radera ${email}? All data kommer tas bort.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Radera',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: getAuthHeaders(),
              });
              if (res.ok) {
                Alert.alert('Klart', 'Användaren har raderats');
                loadUsers();
              } else {
                Alert.alert('Fel', 'Kunde inte radera användaren');
              }
            } catch (error) {
              Alert.alert('Fel', 'Kunde inte ansluta till servern');
            }
          },
        },
      ]
    );
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Select/deselect all visible users
  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.user_id)));
    }
  };

  // Delete multiple users
  const handleDeleteSelectedUsers = async () => {
    if (selectedUsers.size === 0) return;
    
    Alert.alert(
      'Radera användare',
      `Är du säker på att du vill radera ${selectedUsers.size} användare? All data kommer tas bort.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Radera alla',
          style: 'destructive',
          onPress: async () => {
            let deleted = 0;
            let failed = 0;
            
            for (const userId of selectedUsers) {
              try {
                const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
                  method: 'DELETE',
                  credentials: 'include',
                  headers: getAuthHeaders(),
                });
                if (res.ok) {
                  deleted++;
                } else {
                  failed++;
                }
              } catch (error) {
                failed++;
              }
            }
            
            setSelectedUsers(new Set());
            setIsSelectMode(false);
            loadUsers();
            
            if (failed > 0) {
              Alert.alert('Klart', `${deleted} användare raderades, ${failed} misslyckades`);
            } else {
              Alert.alert('Klart', `${deleted} användare har raderats`);
            }
          },
        },
      ]
    );
  };

  const handleUpdateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/feedback/${feedbackId}?status=${newStatus}`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        loadFeedback();
      }
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubscriptions = subscriptions.filter(s =>
    s.email?.toLowerCase().includes(subscriptionSearchQuery.toLowerCase()) ||
    s.name?.toLowerCase().includes(subscriptionSearchQuery.toLowerCase()) ||
    s.plan?.toLowerCase().includes(subscriptionSearchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!isAdmin) {
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
        <Text style={[styles.title, { color: colors.text }]}>Admin Panel</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }}>
        <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons name="people" size={18} color={activeTab === 'users' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'users' ? '#FFF' : colors.textSecondary }]}>
              Användare ({totalUsers})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'subscriptions' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('subscriptions')}
          >
            <Ionicons name="card" size={18} color={activeTab === 'subscriptions' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'subscriptions' ? '#FFF' : colors.textSecondary }]}>
              Premium ({subscriptions.filter(s => s.is_active).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'feedback' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('feedback')}
          >
            <Ionicons name="mail" size={18} color={activeTab === 'feedback' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'feedback' ? '#FFF' : colors.textSecondary }]}>
              Feedback ({feedback.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'community' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('community')}
          >
            <Ionicons name="chatbubbles" size={18} color={activeTab === 'community' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'community' ? '#FFF' : colors.textSecondary }]}>
              Community ({communityPosts.length})
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Search (for users) */}
      {activeTab === 'users' && (
        <View>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Sök användare..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {/* Multi-select actions */}
          <View style={[styles.multiSelectBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.selectModeButton, isSelectMode && { backgroundColor: colors.primary + '20' }]}
              onPress={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedUsers(new Set());
              }}
            >
              <Ionicons 
                name={isSelectMode ? "checkbox" : "checkbox-outline"} 
                size={18} 
                color={isSelectMode ? colors.primary : colors.textSecondary} 
              />
              <Text style={{ color: isSelectMode ? colors.primary : colors.textSecondary, marginLeft: 6, fontSize: 13 }}>
                {isSelectMode ? 'Avsluta markering' : 'Markera flera'}
              </Text>
            </TouchableOpacity>
            
            {isSelectMode && (
              <>
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={toggleSelectAll}
                >
                  <Text style={{ color: colors.primary, fontSize: 13 }}>
                    {selectedUsers.size === filteredUsers.length ? 'Avmarkera alla' : 'Markera alla'}
                  </Text>
                </TouchableOpacity>
                
                {selectedUsers.size > 0 && (
                  <TouchableOpacity
                    style={[styles.deleteSelectedButton, { backgroundColor: '#ef444420' }]}
                    onPress={handleDeleteSelectedUsers}
                  >
                    <Ionicons name="trash" size={16} color="#ef4444" />
                    <Text style={{ color: '#ef4444', marginLeft: 4, fontSize: 13, fontWeight: '600' }}>
                      Radera ({selectedUsers.size})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      )}

      {/* Search (for subscriptions) */}
      {activeTab === 'subscriptions' && (
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Sök prenumerationer..."
            placeholderTextColor={colors.textSecondary}
            value={subscriptionSearchQuery}
            onChangeText={setSubscriptionSearchQuery}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Users Tab */}
          {activeTab === 'users' && (
            <View style={styles.list}>
              {filteredUsers.map((user) => (
                <TouchableOpacity 
                  key={user.user_id} 
                  style={[styles.card, { backgroundColor: colors.surface }]}
                  onPress={() => isSelectMode && toggleUserSelection(user.user_id)}
                  activeOpacity={isSelectMode ? 0.7 : 1}
                >
                  <View style={styles.cardHeader}>
                    {isSelectMode && (
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => toggleUserSelection(user.user_id)}
                      >
                        <Ionicons 
                          name={selectedUsers.has(user.user_id) ? "checkbox" : "square-outline"} 
                          size={24} 
                          color={selectedUsers.has(user.user_id) ? colors.primary : colors.textSecondary} 
                        />
                      </TouchableOpacity>
                    )}
                    <View style={[styles.userInfo, isSelectMode && { marginLeft: 12 }]}>
                      <Text style={[styles.userName, { color: colors.text }]}>{user.name || 'Okänd'}</Text>
                      <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                    </View>
                    {user.is_premium && (
                      <View style={[styles.badge, { backgroundColor: '#fbbf24' }]}>
                        <Text style={styles.badgeText}>Premium</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardDetails}>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Registrerad: {formatDate(user.created_at)}
                    </Text>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Auth: {user.auth_provider} • Terms: {user.accepted_terms ? '✓' : '✗'}
                    </Text>
                  </View>
                  {!isSelectMode && (
                    <TouchableOpacity
                      style={[styles.deleteButton, { backgroundColor: '#ef444420' }]}
                      onPress={() => handleDeleteUser(user.user_id, user.email)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      <Text style={{ color: '#ef4444', marginLeft: 4 }}>Radera</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <View style={styles.list}>
              {filteredSubscriptions.map((sub, index) => (
                <View key={`${sub.user_id}-${index}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: colors.text }]}>{sub.name || 'Okänd'}</Text>
                      <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{sub.email}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: sub.is_active ? '#22c55e' : '#ef4444' }]}>
                      <Text style={styles.badgeText}>{sub.is_active ? 'Aktiv' : 'Inaktiv'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardDetails}>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Plan: {sub.plan || 'Okänd'}
                    </Text>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Skapad: {formatDate(sub.created_at)}
                    </Text>
                    {sub.expires_at && (
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        Utgår: {formatDate(sub.expires_at)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {subscriptions.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Inga prenumerationer än
                </Text>
              )}
            </View>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <View style={styles.list}>
              {feedback.map((fb) => (
                <View key={fb.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: fb.type === 'bug' ? '#ef4444' : '#3b82f6' }]}>
                      <Text style={styles.badgeText}>{fb.type}</Text>
                    </View>
                    <View style={[styles.badge, { 
                      backgroundColor: fb.status === 'new' ? '#fbbf24' : 
                                       fb.status === 'read' ? '#3b82f6' : '#22c55e' 
                    }]}>
                      <Text style={styles.badgeText}>{fb.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.feedbackMessage, { color: colors.text }]}>{fb.message}</Text>
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {fb.email || 'Anonym'} • {formatDate(fb.created_at)}
                  </Text>
                  <View style={styles.feedbackActions}>
                    {fb.status === 'new' && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                        onPress={() => handleUpdateFeedbackStatus(fb.id, 'read')}
                      >
                        <Text style={{ color: colors.primary }}>Markera läst</Text>
                      </TouchableOpacity>
                    )}
                    {fb.status === 'read' && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#22c55e20' }]}
                        onPress={() => handleUpdateFeedbackStatus(fb.id, 'replied')}
                      >
                        <Text style={{ color: '#22c55e' }}>Markera besvarad</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              {feedback.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Ingen feedback än
                </Text>
              )}
            </View>
          )}
          
          {/* Community Tab */}
          {activeTab === 'community' && (
            <View style={styles.list}>
              {communityPosts.map((post) => (
                <View 
                  key={post.id} 
                  style={[
                    styles.card, 
                    { backgroundColor: colors.surface },
                    post.is_hidden && { opacity: 0.5, borderLeftWidth: 4, borderLeftColor: '#ef4444' }
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: colors.text }]}>{post.user_name}</Text>
                      <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                        {post.category || 'other'}
                      </Text>
                    </View>
                    {post.is_hidden && (
                      <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
                        <Text style={styles.badgeText}>Dold</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={[styles.feedbackMessage, { color: colors.text }]} numberOfLines={3}>
                    {post.content}
                  </Text>
                  
                  <View style={styles.cardDetails}>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {formatDate(post.created_at)} • {post.likes || 0} likes
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {!post.is_hidden && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#f59e0b20' }]}
                        onPress={() => handleHidePost(post.id)}
                      >
                        <Ionicons name="eye-off" size={14} color="#f59e0b" />
                        <Text style={{ color: '#f59e0b', marginLeft: 4 }}>Dölj</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#ef444420' }]}
                      onPress={() => handleDeletePost(post.id)}
                    >
                      <Ionicons name="trash" size={14} color="#ef4444" />
                      <Text style={{ color: '#ef4444', marginLeft: 4 }}>Radera</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {communityPosts.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Inga community-inlägg än
                </Text>
              )}
            </View>
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  tabs: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  list: {
    padding: 12,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 4,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  feedbackMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 8,
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    marginTop: 40,
  },
  multiSelectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    marginBottom: 8,
    borderRadius: 10,
    marginHorizontal: 12,
  },
  selectModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  checkbox: {
    marginRight: 0,
  },
});
