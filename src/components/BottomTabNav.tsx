import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useStore } from '../store/useStore';
import { ScreenType } from '../types';

export const BottomTabNav: React.FC = () => {
  const { state, setScreen } = useStore();
  const insets = useSafeAreaInsets();
  const current = state.currentScreen;
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 10);

  const navItems: { id: ScreenType; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Home', icon: '🏠' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'alerts', label: 'Alerts', icon: '🔔', badge: state.alerts.length },
    { id: 'rag', label: 'RAG AI', icon: '🧠' },
    { id: 'settings', label: 'Hardware', icon: '⚙️' }
  ];

  return (
    <View style={[styles.dockContainer, { bottom: bottomInset + 10 }]}>
      <View style={styles.dockInner}>
        {navItems.map((item) => {
          const isActive = current === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navBtn, isActive && styles.navBtnActive]}
              onPress={() => setScreen(item.id)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {item.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 50
  },
  dockInner: {
    flexDirection: 'row',
    backgroundColor: colors.obsidianCard,
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    gap: 4
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  navBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)'
  },
  navIcon: {
    fontSize: 16
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginTop: 2
  },
  navLabelActive: {
    color: colors.cyberCyan,
    fontWeight: '800'
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.cyberCrimson,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.onSurface
  }
});
