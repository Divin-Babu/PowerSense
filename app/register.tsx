import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/StoreContext';
import { registerUser as registerApi, checkEmailAvailability, validateIndianPhone, validateEmailFormat } from '../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { registerUser, isDark, themeColors, toggleTheme } = useStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Live status states
  const [emailLiveState, setEmailLiveState] = useState<{ isChecking: boolean; message: string; color: string; isValid: boolean | null }>({
    isChecking: false,
    message: '',
    color: themeColors.textMuted,
    isValid: null
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validation helpers
  const phoneValidation = phone ? validateIndianPhone(phone) : null;
  const isNameValid = fullName.trim().length >= 2;
  const isPassValid = password.length >= 6;
  const isConfirmValid = Boolean(confirmPassword && confirmPassword === password);

  const handlePhoneChange = (text: string) => {
    // Strictly numeric digits only
    const numericOnly = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhone(numericOnly);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    const clean = text.trim();
    if (!clean) {
      setEmailLiveState({ isChecking: false, message: '', color: themeColors.textMuted, isValid: null });
      return;
    }
    const formatRes = validateEmailFormat(clean);
    if (!formatRes.isValid) {
      setEmailLiveState({ isChecking: false, message: formatRes.message, color: themeColors.danger, isValid: false });
      return;
    }

    setEmailLiveState({ isChecking: true, message: 'Checking availability...', color: themeColors.primary, isValid: null });

    const timer = setTimeout(async () => {
      try {
        const res: any = await checkEmailAvailability(clean);
        if (!res.available) {
          setEmailLiveState({ isChecking: false, message: res.message || 'Email is already registered.', color: themeColors.danger, isValid: false });
        } else {
          setEmailLiveState({ isChecking: false, message: '✓ Available', color: themeColors.primary, isValid: true });
        }
      } catch (e) {
        setEmailLiveState({ isChecking: false, message: '✓ Valid format', color: themeColors.primary, isValid: true });
      }
    }, 400);

    return () => clearTimeout(timer);
  };

  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'transparent', pct: '0%' };
    if (password.length < 6) return { label: 'Weak', color: themeColors.danger, pct: '33%' };
    if (password.length < 10) return { label: 'Medium', color: themeColors.warning, pct: '66%' };
    return { label: 'Strong', color: themeColors.primary, pct: '100%' };
  };

  const handleRegister = async () => {
    setErrorMessage('');

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }

    const trimmedPhone = phone.trim();
    const phoneRes = validateIndianPhone(trimmedPhone);
    if (!phoneRes.isValid) {
      setErrorMessage(`Mobile Error: ${phoneRes.message}`);
      return;
    }

    const trimmedEmail = email.trim();
    const emailRes = validateEmailFormat(trimmedEmail);
    if (!emailRes.isValid) {
      setErrorMessage(`Email Error: ${emailRes.message}`);
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerApi(trimmedName, trimmedEmail, password, phoneRes.formatted);
      setIsLoading(false);
      registerUser(res.user?.name || trimmedName, res.user?.email || trimmedEmail, res.user?.phone || phoneRes.formatted);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Registration failed. Please check inputs.');
    }
  };

  const strength = getPasswordStrength();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Interactive Theme Toggle Logo */}
          <View style={styles.headerSection}>
            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.8}
              style={[
                styles.logoBadge,
                {
                  backgroundColor: themeColors.logoBadgeBg,
                  borderColor: themeColors.logoBadgeBorder,
                },
              ]}
              accessibilityLabel="Toggle Dark and White Mode"
            >
              <Ionicons name="flash" size={36} color="#00C48C" />
            </TouchableOpacity>

            <Text style={[styles.appTitle, { color: themeColors.text }]}>
              Power<Text style={styles.appTitleHighlight}>Sense</Text>
            </Text>
            <Text style={[styles.appSubtitle, { color: themeColors.textSecondary }]}>
              Smart Energy, Smarter You
            </Text>
          </View>

          {/* Registration Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Create Account</Text>
            <Text style={[styles.cardSubtitle, { color: themeColors.textSecondary }]}>
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={themeColors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>FULL NAME</Text>
                {fullName.length > 0 && (
                  <Text style={[styles.miniStatus, { color: isNameValid ? themeColors.primary : themeColors.danger }]}>
                    {isNameValid ? '✓ Valid' : 'Min. 2 chars'}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: fullName.length > 0 ? (isNameValid ? themeColors.primary : themeColors.danger) : themeColors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={fullName.length > 0 ? (isNameValid ? themeColors.primary : themeColors.danger) : themeColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>MOBILE NUMBER</Text>
                {phone.length > 0 && (
                  <Text style={[styles.miniStatus, { color: phoneValidation?.isValid ? themeColors.primary : themeColors.danger }]}>
                    {phoneValidation?.isValid ? '✓ Valid' : phoneValidation?.message}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: phone.length > 0 ? (phoneValidation?.isValid ? themeColors.primary : themeColors.danger) : themeColors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={19}
                  color={phone.length > 0 ? (phoneValidation?.isValid ? themeColors.primary : themeColors.danger) : themeColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}

                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>EMAIL ADDRESS</Text>
                {emailLiveState.message ? (
                  <Text style={[styles.miniStatus, { color: emailLiveState.color }]}>
                    {emailLiveState.message}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: email.length > 0 && emailLiveState.isValid !== null ? (emailLiveState.isValid ? themeColors.primary : themeColors.danger) : themeColors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={email.length > 0 && emailLiveState.isValid !== null ? (emailLiveState.isValid ? themeColors.primary : themeColors.danger) : themeColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>PASSWORD</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: password.length > 0 ? (isPassValid ? themeColors.primary : themeColors.danger) : themeColors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={password.length > 0 ? (isPassValid ? themeColors.primary : themeColors.danger) : themeColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={[styles.strengthBarBg, { backgroundColor: isDark ? '#243040' : '#E2E8F0' }]}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        { width: strength.pct as any, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: strength.color }]}>
                    {strength.label} (Min. 6 chars)
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>CONFIRM PASSWORD</Text>
                {confirmPassword.length > 0 && (
                  <Text style={[styles.miniStatus, { color: isConfirmValid ? themeColors.primary : themeColors.danger }]}>
                    {isConfirmValid ? '✓ Match' : '✕ Mismatch'}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: confirmPassword.length > 0 ? (isConfirmValid ? themeColors.primary : themeColors.danger) : themeColors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={confirmPassword ? (isConfirmValid ? themeColors.primary : themeColors.danger) : themeColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            {/* Terms Agreement Checkbox */}
            <Pressable
              style={styles.termsRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: agreeTerms ? '#00C48C' : themeColors.inputBg,
                    borderColor: agreeTerms ? '#00C48C' : themeColors.inputBorder,
                  },
                ]}
              >
                {agreeTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text style={[styles.termsText, { color: themeColors.textSecondary }]}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>

            {/* Register CTA Button */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#00D589', '#00A86B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.registerBtnText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer Navigation Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingVertical: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    position: 'relative',
    shadowColor: '#00C48C',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  modeIndicatorBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 3,
  },
  themeHintBtn: {
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  themeHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  appTitleHighlight: {
    color: '#00C48C',
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  miniStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    fontSize: 13,
    flex: 1,
  },
  termsLink: {
    color: '#00C48C',
    fontWeight: '600',
  },
  registerBtn: {
    marginTop: 6,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00C48C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  gradientBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00C48C',
  },
});
