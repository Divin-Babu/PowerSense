import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/StoreContext';
import { resetPassword, verifyResetToken } from '../src/services/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { isDark, themeColors } = useStore();

  const rawToken = (searchParams.token as string) || '';
  const rawEmail = (searchParams.email as string) || '';

  const [token, setToken] = useState(rawToken);
  const [email, setEmail] = useState(rawEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [tokenVerified, setTokenVerified] = useState<boolean | null>(null);
  const [tokenChecking, setTokenChecking] = useState(false);
  const [userName, setUserName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.token) {
      const tok = String(searchParams.token);
      setToken(tok);
      checkToken(tok);
    }
    if (searchParams.email) {
      setEmail(String(searchParams.email));
    }
  }, [searchParams.token, searchParams.email]);

  const checkToken = async (tok: string) => {
    if (!tok.trim()) return;
    setTokenChecking(true);
    try {
      const res: any = await verifyResetToken(tok.trim());
      setTokenChecking(false);
      if (res && res.valid) {
        setTokenVerified(true);
        if (res.email) setEmail(res.email);
        if (res.name) setUserName(res.name);
      } else {
        setTokenVerified(false);
        setErrorMessage('This password reset link is invalid or has expired.');
      }
    } catch (err: any) {
      setTokenChecking(false);
      setTokenVerified(false);
      setErrorMessage(err.message || 'Invalid or expired password reset token.');
    }
  };

  const handleReset = async () => {
    setErrorMessage('');

    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setErrorMessage('Reset token is missing. Please check your email link or paste the token.');
      return;
    }

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(trimmedToken, newPassword, confirmPassword, email);
      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to reset password. Please request a new reset link.');
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
          {/* Top Back Navigation */}
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

          {/* Header */}
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
              <Ionicons name="shield-checkmark-outline" size={34} color="#00C48C" />
            </View>

            <Text style={[styles.appTitle, { color: themeColors.text }]}>
              Set New <Text style={styles.appTitleHighlight}>Password</Text>
            </Text>
            <Text style={[styles.appSubtitle, { color: themeColors.textSecondary }]}>
              Create a secure password for your PowerSense AI account
            </Text>
          </View>

          {/* Card */}
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
            {/* SUCCESS STATE */}
            {isSuccess ? (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={54} color="#00C48C" />
                </View>
                <Text style={[styles.successTitle, { color: themeColors.text }]}>
                  Password Reset Successfully!
                </Text>
                <Text style={[styles.successDesc, { color: themeColors.textSecondary }]}>
                  Your account password has been securely updated. You can now sign in to PowerSense with your new credentials.
                </Text>
                <TouchableOpacity
                  style={styles.signInNowBtn}
                  onPress={() => router.replace('/login')}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#00D589', '#00A86B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    <Text style={styles.submitBtnText}>Sign In Now</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Account / Token verification banner */}
                {tokenChecking ? (
                  <View style={styles.checkingTokenBox}>
                    <ActivityIndicator size="small" color="#00C48C" />
                    <Text style={[styles.checkingText, { color: themeColors.textSecondary }]}>
                      Verifying security link...
                    </Text>
                  </View>
                ) : email ? (
                  <View style={styles.accountVerifiedBox}>
                    <Ionicons name="person-circle-outline" size={20} color="#00C48C" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountVerifiedLabel, { color: themeColors.textSecondary }]}>
                        Resetting password for
                      </Text>
                      <Text style={[styles.accountVerifiedEmail, { color: themeColors.text }]}>
                        {userName ? `${userName} (${email})` : email}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Error Banner */}
                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color={themeColors.danger} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Manual Token input if not provided in URL */}
                {!rawToken && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                      SECURITY TOKEN (FROM EMAIL)
                    </Text>
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
                        name="key-outline"
                        size={19}
                        color={themeColors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: themeColors.text }]}
                        placeholder="Paste reset token from email"
                        placeholderTextColor={themeColors.textMuted}
                        value={token}
                        onChangeText={setToken}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>NEW PASSWORD</Text>
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
                      placeholder="Enter new password (min. 6 characters)"
                      placeholderTextColor={themeColors.textMuted}
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
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

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>
                    CONFIRM NEW PASSWORD
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: themeColors.inputBg,
                        borderColor:
                          confirmPassword && confirmPassword !== newPassword
                            ? themeColors.danger
                            : confirmPassword && confirmPassword === newPassword
                            ? '#00C48C'
                            : themeColors.inputBorder,
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
                      placeholder="Re-enter your new password"
                      placeholderTextColor={themeColors.textMuted}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={19}
                        color={themeColors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Match / Rules Feedback */}
                {confirmPassword ? (
                  <View style={styles.rulesRow}>
                    <Ionicons
                      name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={newPassword === confirmPassword ? '#00C48C' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.rulesText,
                        {
                          color: newPassword === confirmPassword ? '#00C48C' : '#EF4444',
                        },
                      ]}
                    >
                      {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                ) : null}

                {/* Submit Reset Button */}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleReset}
                  disabled={isSubmitting}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#00D589', '#00A86B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    {isSubmitting ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={styles.submitBtnText}>Updating Password...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Save New Password</Text>
                        <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer Back Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
              Nevermind, I remember it.
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
  checkingTokenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 196, 140, 0.08)',
  },
  checkingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  accountVerifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 196, 140, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 196, 140, 0.2)',
  },
  accountVerifiedLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  accountVerifiedEmail: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
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
  rulesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 16,
  },
  rulesText: {
    fontSize: 12,
    fontWeight: '600',
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
  successBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  signInNowBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
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
