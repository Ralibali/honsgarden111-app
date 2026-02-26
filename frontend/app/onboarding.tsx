import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: 1,
    title: 'Välkommen till Hönsgården!',
    subtitle: 'Din digitala hjälpreda för hönsgården',
    description: 'Håll koll på ägg, hönor och ekonomi på ett enkelt sätt.',
    image: 'https://static.prod-images.emergentagent.com/jobs/dd20d512-b4a5-49be-af9c-4477666a9275/images/470cd00d8265a1a08c013c8ad326df3c5dcb3e2f13499b7ac2e2ab2cfcbe9fb2.png',
    color: '#4ade80',
    example: {
      label: 'Exempel: Dagens ägg',
      value: '24 ägg',
      detail: 'Registrera med ett tryck!'
    }
  },
  {
    id: 2,
    title: 'Lär känna din flock',
    subtitle: 'Håll koll på varje höna',
    description: 'Skapa profiler med namn, ras, ålder och egenskaper.',
    image: 'https://static.prod-images.emergentagent.com/jobs/dd20d512-b4a5-49be-af9c-4477666a9275/images/763b66fba29a555f2e56b7751e89137cac3ef4ad3b84bbef46809a8f95e06e94.png',
    color: '#f59e0b',
    example: {
      label: 'Exempel: Din flock',
      value: '12 hönor',
      detail: '🐔 Greta, Selma, Astrid...'
    }
  },
  {
    id: 3,
    title: 'Se dina resultat',
    subtitle: 'Statistik och trender',
    description: 'Följ produktionen över tid med grafer och rapporter.',
    image: 'https://static.prod-images.emergentagent.com/jobs/dd20d512-b4a5-49be-af9c-4477666a9275/images/ad1aac5e3a63314c174658400d7cb77bcdeed421ec85a1918f158a6c1bf774e2.png',
    color: '#3b82f6',
    example: {
      label: 'Exempel: Denna månad',
      value: '+23%',
      detail: '↑ Äggproduktionen ökar!'
    }
  },
  {
    id: 4,
    title: 'Träffa Agda',
    subtitle: 'Din AI-rådgivare',
    description: 'Få personliga tips, prognoser och svar på dina frågor.',
    image: 'https://static.prod-images.emergentagent.com/jobs/dd20d512-b4a5-49be-af9c-4477666a9275/images/a80bcb90250954abd2ffc8ee9525158941e86b3fa9f4bb9d065880cd116146f3.png',
    color: '#a855f7',
    example: {
      label: 'Agda säger:',
      value: '☀️ Perfekt väder!',
      detail: 'Förväntad produktion: 28 ägg'
    },
    isPremium: true
  },
];

const ONBOARDING_KEY = '@honsgarden_onboarding_complete';

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef<any>(null);
  
  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
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
  
  const currentSlide = ONBOARDING_SLIDES[currentIndex];
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Hoppa över</Text>
      </TouchableOpacity>
      
      {/* Content */}
      <View style={styles.content}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <View style={[styles.imageGlow, { backgroundColor: currentSlide.color }]} />
          <Image
            source={{ uri: currentSlide.image }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
        
        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={[styles.subtitle, { color: currentSlide.color }]}>
            {currentSlide.subtitle}
          </Text>
          <Text style={styles.description}>{currentSlide.description}</Text>
          
          {/* Example Card */}
          <View style={[styles.exampleCard, { borderColor: currentSlide.color }]}>
            {currentSlide.isPremium && (
              <View style={[styles.premiumBadge, { backgroundColor: currentSlide.color }]}>
                <Ionicons name="star" size={12} color="#000" />
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            )}
            <Text style={styles.exampleLabel}>{currentSlide.example.label}</Text>
            <Text style={[styles.exampleValue, { color: currentSlide.color }]}>
              {currentSlide.example.value}
            </Text>
            <Text style={styles.exampleDetail}>{currentSlide.example.detail}</Text>
          </View>
        </View>
      </View>
      
      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentIndex ? currentSlide.color : 'rgba(255,255,255,0.3)',
                  width: index === currentIndex ? 24 : 8,
                }
              ]}
            />
          ))}
        </View>
        
        {/* Button */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: currentSlide.color }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Kom igång!' : 'Nästa'}
          </Text>
          <Ionicons 
            name={currentIndex === ONBOARDING_SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'} 
            size={20} 
            color="#000" 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Check if onboarding is complete
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (e) {
    return false;
  }
}

// Reset onboarding (for testing)
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (e) {
    console.log('Error resetting onboarding');
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.35,
    position: 'relative',
  },
  imageGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.15,
  },
  image: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: 24,
  },
  textContent: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  exampleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  premiumBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  exampleLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  exampleValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  exampleDetail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
