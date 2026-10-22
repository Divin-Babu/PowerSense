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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/StoreContext';
import { requestPasswordReset } from '../src/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isDark, themeColors } = useStore();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'not_registered' | 'success' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setStatus('error');
      setFeedbackMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setFeedbackMessage('');

    try {
      const res: any = await requestPasswordReset(cleanEmail);
      setLoading(false);

      if (res && res.is_registered === false) {
        setStatus('not_registered');
        setFeedbackMessage(
          res.message || 'This email is not registered with PowerSense. Please create an account to proceed.'
        );
      } else if (res && (res.success || res.is_registered)) {
        setStatus('success');
        if (res.reset_token) {
          setResetToken(res.reset_token);
        }
        setFeedbackMessage(
          res.message || `A password reset link has been generated for ${cleanEmail}.`
        );
      } else {
        setStatus('not_registered');
        setFeedbackMessage('No account found with this email address. Please register.');
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || '';
      if (
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('not registered') ||
        msg.toLowerCase().includes('no account')
      ) {
        setStatus('not_registered');
        setFeedbackMessage('This email is not registered. Please create a new account.');
      } else {
        setStatus('error');
        setFeedbackMessage(msg || 'Failed to send password reset email. Please try again.');
      }
    }
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
          {/* Back Navigation Bar */}
          <View style={styles.topNav}>
            <TouchableOpacity
              onPress={() => router.replace('/login')}
              style={[
                styles.backBtn,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={themeColors.text} />
              <Text style={[styles.backBtnText, { color: themeColors.text }]}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          {/* Header Brand */}
          <View style={styles.headerSection}>
            <View
              style={[
                styles.logoBadge,
                {
                  backgroundColor: themeColors.logoBadgeBg,
                  borderColor: themeColors.logoBadgeBorder,
                },
              ]}
            >
              <Ionicons name="key-outline" size={32} color="#00C48C" />
            </View>

            <Text style={[styles.appTitle, { color: themeColors.text }]}>
              Forgot <Text style={styles.appTitleHighlight}>Password</Text>
            </Text>
            <Text style={[styles.appSubtitle, { color: themeColors.textSecondary }]}>
              Enter your registered email to reset your account password
            </Text>
          </View>

          {/* Main Card */}
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
            {/* Status Feedbacks */}
            {status === 'error' && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={themeColors.danger} />
                <Text style={styles.errorText}>{feedbackMessage}</Text>
              </View>
            )}

            {/* NOT REGISTERED FEEDBACK */}
            {status === 'not_registered' && (
              <View style={styles.notRegisteredBox}>
                <View style={styles.notRegisteredHeader}>
                  <Ionicons name="person-add-outline" size={20} color="#F59E0B" />
                  <Text style={styles.notRegisteredTitle}>Account Not Registered</Text>
                </View>
                <Text style={styles.notRegisteredText}>
                  {feedbackMessage || "This email address is not found in our records. Please register to get started."}
                </Text>
                <TouchableOpacity
                  style={styles.registerNowBtn}
                  onPress={() => router.push('/register')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.registerNowBtnText}>Register Now</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUCCESS FEEDBACK */}
            {status === 'success' ? (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={48} color="#00C48C" />
                </View>
                <Text style={[styles.successTitle, { color: themeColors.text }]}>
                  Reset Link Dispatched!
                </Text>
                <Text style={[styles.successDesc, { color: themeColors.textSecondary }]}>
                  We have sent password reset instructions from{' '}
                  <Text style={{ fontWeight: '700', color: '#00C48C' }}>powersense2026@gmail.com</Text> to{' '}
                  <Text style={{ fontWeight: '700', color: themeColors.text }}>{email.trim().toLowerCase()}</Text>.
                </Text>
                <Text style={styles.successSubDesc}>
                  Please click the link inside the email to choose a new password. Remember to check your spam/junk folder if needed.
                </Text>
                {resetToken ? (
                  <TouchableOpacity
                    style={[styles.doneBtn, { backgroundColor: '#00C48C', borderColor: '#00C48C', marginBottom: 12 }]}
                    onPress={() => router.push({ pathname: '/reset-password', params: { token: resetToken, email: email.trim().toLowerCase() } })}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.doneBtnText, { color: '#FFFFFF', fontWeight: 'bold' }]}>Reset Password Now →</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => router.replace('/login')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.doneBtnText}>Return to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.cardPrompt, { color: themeColors.textSecondary }]}>
                  We will verify if your email is registered in our database. If registered, a secure reset link will be sent from <Text style={{ color: '#00C48C', fontWeight: '600' }}>powersense2026@gmail.com</Text>.
                </Text>

                {/* Email Input Field */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>EMAIL ADDRESS</Text>
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
                      placeholder="Enter your registered email"
                      placeholderTextColor={themeColors.textMuted}
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (status !== 'idle') setStatus('idle');
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                {/* Submit CTA */}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#00D589', '#00A86B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={styles.submitBtnText}>Verifying & Sending...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Send Reset Link</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer Back */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
              Remember your password?
            </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.signInLink}>Sign In</Text>
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
    justifyContent: 'center',
    minHeight: '100%',
  },
  topNav: {
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: '#00C48C',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  appTitleHighlight: {
    color: '#00C48C',
  },
  appSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
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
  cardPrompt: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
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
    marginBottom: 14,
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
    paddingVertical: 10,
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
  submitBtn: {
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
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00C48C',
  },
});
