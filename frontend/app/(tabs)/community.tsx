import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore, getAuthHeaders } from '../../src/store/authStore';
import { usePremiumStore } from '../../src/store/premiumStore';
import i18n from '../../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface CommunityPost {
  id: string;
  user_name: string;
  content: string;
  category: string;
  category_label: string;
  created_at: string;
  likes: number;
  liked_by_me: boolean;
  is_mine: boolean;
  coop_stats?: {
    coop_name: string;
    hen_count: number;
    eggs_this_week: number;
    avg_per_day: number;
    productivity: number;
  };
}

interface Category {
  value: string;
  label: string;
}

export default function CommunityScreen() {
  const { colors } = useThemeStore();
  const { user, isAuthenticated } = useAuthStore();
  const { isPremium } = usePremiumStore();
  const isSv = i18n.locale.startsWith('sv');
  
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);
  
  const loadPosts = useCallback(async () => {
    try {
      const url = selectedCategory === 'all' 
        ? `${API_URL}/api/community/posts`
        : `${API_URL}/api/community/posts?category=${selectedCategory}`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        if (data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);
  
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };
  
  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        isSv ? 'Logga in' : 'Log in',
        isSv ? 'Du måste vara inloggad för att gilla inlägg' : 'You must be logged in to like posts'
      );
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/community/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, likes: data.likes, liked_by_me: data.action === 'liked' }
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };
  
  const handleDelete = async (postId: string) => {
    Alert.alert(
      isSv ? 'Radera inlägg' : 'Delete post',
      isSv ? 'Är du säker på att du vill radera detta inlägg?' : 'Are you sure you want to delete this post?',
      [
        { text: isSv ? 'Avbryt' : 'Cancel', style: 'cancel' },
        {
          text: isSv ? 'Radera' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/community/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: getAuthHeaders(),
              });
              
              if (response.ok) {
                setPosts(posts.filter(p => p.id !== postId));
              } else {
                const data = await response.json();
                Alert.alert('Fel', data.detail || 'Kunde inte radera inlägget');
              }
            } catch (error) {
              Alert.alert('Fel', 'Kunde inte ansluta till servern');
            }
          },
        },
      ]
    );
  };
  
  const handleSubmitPost = async () => {
    if (!newPostContent.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/community/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newPostContent.trim(),
          category: newPostCategory,
        }),
      });
      
      if (response.ok) {
        const newPost = await response.json();
        setPosts([newPost, ...posts]);
        setShowNewPostModal(false);
        setNewPostContent('');
        setNewPostCategory('other');
      } else {
        const data = await response.json();
        Alert.alert('Fel', data.detail || 'Kunde inte skapa inlägget');
      }
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte ansluta till servern');
    } finally {
      setSubmitting(false);
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return isSv ? 'Just nu' : 'Just now';
    if (minutes < 60) return `${minutes} ${isSv ? 'min sedan' : 'min ago'}`;
    if (hours < 24) return `${hours} ${isSv ? 'tim sedan' : 'h ago'}`;
    if (days < 7) return `${days} ${isSv ? 'dagar sedan' : 'd ago'}`;
    return date.toLocaleDateString('sv-SE');
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    categoryScroll: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      marginRight: 8,
    },
    categoryChipSelected: {
      backgroundColor: colors.primary,
    },
    categoryChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    categoryChipTextSelected: {
      color: '#fff',
      fontWeight: '600',
    },
    postsList: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    postCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    postAuthor: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    postTime: {
      fontSize: 12,
      color: colors.textMuted,
    },
    postCategory: {
      fontSize: 11,
      color: colors.primary,
      marginTop: 2,
    },
    postContent: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 12,
    },
    postFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    likeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
    },
    likeCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 6,
    },
    deleteButton: {
      padding: 8,
    },
    fab: {
      position: 'absolute',
      bottom: 90,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    modalCategoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
      gap: 8,
    },
    modalCategoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCategoryChipSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    modalCategoryChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    modalCategoryChipTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    textInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      fontSize: 15,
      color: colors.text,
      minHeight: 120,
      textAlignVertical: 'top',
      marginBottom: 8,
    },
    charCount: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'right',
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    submitButton: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    loginPrompt: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      margin: 16,
      alignItems: 'center',
    },
    loginPromptText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
    loginButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 20,
    },
    loginButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    freeLimit: {
      backgroundColor: colors.warning + '20',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    freeLimitText: {
      flex: 1,
      fontSize: 13,
      color: colors.warning,
      marginLeft: 10,
    },
  });
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isSv ? 'Community' : 'Community'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isSv ? 'Ställ frågor och hjälp andra hönsentusiaster' : 'Ask questions and help other chicken enthusiasts'}
        </Text>
      </View>
      
      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryChip,
              selectedCategory === cat.value && styles.categoryChipSelected
            ]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === cat.value && styles.categoryChipTextSelected
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Posts Feed */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.postsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🐔</Text>
              <Text style={styles.emptyTitle}>
                {isSv ? 'Inga inlägg ännu' : 'No posts yet'}
              </Text>
              <Text style={styles.emptyText}>
                {isSv 
                  ? 'Bli först med att ställa en fråga eller dela dina erfarenheter!'
                  : 'Be the first to ask a question or share your experiences!'}
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View>
                    <Text style={styles.postAuthor}>{post.user_name}</Text>
                    <Text style={styles.postCategory}>{post.category_label}</Text>
                  </View>
                  <Text style={styles.postTime}>{formatDate(post.created_at)}</Text>
                </View>
                
                <Text style={styles.postContent}>{post.content}</Text>
                
                <View style={styles.postFooter}>
                  <TouchableOpacity 
                    style={styles.likeButton}
                    onPress={() => handleLike(post.id)}
                  >
                    <Ionicons 
                      name={post.liked_by_me ? "heart" : "heart-outline"} 
                      size={20} 
                      color={post.liked_by_me ? "#ef4444" : colors.textSecondary} 
                    />
                    <Text style={[styles.likeCount, post.liked_by_me && { color: '#ef4444' }]}>
                      {post.likes}
                    </Text>
                  </TouchableOpacity>
                  
                  {post.is_mine && (
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDelete(post.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      
      {/* Floating Action Button */}
      {isAuthenticated && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setShowNewPostModal(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Login prompt if not authenticated */}
      {!isAuthenticated && (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>
            {isSv 
              ? 'Logga in för att skriva inlägg och delta i diskussionen'
              : 'Log in to write posts and join the discussion'}
          </Text>
        </View>
      )}
      
      {/* New Post Modal */}
      <Modal
        visible={showNewPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewPostModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowNewPostModal(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isSv ? 'Nytt inlägg' : 'New post'}
            </Text>
            
            {/* Free user limit warning */}
            {!isPremium && (
              <View style={styles.freeLimit}>
                <Ionicons name="information-circle" size={20} color={colors.warning} />
                <Text style={styles.freeLimitText}>
                  {isSv 
                    ? 'Som gratismedlem kan du skriva max 3 inlägg per dag'
                    : 'As a free member, you can write up to 3 posts per day'}
                </Text>
              </View>
            )}
            
            {/* Category selection */}
            <View style={styles.modalCategoryRow}>
              {[
                { value: 'eggs', label: '🥚 Ägg' },
                { value: 'health', label: '🐔 Hälsa' },
                { value: 'housing', label: '🏠 Hönshus' },
                { value: 'feed', label: '🍽️ Foder' },
                { value: 'other', label: '❓ Övrigt' },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.modalCategoryChip,
                    newPostCategory === cat.value && styles.modalCategoryChipSelected
                  ]}
                  onPress={() => setNewPostCategory(cat.value)}
                >
                  <Text style={[
                    styles.modalCategoryChipText,
                    newPostCategory === cat.value && styles.modalCategoryChipTextSelected
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Content input */}
            <TextInput
              style={styles.textInput}
              placeholder={isSv ? 'Skriv din fråga eller dela dina erfarenheter...' : 'Write your question or share your experiences...'}
              placeholderTextColor={colors.textMuted}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              maxLength={1000}
            />
            <Text style={styles.charCount}>{newPostContent.length}/1000</Text>
            
            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNewPostModal(false)}
              >
                <Text style={styles.cancelButtonText}>
                  {isSv ? 'Avbryt' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submitting || newPostContent.trim().length < 10) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitPost}
                disabled={submitting || newPostContent.trim().length < 10}
              >
                <Text style={styles.submitButtonText}>
                  {submitting 
                    ? (isSv ? 'Publicerar...' : 'Posting...') 
                    : (isSv ? 'Publicera' : 'Post')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
