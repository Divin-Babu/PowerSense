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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/StoreContext';
import { loginUser, requestPasswordReset } from '../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { state, login, isDark, themeColors, toggleTheme } = useStore();

  if (state.isLoggedIn) {
    return <Redirect href={state.user?.role === 'admin' ? '/(tabs)/admin' : '/(tabs)/dashboard'} />;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'not_registered' | 'success' | 'error'>('idle');
  const [forgotFeedbackMessage, setForgotFeedbackMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email or username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setIsLoading(true);

    try {
      const res = await loginUser(cleanEmail, password);
      setIsLoading(false);
      const role = res.user?.role || (cleanEmail.includes('admin') ? 'admin' : 'user');
      const userDisplayName = res.user?.full_name || res.user?.name || (role === 'admin' ? 'System Administrator' : 'User');
      login(res.user?.email || cleanEmail, userDisplayName, role, res.user?.phone);
      if (role === 'admin') {
        router.replace('/(tabs)/admin');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Invalid username or password.');
    }
  };

  const openForgotPasswordModal = () => {
    setForgotEmail(email.trim() || '');
    setForgotStatus('idle');
    setForgotFeedbackMessage('');
    setIsForgotModalVisible(true);
  };

  const handleForgotPasswordSubmit = async () => {
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setForgotStatus('error');
      setForgotFeedbackMessage('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    setForgotStatus('idle');
    setForgotFeedbackMessage('');

    try {
      const res: any = await requestPasswordReset(cleanEmail);
      setForgotLoading(false);

      if (res && res.is_registered === false) {
        // Email does not exist in DB -> prompt to register
        setForgotStatus('not_registered');
        setForgotFeedbackMessage(
          res.message || 'This email is not registered with PowerSense. Please register to create an account.'
        );
      } else if (res && (res.success || res.is_registered)) {
        // Email exists in DB -> email sent!
        setForgotStatus('success');
        setForgotFeedbackMessage(
          res.message || `A password reset link has been sent to ${cleanEmail} from powersense2026@gmail.com.`
        );
      } else {
        setForgotStatus('not_registered');
        setForgotFeedbackMessage('No account found for this email. Please register to get started.');
      }
    } catch (err: any) {
      setForgotLoading(false);
      const msg = err?.message || '';
      if (
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('not registered') ||
        msg.toLowerCase().includes('no account')
      ) {
        setForgotStatus('not_registered');
        setForgotFeedbackMessage('This email is not registered. Please create a new account.');
      } else {
        setForgotStatus('error');
        setForgotFeedbackMessage(msg || 'Failed to send password reset email. Please try again.');
      }
    }
  };

  const handleGoToRegister = () => {
    setIsForgotModalVisible(false);
    router.push('/register');
  };

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

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.cardBorder,
                shadowColor: isDark ? '#000000' : '#000000',
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Welcome Back</Text>
            <Text style={[styles.cardSubtitle, { color: themeColors.textSecondary }]}>
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={themeColors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email / Username Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>EMAIL OR USERNAME</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={themeColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="Enter your email or username"
                  placeholderTextColor={themeColors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithLinkRow}>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>PASSWORD</Text>
                <TouchableOpacity onPress={openForgotPasswordModal} activeOpacity={0.7}>
                  <Text style={styles.forgotPassInlineLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={themeColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={themeColors.textMuted}
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
            </View>

            {/* Remember Me Option */}
            <View style={styles.optionsRow}>
              <Pressable
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: rememberMe ? '#00C48C' : themeColors.inputBg,
                      borderColor: rememberMe ? '#00C48C' : themeColors.inputBorder,
                    },
                  ]}
                >
                  {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
                <Text style={[styles.rememberText, { color: themeColors.textSecondary }]}>
                  Remember my login
                </Text>
              </Pressable>
            </View>

            {/* Sign In CTA Button */}
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.88}
              accessibilityRole="button"
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
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer Navigation Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* FORGOT PASSWORD MODAL */}
        <Modal
          visible={isForgotModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsForgotModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setIsForgotModalVisible(false)}
            />

            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="key-outline" size={22} color="#00C48C" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>Forgot Password</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsForgotModalVisible(false)}
                  style={styles.closeModalBtn}
                >
                  <Ionicons name="close" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Status Feedbacks */}
              {forgotStatus === 'error' && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={themeColors.danger} />
                  <Text style={styles.errorText}>{forgotFeedbackMessage}</Text>
                </View>
              )}

              {/* NOT REGISTERED FEEDBACK */}
              {forgotStatus === 'not_registered' && (
                <View style={styles.notRegisteredBox}>
                  <View style={styles.notRegisteredHeader}>
                    <Ionicons name="person-add-outline" size={20} color="#F59E0B" />
                    <Text style={styles.notRegisteredTitle}>Account Not Found</Text>
                  </View>
                  <Text style={styles.notRegisteredText}>
                    {forgotFeedbackMessage || "We couldn't find an account registered with this email address."}
                  </Text>
                  <TouchableOpacity
                    style={styles.registerNowBtn}
                    onPress={handleGoToRegister}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.registerNowBtnText}>Register New Account</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* SUCCESS FEEDBACK */}
              {forgotStatus === 'success' ? (
                <View style={styles.successBox}>
                  <View style={styles.successIconCircle}>
                    <Ionicons name="checkmark-circle" size={44} color="#00C48C" />
                  </View>
                  <Text style={[styles.successTitle, { color: themeColors.text }]}>
                    Check Your Inbox!
                  </Text>
                  <Text style={[styles.successDesc, { color: themeColors.textSecondary }]}>
                    A password reset link has been sent to{' '}
                    <Text style={{ fontWeight: '700', color: themeColors.text }}>{forgotEmail}</Text>.
                  </Text>
                  <Text style={styles.successSubDesc}>
                    Click the link in the email to set your new password.
                  </Text>
                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => setIsForgotModalVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.doneBtnText}>Back to Sign In</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={[styles.modalDesc, { color: themeColors.textSecondary }]}>
                    Enter the email address associated with your account.
                  </Text>

                  {/* Email Input Field */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>YOUR REGISTERED EMAIL</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: themeColors.inputBg,
                          borderColor: themeColors.inputBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={19}
                        color={themeColors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: themeColors.text }]}
                        value={forgotEmail}
                        onChangeText={(txt) => {
                          setForgotEmail(txt);
                          if (forgotStatus !== 'idle') setForgotStatus('idle');
                        }}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoFocus={true}
                      />
                    </View>
                  </View>

                  {/* Actions */}
                  <TouchableOpacity
                    style={styles.sendResetBtn}
                    onPress={handleForgotPasswordSubmit}
                    disabled={forgotLoading}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={['#00D589', '#00A86B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientBtn}
                    >
                      {forgotLoading ? (
                        <>
                          <ActivityIndicator color="#FFFFFF" size="small" />
                          <Text style={styles.signInBtnText}>Verifying & Sending...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.signInBtnText}>Send Reset Link</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    fontSize: 13,
    fontWeight: '500',
  },
  signInBtn: {
    marginTop: 8,
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
  signInBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  labelWithLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassInlineLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00C48C',
  },
  forgotPassLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00C48C',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 196, 140, 0.25)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 10,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  sendResetBtn: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  notRegisteredBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  notRegisteredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  notRegisteredTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  notRegisteredText: {
    fontSize: 13,
    color: '#D97706',
    lineHeight: 18,
    marginBottom: 12,
  },
  registerNowBtn: {
    backgroundColor: '#00C48C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  registerNowBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  successIconCircle: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 10,
  },
  successSubDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#00C48C',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00C48C',
  },
});
