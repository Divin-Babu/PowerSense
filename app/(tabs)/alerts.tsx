import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/StoreContext';
import { fetchAlertsData } from '../../src/services/api';

type AlertFilter = 'all' | 'critical' | 'warning' | 'info';

const DEFAULT_ALERTS = [
  {
    id: '1',
    title: 'High Power Usage',
    description: 'Air Conditioner load exceeded 1,450 W (+75% above thermal baseline).',
    time: '12:35 PM',
    category: 'critical',
    icon: 'alert-circle',
    iconColor: '#EF4444',
    badgeBg: '#FEE2E2',
    unread: true,
  },
  {
    id: '2',
    title: 'Unusual Usage',
    description: 'Living Room Plug was active continuously at 02:30 AM outside normal schedule.',
    time: '02:30 AM',
    category: 'warning',
    icon: 'warning',
    iconColor: '#D97706',
    badgeBg: '#FEF3C7',
    unread: true,
  },
  {
    id: '3',
    title: 'Target Achieved',
    description: 'Congratulations! You reached 78% of your 100 kWh monthly energy goal.',
    time: 'Yesterday',
    category: 'info',
    icon: 'checkmark-circle',
    iconColor: '#10B981',
    badgeBg: '#D1FAE5',
    unread: false,
  },
  {
    id: '4',
    title: 'Device Turned On',
    description: 'Living Room Plug turned ON automatically via programmed daily timer.',
    time: '14 May',
    category: 'info',
    icon: 'power',
    iconColor: '#3B82F6',
    badgeBg: '#DBEAFE',
    unread: false,
  },
];

export default function AlertsScreen() {
  const router = useRouter();
  const { state, isDark, themeColors } = useStore();

  const [activeFilter, setActiveFilter] = useState<AlertFilter>('all');
  const [alertsList, setAlertsList] = useState(DEFAULT_ALERTS);

  const loadAlerts = async (cat: string) => {
    try {
      const data: any = await fetchAlertsData(cat);
      if (data?.alerts && Array.isArray(data.alerts) && data.alerts.length > 0) {
        setAlertsList(data.alerts);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadAlerts(activeFilter);
  }, [activeFilter]);

  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (state.user?.role === 'admin') {
    return <Redirect href="/(tabs)/admin" />;
  }

  const filteredAlerts = alertsList.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Alerts & Notifications</Text>
        </View>

        {/* Filter Pills */}
        <View style={[styles.filtersWrapper, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          {[
            { key: 'all', label: 'All' },
            { key: 'critical', label: 'Warnings' },
            { key: 'info', label: 'Info' },
          ].map((item) => {
            const isSelected = activeFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter(item.key as AlertFilter)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isSelected ? '#FFFFFF' : themeColors.textSecondary },
                    isSelected && styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Alerts List */}
        <View style={styles.alertsList}>
          {filteredAlerts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.alertCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              activeOpacity={0.7}
            >
              {/* Category Colored Icon Badge */}
              <View
                style={[
                  styles.alertIconBadge,
                  {
                    backgroundColor: isDark
                      ? item.category === 'critical'
                        ? 'rgba(239, 68, 68, 0.18)'
                        : item.category === 'warning'
                        ? 'rgba(245, 158, 11, 0.18)'
                        : 'rgba(56, 189, 248, 0.18)'
                      : item.badgeBg || '#F8FAF9',
                  },
                ]}
              >
                <Ionicons name={item.icon as any} size={20} color={item.iconColor || '#00C48C'} />
              </View>

              <View style={styles.alertContent}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.alertTitle,
                      { color: themeColors.text },
                      item.category === 'critical' && { color: '#EF4444' },
                      item.category === 'warning' && { color: '#F59E0B' },
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>
                <Text style={[styles.alertTime, { color: themeColors.textMuted }]}>{item.time}</Text>
                <Text style={[styles.alertDesc, { color: themeColors.textSecondary }]}>{item.description}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
  content: {
    padding: 20,
    paddingTop: 10,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Filter Pills
  filtersWrapper: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  filterPillActive: {
    backgroundColor: '#00C48C',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    fontWeight: '700',
  },

  // Alerts List
  alertsList: {
    gap: 12,
  },
  alertCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 2,
    borderWidth: 1,
  },
  alertIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertTime: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
