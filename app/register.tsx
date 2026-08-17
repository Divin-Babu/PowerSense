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
import { colors } from '../src/theme/colors';
import { useStore } from '../src/store/StoreContext';
import { registerUser as registerApi, checkEmailAvailability, validateIndianPhone, validateEmailFormat } from '../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { registerUser } = useStore();

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
    color: colors.textMuted,
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
    // Strictly numeric digits only: filter out any letters or special characters
    const numericOnly = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhone(numericOnly);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    const clean = text.trim();
    if (!clean) {
      setEmailLiveState({ isChecking: false, message: '', color: colors.textMuted, isValid: null });
      return;
    }
    const formatRes = validateEmailFormat(clean);
    if (!formatRes.isValid) {
      setEmailLiveState({ isChecking: false, message: formatRes.message, color: colors.danger, isValid: false });
      return;
    }

    setEmailLiveState({ isChecking: true, message: 'Checking availability...', color: colors.primary, isValid: null });

    const timer = setTimeout(async () => {
      try {
        const res: any = await checkEmailAvailability(clean);
        if (!res.available) {
          setEmailLiveState({ isChecking: false, message: res.message || 'Email is already registered.', color: colors.danger, isValid: false });
        } else {
          setEmailLiveState({ isChecking: false, message: '✓ Available', color: colors.primary, isValid: true });
        }
      } catch (e) {
        setEmailLiveState({ isChecking: false, message: '✓ Valid format', color: colors.primary, isValid: true });
      }
    }, 400);

    return () => clearTimeout(timer);
  };

  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'transparent', pct: '0%' };
    if (password.length < 6) return { label: 'Weak', color: colors.danger, pct: '33%' };
    if (password.length < 10) return { label: 'Medium', color: colors.warning, pct: '66%' };
    return { label: 'Strong', color: colors.primary, pct: '100%' };
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Logo */}
          <View style={styles.headerSection}>
            <View style={styles.logoBadge}>
              <Ionicons name="flash" size={36} color="#00C48C" />
            </View>
            <Text style={styles.appTitle}>
              Power<Text style={styles.appTitleHighlight}>Sense</Text>
            </Text>
            <Text style={styles.appSubtitle}>
              Smart Energy, Smarter You
            </Text>
          </View>

          {/* Registration Card */}
          <View style={styles.card}>
            <center><Text style={styles.cardTitle}>Create Account</Text></center>
            <Text style={styles.cardSubtitle}>

            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                {fullName.length > 0 && (
                  <Text style={[styles.miniStatus, { color: isNameValid ? colors.primary : colors.danger }]}>
                    {isNameValid ? '✓ Valid' : 'Min. 2 chars'}
                  </Text>
                )}
              </View>
              <View style={[styles.inputWrapper, fullName.length > 0 && (isNameValid ? styles.inputValid : styles.inputInvalid)]}>
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={fullName.length > 0 ? (isNameValid ? colors.primary : colors.danger) : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                {phone.length > 0 && (
                  <Text style={[styles.miniStatus, { color: phoneValidation?.isValid ? colors.primary : colors.danger }]}>
                    {phoneValidation?.isValid ? '✓ Valid' : phoneValidation?.message}
                  </Text>
                )}
              </View>
              <View style={[styles.inputWrapper, phone.length > 0 && (phoneValidation?.isValid ? styles.inputValid : styles.inputInvalid)]}>
                <Ionicons
                  name="call-outline"
                  size={19}
                  color={phone.length > 0 ? (phoneValidation?.isValid ? colors.primary : colors.danger) : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
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
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                {emailLiveState.message ? (
                  <Text style={[styles.miniStatus, { color: emailLiveState.color }]}>
                    {emailLiveState.message}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.inputWrapper, email.length > 0 && (emailLiveState.isValid === true ? styles.inputValid : emailLiveState.isValid === false ? styles.inputInvalid : null)]}>
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={email.length > 0 && emailLiveState.isValid !== null ? (emailLiveState.isValid ? colors.primary : colors.danger) : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={[styles.inputWrapper, password.length > 0 && (isPassValid ? styles.inputValid : styles.inputInvalid)]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={password.length > 0 ? (isPassValid ? colors.primary : colors.danger) : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
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
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBarBg}>
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
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                {confirmPassword.length > 0 && (
                  <Text style={[styles.miniStatus, { color: isConfirmValid ? colors.primary : colors.danger }]}>
                    {isConfirmValid ? '✓ Match' : '✕ Mismatch'}
                  </Text>
                )}
              </View>
              <View style={[styles.inputWrapper, confirmPassword.length > 0 && (isConfirmValid ? styles.inputValid : styles.inputInvalid)]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={confirmPassword ? (isConfirmValid ? colors.primary : colors.danger) : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
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
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
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
            <Text style={styles.footerText}>Already have an account?</Text>
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
    backgroundColor: '#EDF5F1',
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
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E8FBF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#00C48C',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.3,
  },
  appTitleHighlight: {
    color: '#00C48C',
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  miniStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9E7',
    paddingHorizontal: 14,
    height: 50,
  },
  inputValid: {
    borderColor: '#00C48C',
  },
  inputInvalid: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#111827',
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
    backgroundColor: '#E2E8F0',
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
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#00C48C',
    borderColor: '#00C48C',
  },
  termsText: {
    fontSize: 13,
    color: '#64748B',
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
    color: '#64748B',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00C48C',
  },
});
