import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const GOOGLE_AUTH_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/auth/v1/env/oauth/google`;

type AuthMode = 'welcome' | 'login' | 'register' | 'forgot' | 'verify-code' | 'new-password';

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, forgotPassword, verifyResetCode, resetPasswordWithCode, isLoading, error, clearError } = useAuthStore();
  const { colors } = useThemeStore();
  
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Password reset code state
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const codeInputRefs = useRef<(TextInput | null)[]>([]);
  
  // Cooldown timer for resend code
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Start cooldown timer
  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const handleLogin = async () => {
    clearError();
    const success = await login(email, password);
    if (success) {
      router.replace('/(tabs)');
    }
  };
  
  const handleRegister = async () => {
    clearError();
    setSuccessMessage('');
    
    if (!name.trim()) {
      Alert.alert('Fel', 'Namn är obligatoriskt');
      return;
    }
    if (!acceptedTerms) {
      Alert.alert('Fel', 'Du måste godkänna användarvillkoren');
      return;
    }
    
    const result = await register(email, password, name.trim(), acceptedTerms, acceptedMarketing);
    if (result.success) {
      router.replace('/(tabs)');
    }
  };
  
  const handleForgotPassword = async () => {
    clearError();
    setSuccessMessage('');
    
    if (!email.trim()) {
      Alert.alert('Fel', 'Ange din e-postadress');
      return;
    }
    
    const result = await forgotPassword(email);
    if (result.success) {
      setSuccessMessage(result.message);
      startCooldown(); // Start 60 second cooldown
      // Move to code verification step
      setAuthMode('verify-code');
    } else {
      Alert.alert('Fel', result.message);
    }
  };
  
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    clearError();
    setSuccessMessage('');
    
    const result = await forgotPassword(email);
    if (result.success) {
      setSuccessMessage('Ny kod skickad!');
      startCooldown();
      setResetCode(['', '', '', '', '', '']);
    } else {
      Alert.alert('Fel', result.message);
    }
  };
  
  const handleCodeInput = (text: string, index: number) => {
    const newCode = [...resetCode];
    newCode[index] = text;
    setResetCode(newCode);
    
    // Auto-focus next input
    if (text && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !resetCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };
  
  const handleVerifyCode = async () => {
    clearError();
    setSuccessMessage('');
    
    const code = resetCode.join('');
    if (code.length !== 6) {
      Alert.alert('Fel', 'Ange den 6-siffriga koden');
      return;
    }
    
    const result = await verifyResetCode(email, code);
    if (result.success && result.token) {
      setResetToken(result.token);
      setSuccessMessage(result.message);
      setAuthMode('new-password');
    } else {
      Alert.alert('Fel', result.message);
    }
  };
  
  const handleResetPassword = async () => {
    clearError();
    setSuccessMessage('');
    
    if (newPassword.length < 6) {
      Alert.alert('Fel', 'Lösenordet måste vara minst 6 tecken');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Fel', 'Lösenorden matchar inte');
      return;
    }
    
    const result = await resetPasswordWithCode(resetToken, newPassword);
    if (result.success) {
      Alert.alert('Klart!', result.message, [
        { text: 'OK', onPress: () => {
          // Reset all state and go to login
          setResetCode(['', '', '', '', '', '']);
          setResetToken('');
          setNewPassword('');
          setConfirmPassword('');
          setSuccessMessage('');
          setAuthMode('login');
        }}
      ]);
    } else {
      Alert.alert('Fel', result.message);
    }
  };
  
  const handleGoogleLogin = () => {
    // For mobile, we'd need to use expo-auth-session
    // For now, show an alert that this feature needs native setup
    Alert.alert(
      'Google-inloggning',
      'Google-inloggning kräver ytterligare konfiguration för mobilappen. Använd e-post/lösenord för tillfället.',
      [{ text: 'OK' }]
    );
  };
  
  const styles = createStyles(colors);
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Brand */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🐔</Text>
            </View>
            <Text style={styles.title}>Hönsgården</Text>
            <Text style={styles.tagline}>Din digitala assistent för hönsgården</Text>
          </View>
          
          {/* Auth Card */}
          <View style={styles.authCard}>
            {/* Welcome Screen */}
            {authMode === 'welcome' && (
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>Välkommen!</Text>
                <Text style={styles.welcomeSubtitle}>
                  Håll koll på dina hönor, ägg och ekonomi – på ett enkelt sätt.
                </Text>
                
                <View style={styles.featuresGrid}>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>🥚</Text>
                    <Text style={styles.featureText}>Äggdagbok</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>🐔</Text>
                    <Text style={styles.featureText}>Hönsprofiler</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>📊</Text>
                    <Text style={styles.featureText}>Statistik</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>💰</Text>
                    <Text style={styles.featureText}>Ekonomi</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => setAuthMode('register')}
                >
                  <Text style={styles.primaryButtonText}>Kom igång gratis</Text>
                </TouchableOpacity>
                
                <View style={styles.divider}>
                  <TouchableOpacity 
                  style={styles.switchButton}
                  onPress={() => setAuthMode('login')}
                >
                  <Text style={styles.switchText}>
                    Har du redan ett konto? <Text style={styles.switchLink}>Logga in</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Login Form */}
            {authMode === 'login' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Logga in</Text>
                
                {error && <Text style={styles.errorText}>{error}</Text>}
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-postadress</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="din@email.se"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Lösenord</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? 'eye-off' : 'eye'} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity 
                  onPress={() => setAuthMode('forgot')}
                  style={styles.forgotButton}
                >
                  <Text style={styles.forgotText}>Glömt lösenord?</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.primaryButton, isLoading && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Logga in</Text>
                  )}
                </TouchableOpacity>
                
                <View style={styles.divider}>
                  <TouchableOpacity 
                  style={styles.switchButton}
                  onPress={() => setAuthMode('register')}
                >
                  <Text style={styles.switchText}>
                    Ny här? <Text style={styles.switchLink}>Skapa konto gratis</Text>
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setAuthMode('welcome')}
                >
                  <Text style={styles.backText}>← Tillbaka</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Forgot Password - Step 1: Enter Email */}
            {authMode === 'forgot' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Glömt lösenord?</Text>
                <Text style={styles.formSubtitle}>
                  Ange din e-postadress så skickar vi en 6-siffrig kod.
                </Text>
                
                {error && <Text style={styles.errorText}>{error}</Text>}
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-postadress</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="din@email.se"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                
                <TouchableOpacity 
                  style={[styles.primaryButton, isLoading && styles.disabledButton]}
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Skicka kod</Text>
                  )}
                </TouchableOpacity>
                
                <Text style={styles.supportText}>
                  Har du inget konto? Eller fått problem?{'\n'}
                  <Text 
                    style={styles.supportLink}
                    onPress={() => Linking.openURL('mailto:info@honsgarden.se')}
                  >
                    Kontakta oss
                  </Text> så hjälper vi dig.
                </Text>
                
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setAuthMode('login')}
                >
                  <Text style={styles.backText}>← Tillbaka till inloggning</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Forgot Password - Step 2: Enter Code */}
            {authMode === 'verify-code' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Ange koden</Text>
                <Text style={styles.formSubtitle}>
                  En 6-siffrig kod har skickats till{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
                
                {error && <Text style={styles.errorText}>{error}</Text>}
                {successMessage && <Text style={styles.successText}>{successMessage}</Text>}
                
                <View style={styles.codeInputContainer}>
                  {resetCode.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { codeInputRefs.current[index] = ref; }}
                      style={styles.codeInput}
                      value={digit}
                      onChangeText={(text) => handleCodeInput(text.replace(/[^0-9]/g, ''), index)}
                      onKeyPress={(e) => handleCodeKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={[styles.primaryButton, isLoading && styles.disabledButton]}
                  onPress={handleVerifyCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verifiera kod</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}
                  onPress={handleResendCode}
                  disabled={isLoading || resendCooldown > 0}
                >
                  <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
                    {resendCooldown > 0 
                      ? `Skicka ny kod (${resendCooldown}s)` 
                      : 'Skicka ny kod'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => {
                    setResetCode(['', '', '', '', '', '']);
                    setSuccessMessage('');
                    setAuthMode('forgot');
                  }}
                >
                  <Text style={styles.backText}>← Ändra e-postadress</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Forgot Password - Step 3: New Password */}
            {authMode === 'new-password' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Nytt lösenord</Text>
                <Text style={styles.formSubtitle}>
                  Välj ett nytt lösenord för ditt konto.
                </Text>
                
                {error && <Text style={styles.errorText}>{error}</Text>}
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nytt lösenord</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Minst 6 tecken"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? 'eye-off' : 'eye'} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bekräfta lösenord</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Upprepa lösenordet"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                  />
                </View>
                
                <TouchableOpacity 
                  style={[styles.primaryButton, isLoading && styles.disabledButton]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Spara nytt lösenord</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => {
                    setNewPassword('');
                    setConfirmPassword('');
                    setAuthMode('login');
                  }}
                >
                  <Text style={styles.backText}>← Avbryt</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Register Form */}
            {authMode === 'register' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Skapa konto</Text>
                <Text style={styles.formSubtitleGreen}>🎁 7 dagars gratis Premium ingår!</Text>
                
                {error && <Text style={styles.errorText}>{error}</Text>}
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Namn <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ditt namn"
                    placeholderTextColor={colors.textMuted}
                    autoComplete="name"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-postadress <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="din@email.se"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Lösenord <Text style={styles.required}>*</Text></Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Minst 6 tecken"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? 'eye-off' : 'eye'} 
                        size={20} 
                        color={colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* GDPR Consent */}
                <View style={styles.consentSection}>
                  <TouchableOpacity 
                    style={styles.checkbox}
                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                  >
                    <View style={[styles.checkboxBox, acceptedTerms && styles.checkboxChecked]}>
                      {acceptedTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxText}>
                      Jag har läst och godkänner{' '}
                      <Text 
                        style={styles.linkText}
                        onPress={() => setShowTermsModal(true)}
                      >
                        användarvillkoren och integritetspolicyn för honsgarden.se
                      </Text>
                      <Text style={styles.required}> *</Text>
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.checkbox}
                    onPress={() => setAcceptedMarketing(!acceptedMarketing)}
                  >
                    <View style={[styles.checkboxBox, acceptedMarketing && styles.checkboxChecked]}>
                      {acceptedMarketing && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxText}>
                      Jag godkänner att honsgarden.se skickar nyhetsbrev, erbjudanden och produktuppdateringar till min e-postadress.
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.primaryButton, 
                    (isLoading || !acceptedTerms || !name.trim()) && styles.disabledButton
                  ]}
                  onPress={handleRegister}
                  disabled={isLoading || !acceptedTerms || !name.trim()}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Skapa konto</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.switchButton}
                  onPress={() => setAuthMode('login')}
                >
                  <Text style={styles.switchText}>
                    Har du redan ett konto? <Text style={styles.switchLink}>Logga in</Text>
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setAuthMode('welcome')}
                >
                  <Text style={styles.backText}>← Tillbaka</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Footer */}
          <Text style={styles.footer}>© 2026 honsgarden.se</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Terms Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Användarvillkor & Integritetspolicy
              </Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                <Text style={styles.termsBold}>honsgarden.se</Text> | Senast uppdaterad: 2026-02-25{'\n\n'}
                
                <Text style={styles.termsHeading}>1. Allmänt</Text>{'\n'}
                • Dessa villkor gäller när du skapar ett konto och använder tjänsten honsgarden.se.{'\n'}
                • Genom att registrera dig bekräftar du att du har läst, förstått och godkänt dessa villkor.{'\n'}
                • Du måste vara minst 16 år gammal för att använda tjänsten.{'\n\n'}
                
                <Text style={styles.termsHeading}>2. Personuppgifter & GDPR</Text>{'\n'}
                Vi behandlar dina personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR).{'\n\n'}
                
                Vilka uppgifter vi samlar in:{'\n'}
                • Namn och e-postadress vid registrering{'\n'}
                • Uppgifter du själv lämnar i tjänsten{'\n'}
                • Tekniska data (t.ex. IP-adress, enhetstyp){'\n\n'}
                
                Dina rättigheter:{'\n'}
                • Rätt till tillgång, rättelse och radering{'\n'}
                • Rätt till dataportabilitet{'\n'}
                • Rätt att återkalla samtycke{'\n\n'}
                
                Kontakt: info@honsgarden.se{'\n\n'}
                
                <Text style={styles.termsHeading}>3. E-postkommunikation</Text>{'\n'}
                Om du godkänner kan vi kontakta dig via e-post med nyhetsbrev, erbjudanden och produktuppdateringar. Du kan avprenumerera när som helst.{'\n\n'}
                
                <Text style={styles.termsHeading}>4. Säkerhet</Text>{'\n'}
                Vi vidtar tekniska och organisatoriska åtgärder för att skydda dina personuppgifter.{'\n\n'}
                
                <Text style={styles.termsHeading}>5. Kontakt</Text>{'\n'}
                honsgarden.se{'\n'}
                E-post: info@honsgarden.se
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.modalButtonText}>Jag har läst villkoren</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  welcomeSection: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    alignItems: 'center',
    width: '40%',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
  },
  googleButton: {
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  switchButton: {
    marginTop: 20,
  },
  switchText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  switchLink: {
    color: '#4ade80',
    fontWeight: '500',
  },
  formSection: {},
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  formSubtitleGreen: {
    fontSize: 14,
    color: '#4ade80',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  required: {
    color: '#f87171',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    color: '#4ade80',
    fontSize: 13,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  errorText: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    color: '#f87171',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  successText: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    color: '#4ade80',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  supportText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  supportLink: {
    color: '#4ade80',
  },
  consentSection: {
    marginBottom: 20,
    gap: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
  },
  checkboxText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 20,
  },
  linkText: {
    color: '#4ade80',
    textDecorationLine: 'underline',
  },
  footer: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 400,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  termsBold: {
    fontWeight: '700',
  },
  termsHeading: {
    fontWeight: '600',
    fontSize: 15,
  },
  modalButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Password reset code styles
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  codeInput: {
    width: 45,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  emailHighlight: {
    color: '#4ade80',
    fontWeight: '500',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    color: '#4ade80',
    fontSize: 14,
  },
  resendTextDisabled: {
    color: 'rgba(74, 222, 128, 0.5)',
  },
});
