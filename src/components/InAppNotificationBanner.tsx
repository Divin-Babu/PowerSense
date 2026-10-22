import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../store/StoreContext';

export default function InAppNotificationBanner() {
  const router = useRouter();
  const { inAppToast, dismissInAppToast, isDark, themeColors } = useStore();

  if (!inAppToast || !inAppToast.visible) {
    return null;
  }

  const { title, message, type } = inAppToast;

  const colorMap = {
    success: { bg: isDark ? '#064E3B' : '#ECFDF5', border: '#10B981', icon: 'checkmark-circle' as const, iconCol: '#10B981' },
    critical: { bg: isDark ? '#7F1D1D' : '#FEF2F2', border: '#EF4444', icon: 'alert-circle' as const, iconCol: '#EF4444' },
    warning: { bg: isDark ? '#78350F' : '#FFFBEB', border: '#F59E0B', icon: 'warning' as const, iconCol: '#F59E0B' },
    info: { bg: isDark ? '#1E293B' : '#F0F9FF', border: '#0284C7', icon: 'information-circle' as const, iconCol: '#0284C7' },
  };

  const currentTheme = colorMap[type] || colorMap.info;

  const handlePress = () => {
    dismissInAppToast();
    try {
      router.push('/(tabs)/alerts');
    } catch (e) {}
  };

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={[
          styles.bannerCard,
          {
            backgroundColor: currentTheme.bg,
            borderColor: currentTheme.border,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={currentTheme.icon} size={24} color={currentTheme.iconCol} />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
            {title}
          </Text>
          {message ? (
            <Text style={[styles.message, { color: isDark ? '#CBD5E1' : '#475569' }]} numberOfLines={2}>
              {message}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={dismissInAppToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 48,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  bannerCard: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
