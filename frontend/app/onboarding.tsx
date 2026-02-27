import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: 1,
    title: 'Håll koll på äggen',
    subtitle: 'Enkel daglig registrering',
    description: 'Registrera dagens ägg med ett tryck. Se totaler, spåra färger och storlekar.',
    icon: 'egg',
    color: '#4ade80',
    gradientColors: ['#4ade80', '#22c55e'],
    bgGradient: ['rgba(74,222,128,0.15)', 'rgba(74,222,128,0.02)'],
    features: ['Snabb registrering', 'Färg & storlek', 'Historik & export']
  },
  {
    id: 2,
    title: 'Känn din flock',
    subtitle: 'Profiler för varje höna',
    description: 'Skapa profiler med namn, ras och foto. Se vem som presterar bäst.',
    icon: 'heart',
    color: '#f59e0b',
    gradientColors: ['#f59e0b', '#d97706'],
    bgGradient: ['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.02)'],
    features: ['Namn, ras & ålder', 'Produktionshistorik', 'Hälsoanteckningar']
  },
  {
    id: 3,
    title: 'Följ utvecklingen',
    subtitle: 'Statistik & ekonomi',
    description: 'Se trender och följ lönsamheten för din hönsgård i realtid.',
    icon: 'trending-up',
    color: '#3b82f6',
    gradientColors: ['#3b82f6', '#2563eb'],
    bgGradient: ['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.02)'],
    features: ['Grafer & trender', 'Ekonomiöversikt', 'PDF-rapporter']
  },
  {
    id: 4,
    title: 'Få smartare tips',
    subtitle: 'AI-rådgivare Agda',
    description: 'Agda analyserar din data och ger personliga råd för bättre produktion.',
    icon: 'sparkles',
    color: '#a855f7',
    gradientColors: ['#a855f7', '#9333ea'],
    bgGradient: ['rgba(168,85,247,0.15)', 'rgba(168,85,247,0.02)'],
    features: ['Personliga tips', '7-dagars prognos', 'Fråga vad som helst'],
    isPremium: true
  },
];

const ONBOARDING_KEY = '@honsgarden_onboarding_complete';

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Animated values for each slide
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Bounce animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconBounce, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  };
  
  const handleSkip = () => {
    completeOnboarding();
  };
  
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.log('Error saving onboarding status');
    }
    router.replace('/(auth)/login');
  };
  
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;
  
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;
  
  const renderSlide = ({ item, index }: { item: typeof ONBOARDING_SLIDES[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });
    
    return (
      <View style={styles.slideContainer}>
        {/* Background gradient */}
        <LinearGradient
          colors={item.bgGradient as any}
          style={styles.bgGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        
        <Animated.View style={[styles.slideContent, { opacity, transform: [{ scale }] }]}>
          {/* Animated Icon */}
          <Animated.View style={[styles.iconWrapper, { transform: [{ translateY: iconBounce }] }]}>
            <LinearGradient
              colors={item.gradientColors as any}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={item.icon as any} size={70} color="#000" />
            </LinearGradient>
            
            {/* Glow effect */}
            <View style={[styles.iconGlow, { backgroundColor: item.color }]} />
            <View style={[styles.iconGlowOuter, { backgroundColor: item.color }]} />
          </Animated.View>
          
          {/* Premium badge */}
          {item.isPremium && (
            <View style={[styles.premiumTag, { backgroundColor: item.color }]}>
              <Ionicons name="star" size={14} color="#000" />
              <Text style={styles.premiumTagText}>PREMIUM</Text>
            </View>
          )}
          
          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>
          <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
          <Text style={styles.description}>{item.description}</Text>
          
          {/* Features list */}
          <View style={styles.featuresContainer}>
            {item.features.map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={[styles.featureCheck, { backgroundColor: item.color }]}>
                  <Ionicons name="checkmark" size={14} color="#000" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  };
  
  const currentSlide = ONBOARDING_SLIDES[currentIndex];
  
  return (
    <View style={styles.container}>
      {/* Skip button */}
      <SafeAreaView style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Hönsgården</Text>
        </View>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Hoppa över</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Swipeable content */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
      />
      
      {/* Bottom Section */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSection}>
        {/* Progress dots */}
        <View style={styles.dotsContainer}>
          {ONBOARDING_SLIDES.map((slide, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 30, 10],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            
            return (
              <TouchableOpacity
                key={index}
                onPress={() => flatListRef.current?.scrollToIndex({ index, animated: true })}
              >
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity: dotOpacity,
                      backgroundColor: slide.color,
                    }
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Swipe hint */}
        {currentIndex < ONBOARDING_SLIDES.length - 1 && (
          <Text style={styles.swipeHint}>
            Svep för att bläddra
          </Text>
        )}
        
        {/* Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={currentSlide.gradientColors as any}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Kom igång!' : 'Nästa'}
            </Text>
            <Ionicons 
              name={currentIndex === ONBOARDING_SLIDES.length - 1 ? 'checkmark-circle' : 'arrow-forward-circle'} 
              size={24} 
              color="#000" 
            />
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Step counter */}
        <Text style={styles.stepCounter}>
          {currentIndex + 1} av {ONBOARDING_SLIDES.length}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  logoContainer: {
    paddingVertical: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  slideContainer: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    paddingTop: 100,
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 32,
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.4,
    top: 10,
    zIndex: 1,
  },
  iconGlowOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.15,
    top: -20,
    left: -20,
    zIndex: 0,
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  premiumTagText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 280,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    paddingTop: 16,
    backgroundColor: 'rgba(10,10,15,0.95)',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  swipeHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginBottom: 16,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  stepCounter: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
});
