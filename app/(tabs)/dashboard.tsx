import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useStore } from '../../src/store/StoreContext';
import { fetchDashboardData } from '../../src/services/api';

const DEFAULT_HOURLY_BARS = [
  { time: '00:00', val: 0.25 },
  { time: '02:00', val: 0.15 },
  { time: '04:00', val: 0.40 },
  { time: '06:00', val: 0.20 },
  { time: '08:00', val: 0.60 },
  { time: '10:00', val: 0.85 },
  { time: '12:00', val: 0.70 },
  { time: '14:00', val: 1.30 },
  { time: '16:00', val: 0.90 },
  { time: '18:00', val: 0.50 },
  { time: '20:00', val: 1.10 },
  { time: '22:00', val: 0.65 },
  { time: '24:00', val: 0.45 },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { state, togglePlugRelay, logout, isDark, themeColors, toggleTheme } = useStore();

  const [hourlyBars, setHourlyBars] = useState(DEFAULT_HOURLY_BARS);
  const [selectedBar, setSelectedBar] = useState<number | null>(7);
  const [activeModal, setActiveModal] = useState<'schedule' | 'timer' | null>(null);
  const [billAmount, setBillAmount] = useState('623.45');
  const [monthKwh, setMonthKwh] = useState('78.36');
  const [monthGoalPct, setMonthGoalPct] = useState('78%');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data: any = await fetchDashboardData();
        if (data) {
          if (data.today_usage?.hourly_bars && Array.isArray(data.today_usage.hourly_bars)) {
            setHourlyBars(data.today_usage.hourly_bars);
          }
          if (data.bill_estimate?.amount) {
            setBillAmount(Number(data.bill_estimate.amount).toFixed(2));
          }
          if (data.this_month?.kwh) {
            setMonthKwh(Number(data.this_month.kwh).toFixed(2));
            setMonthGoalPct(`${data.this_month.goal_pct || 78}%`);
          }
        }
      } catch (e) {}
    };
    loadData();
  }, []);

  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (state.user?.role === 'admin') {
    return <Redirect href="/(tabs)/admin" />;
  }

  const { telemetry, singlePlug, alerts } = state;
  const isRelayOn = singlePlug.relayState === 'ON';
  const alertCount = alerts.length;

  const displayWatts = isRelayOn ? (singlePlug.watts > 0 ? singlePlug.watts : 215) : 0;
  const displayAmps = isRelayOn ? (telemetry.currentAmps > 0 ? telemetry.currentAmps.toFixed(2) : '1.62') : '0.00';
  const displayVolts = telemetry.voltage > 0 ? telemetry.voltage.toFixed(0) : '230';
  const displayPf = isRelayOn ? (telemetry.powerFactor > 0 ? telemetry.powerFactor.toFixed(2) : '0.98') : '0.00';
  const displayKwh = telemetry.cumulativeKwh > 0 ? telemetry.cumulativeKwh.toFixed(2) : '2.45';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.75}
              style={[
                styles.logoBadge,
                {
                  backgroundColor: themeColors.logoBadgeBg,
                  borderColor: themeColors.logoBadgeBorder,
                },
              ]}
              accessibilityLabel="Toggle Theme Mode"
            >
              <Ionicons name="flash" size={24} color="#00C48C" />
              <View style={[styles.headerModeDot, { backgroundColor: isDark ? '#38BDF8' : '#F59E0B' }]} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.brandTitle, { color: themeColors.text }]}>
                Power<Text style={{ color: '#00C48C' }}>Sense</Text>
              </Text>
              <Text style={[styles.brandSubtitle, { color: themeColors.textSecondary }]}>Smart Energy, Smarter You</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.themeHeaderBtn,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityLabel={`Switch to ${isDark ? 'White' : 'Dark'} Mode`}
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={20}
                color={isDark ? '#FBBF24' : '#64748B'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bellBtn,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              onPress={() => router.push('/(tabs)/alerts')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={themeColors.text} />
              {alertCount > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.logoutBtn,
                {
                  backgroundColor: themeColors.card,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                },
              ]}
              onPress={() => {
                logout();
                router.replace('/login');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Live Power Card */}
        <LinearGradient
          colors={['#00D589', '#009E69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>Live Power</Text>
              <View style={styles.heroPowerRow}>
                <Text style={styles.heroPowerValue}>{displayWatts}</Text>
                <Text style={styles.heroPowerUnit}>W</Text>
              </View>
            </View>

            {/* Glowing Bolt Badge */}
            <TouchableOpacity
              style={styles.heroIconBadge}
              onPress={togglePlugRelay}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Sub-Metrics 3-Column Row */}
          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricCol}>
              <Text style={styles.heroMetricLabel}>Current</Text>
              <Text style={styles.heroMetricValue}>
                {displayAmps} <Text style={styles.heroMetricUnit}>A</Text>
              </Text>
            </View>

            <View style={styles.heroMetricCol}>
              <Text style={styles.heroMetricLabel}>Voltage</Text>
              <Text style={styles.heroMetricValue}>
                {displayVolts} <Text style={styles.heroMetricUnit}>V</Text>
              </Text>
            </View>

            <View style={styles.heroMetricCol}>
              <Text style={styles.heroMetricLabel}>Power Factor</Text>
              <Text style={styles.heroMetricValue}>{displayPf}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Action Buttons (3 Cards Row) */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.cardBorder,
              },
            ]}
            onPress={togglePlugRelay}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIconCircle,
                {
                  backgroundColor: themeColors.subCardBg,
                  borderColor: isRelayOn ? '#00C48C' : themeColors.subCardBorder,
                },
              ]}
            >
              <Ionicons
                name="power"
                size={22}
                color={isRelayOn ? '#00C48C' : themeColors.textMuted}
              />
            </View>
            <Text style={[styles.actionText, { color: themeColors.text }]}>{isRelayOn ? 'On / Off' : 'Turn On'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.cardBorder,
              },
            ]}
            onPress={() => setActiveModal('schedule')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
              <Ionicons name="time-outline" size={22} color="#00C48C" />
            </View>
            <Text style={[styles.actionText, { color: themeColors.text }]}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.cardBorder,
              },
            ]}
            onPress={() => setActiveModal('timer')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
              <Ionicons name="stopwatch-outline" size={22} color="#00C48C" />
            </View>
            <Text style={[styles.actionText, { color: themeColors.text }]}>Timer</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Usage Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.cardBorder,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: themeColors.textSecondary }]}>Today's Usage</Text>
              <View style={styles.kwhHeaderRow}>
                <Text style={[styles.kwhValue, { color: themeColors.text }]}>{displayKwh}</Text>
                <Text style={[styles.kwhUnit, { color: themeColors.textSecondary }]}>kWh</Text>
                <View style={[styles.decreasePill, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
                  <Text style={styles.decreaseText}>▼ 12% vs yesterday</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bar Chart Tooltip */}
          {selectedBar !== null && hourlyBars[selectedBar] && (
            <View style={[styles.tooltipBox, { backgroundColor: isDark ? '#1F2937' : '#111827' }]}>
              <Text style={styles.tooltipText}>
                {hourlyBars[selectedBar].val.toFixed(2)} kWh • {hourlyBars[selectedBar].time}
              </Text>
            </View>
          )}

          {/* Hourly Bar Chart */}
          <View style={styles.barChartContainer}>
            <View style={styles.barsFlexRow}>
              {hourlyBars.map((item, idx) => {
                const maxVal = 1.4;
                const heightPct = Math.min(100, Math.max(10, (item.val / maxVal) * 100));
                const isSelected = selectedBar === idx;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.barCol}
                    onPress={() => setSelectedBar(idx)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.barTrack, { backgroundColor: isDark ? '#1F2937' : '#E8F3ED' }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${heightPct}%`,
                            backgroundColor: isSelected ? '#00C48C' : isDark ? '#105B44' : '#A7F3D0',
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* X-Axis Labels */}
            <View style={styles.xAxisRow}>
              <Text style={[styles.xAxisLabel, { color: themeColors.textMuted }]}>00:00</Text>
              <Text style={[styles.xAxisLabel, { color: themeColors.textMuted }]}>06:00</Text>
              <Text style={[styles.xAxisLabel, { color: themeColors.textMuted }]}>12:00</Text>
              <Text style={[styles.xAxisLabel, { color: themeColors.textMuted }]}>18:00</Text>
              <Text style={[styles.xAxisLabel, { color: themeColors.textMuted }]}>24:00</Text>
            </View>
          </View>
        </View>

        {/* Row with 2 Cards: This Month & Estimated Bill */}
        <View style={styles.twoCardsRow}>
          {/* This Month Goal Card */}
          <View style={[styles.halfCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.halfCardLabel, { color: themeColors.textSecondary }]}>This Month</Text>
            <Text style={[styles.halfCardValue, { color: themeColors.text }]}>
              {monthKwh} <Text style={[styles.halfCardUnit, { color: themeColors.textSecondary }]}>kWh</Text>
            </Text>

            {/* Circular Gauge Visual */}
            <View style={styles.gaugeWrapper}>
              <Svg width="110" height="65" viewBox="0 0 110 65">
                <Path
                  d="M 15 55 A 40 40 0 0 1 95 55"
                  fill="none"
                  stroke={isDark ? '#232D3B' : '#E2E8F0'}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <Path
                  d="M 15 55 A 40 40 0 0 1 82 25"
                  fill="none"
                  stroke="#00C48C"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </Svg>
              <View style={styles.gaugeCenterIcon}>
                <Ionicons name="flash" size={16} color="#00C48C" />
              </View>
            </View>

            <Text style={[styles.gaugeFooterText, { color: themeColors.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: '#00C48C' }}>{monthGoalPct}</Text> of 100 kWh goal
            </Text>
          </View>

          {/* Estimated Bill Card */}
          <View style={[styles.halfCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.halfCardLabel, { color: themeColors.textSecondary }]}>Estimated Bill</Text>
            <Text style={[styles.halfCardValue, { color: themeColors.text }]}>₹ {billAmount}</Text>
            <Text style={[styles.billDueText, { color: themeColors.textMuted }]}>Due on 1 Jun 2025</Text>

            <View style={styles.billIconContainer}>
              <View style={[styles.billIconBadge, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                <Ionicons name="document-text-outline" size={32} color="#00C48C" />
                <View style={styles.shieldBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#00C48C" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Insights Banner */}
        <TouchableOpacity
          style={[styles.insightBanner, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}
          onPress={() => router.push('/(tabs)/rag')}
          activeOpacity={0.8}
        >
          <View style={[styles.leafIconBadge, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
            <Ionicons name="leaf" size={20} color="#00C48C" />
          </View>
          <Text style={[styles.insightText, { color: themeColors.text }]}>
            Great! You are using 15% less energy than last month.
          </Text>
          <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
        </TouchableOpacity>

        {/* Hardware Status Strip */}
        <View style={[styles.hardwareStrip, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.hardwareLeft}>
            <View style={[styles.statusDot, { backgroundColor: isRelayOn ? '#10B981' : '#F59E0B' }]} />
            <Text style={[styles.hardwareText, { color: themeColors.textSecondary }]}>
              ESP32 PZEM-004T Node • {singlePlug.relayState === 'ON' ? 'Relay Active' : 'Relay Idle'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
            <Text style={styles.hardwareLink}>Manage</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  headerModeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    borderWidth: 1,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    borderWidth: 1,
  },

  // Hero Card
  heroCard: {
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#00D589',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  heroPowerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroPowerValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heroPowerUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroMetricCol: {
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 2,
  },
  heroMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroMetricUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Action Buttons Row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    borderWidth: 1,
    gap: 8,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Today's Usage Card
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  kwhHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  kwhValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  kwhUnit: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  decreasePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  decreaseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C48C',
  },
  tooltipBox: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  tooltipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  barChartContainer: {
    marginTop: 6,
  },
  barsFlexRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: 4,
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 3,
  },
  barTrack: {
    width: '100%',
    maxWidth: 16,
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  xAxisLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Two Cards Row
  twoCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfCard: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
    elevation: 2,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  halfCardLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  halfCardValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  halfCardUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  gaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    height: 65,
  },
  gaugeCenterIcon: {
    position: 'absolute',
    bottom: 6,
  },
  gaugeFooterText: {
    fontSize: 11,
    textAlign: 'center',
  },
  billDueText: {
    fontSize: 11,
    marginTop: 2,
  },
  billIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  billIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shieldBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },

  // Quick Insights Banner
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    gap: 12,
  },
  leafIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  // Hardware Status Strip
  hardwareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  hardwareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hardwareText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hardwareLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00C48C',
  },
});
