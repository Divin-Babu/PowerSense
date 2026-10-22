import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useStore } from '../../src/store/StoreContext';
import { fetchAnalyticsData, getBackendBaseUrl } from '../../src/services/api';
import { ApplianceUsageHistory, Achievement } from '../../src/types';

type FilterType = 'day' | 'week' | 'month' | 'year';

const DEFAULT_BREAKDOWN = [
  { label: 'Active Draw', pct: 0, color: '#00C48C' },
  { label: 'Normal Run', pct: 0, color: '#38BDF8' },
  { label: 'Standby Idle', pct: 0, color: '#FBBF24' },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const { state, isDark, themeColors } = useStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>('day');
  const initialKwh = state.telemetry?.cumulativeKwh !== undefined && state.telemetry?.cumulativeKwh > 0
    ? state.telemetry.cumulativeKwh.toFixed(3)
    : '0.000';
  const [totalKwh, setTotalKwh] = useState(initialKwh);
  const [breakdownData, setBreakdownData] = useState(DEFAULT_BREAKDOWN);
  const plugLabel = state.singlePlug?.connectedLoadName || 'PowerSense Smart Plug';
  const liveKwhNum = state.telemetry?.cumulativeKwh || Number(totalKwh) || 0.0;

  const [topAppliances, setTopAppliances] = useState([
    { id: 1, name: `${plugLabel} (Active High Load)`, icon: 'flash', iconColor: '#00C48C', pct: 0, kwh: '0.000 kWh' },
    { id: 2, name: `${plugLabel} (Normal Continuous Run)`, icon: 'speedometer-outline', iconColor: '#38BDF8', pct: 0, kwh: '0.000 kWh' },
    { id: 3, name: `${plugLabel} (Standby / Idle Power)`, icon: 'moon-outline', iconColor: '#F59E0B', pct: 0, kwh: '0.000 kWh' },
  ]);
  const [dateDisplay, setDateDisplay] = useState(`Today (${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`);
  const [dateOffset, setDateOffset] = useState<number>(0);

  const handlePrevDate = () => {
    setDateOffset((prev) => prev + 1);
  };

  const handleNextDate = () => {
    setDateOffset((prev) => Math.max(0, prev - 1));
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setDateOffset(0);
  };

  const { energyGoal, peakUsage, achievements } = state;
  const pf = state.telemetry?.powerFactor || 0.95;
  const efficiencyScore = pf >= 0.85 ? 'Optimal (Grade A)' : pf >= 0.70 ? 'Standard (Grade B)' : 'Reactive Load (Grade C)';

  const selectedApp: ApplianceUsageHistory = {
    id: 'single-esp32-node',
    name: state.singlePlug?.connectedLoadName || 'PowerSense Smart Plug',
    category: state.singlePlug?.connectedLoadCategory || 'ESP32 PZEM Monitored Node',
    emoji: '⚡',
    icon: 'flash-outline',
    todayKwh: Number(liveKwhNum.toFixed(3)),
    yesterdayKwh: Number((Math.max(0, liveKwhNum * 0.82)).toFixed(3)),
    thisWeekKwh: Number(liveKwhNum.toFixed(3)),
    thisMonthKwh: Number(liveKwhNum.toFixed(3)),
    baselineWatts: Math.round(state.singlePlug?.watts || (state.telemetry?.totalPowerKw || 0) * 1000 || 0),
    efficiencyScore,
    sparkline: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, Number(liveKwhNum.toFixed(3))],
    estimatedCostMonth: Number((liveKwhNum * 6.50 * 30).toFixed(2)),
  };

  const currentGoal = energyGoal || {
    targetKwh: 100,
    usedKwh: Number(liveKwhNum.toFixed(2)),
    remainingKwh: Math.max(0, 100 - Math.round(liveKwhNum)),
    progressPct: Math.min(100, Math.max(1, Math.round((liveKwhNum / 100.0) * 100))),
    daysLeftInMonth: 15,
    projectedKwh: Number((liveKwhNum * 1.2).toFixed(2)),
    status: 'On Track' as const,
  };

  const currentPeak = peakUsage || {
    peakWindow: '6 PM – 10 PM',
    averageKw: Number((state.telemetry?.totalPowerKw || 0.024).toFixed(3)),
    peakKw: Number(((state.telemetry?.totalPowerKw || 0.024) * 1.5).toFixed(3)),
    isPeakNow: state.telemetry?.peakTariffActive || false,
    peakTariffRate: '₹9.80/kWh',
    offPeakTariffRate: '₹4.20/kWh',
    recommendation: 'Smart schedules can automatically cut off standby loads during peak tariff hours to minimize spend.',
  };

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data: any = await fetchAnalyticsData(activeFilter, state.user?.email, dateOffset);
        if (data) {
          if (data.total_usage_kwh !== undefined) setTotalKwh(Number(data.total_usage_kwh).toFixed(3));
          if (data.breakdown) setBreakdownData(data.breakdown);
          if (data.top_appliances) setTopAppliances(data.top_appliances);
          if (data.date_display) setDateDisplay(data.date_display);
        }
      } catch (e) { }
    };
    loadAnalytics();
  }, [activeFilter, dateOffset, state.user?.email, state.telemetry?.cumulativeKwh]);

  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (state.user?.role === 'admin') {
    return <Redirect href="/(tabs)/admin" />;
  }
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Analytics & History</Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#00C48C',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10,
              gap: 4,
              marginTop: 6,
            }}
            onPress={async () => {
              const emailParam = state.user?.email ? `&email=${encodeURIComponent(state.user.email)}` : '';
              const pdfUrl = `${getBackendBaseUrl()}/api/reports/usage/pdf?period=${activeFilter}&offset=${dateOffset}${emailParam}`;
              try {
                if (Platform.OS === 'web') {
                  const g = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
                  if (g) {
                    g.open(pdfUrl, '_blank');
                  }
                } else {
                  await Linking.openURL(pdfUrl);
                }
              } catch (err: any) {
                Alert.alert('PDF Export', err?.message || 'Could not download PDF report.');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={16} color="#000000" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#000000' }}>Export PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Date Selector Row */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity
            style={[styles.dateArrowBtn, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}
            onPress={handlePrevDate}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: themeColors.text }]}>{dateDisplay}</Text>
          <TouchableOpacity
            style={[
              styles.dateArrowBtn,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.cardBorder,
                opacity: dateOffset === 0 ? 0.35 : 1.0,
              },
            ]}
            onPress={handleNextDate}
            disabled={dateOffset === 0}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={dateOffset === 0 ? themeColors.textMuted : themeColors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Time Filters: Day | Week | Month | Year */}
        <View style={[styles.filtersWrapper, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          {(['day', 'week', 'month', 'year'] as FilterType[]).map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => handleFilterChange(filter)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isSelected ? '#FFFFFF' : themeColors.textSecondary },
                    isSelected && styles.filterTextActive,
                  ]}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Total Usage & Hardware Overview Card */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.cardSectionTitle, { color: themeColors.textSecondary, marginBottom: 0 }]}>
              Total Usage ({activeFilter.toUpperCase()})
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 196, 140, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C48C' }} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#00C48C' }}>LIVE ESP32 SENSOR</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.totalKwh, { color: themeColors.text }]}>{totalKwh}</Text>
            <Text style={[styles.totalUnit, { color: themeColors.textSecondary }]}>kWh</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#00C48C', marginBottom: 2 }}>
              ₹{(Number(totalKwh) * 6.50).toFixed(2)} est.
            </Text>
          </View>

          {/* Real Live Hardware Telemetry Stats Row */}
          <View style={[styles.telemetryQuickGrid, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
            <View style={styles.telemetryQuickItem}>
              <Text style={[styles.telemetryQuickLabel, { color: themeColors.textMuted }]}>POWER</Text>
              <Text style={[styles.telemetryQuickVal, { color: themeColors.text }]}>
                {(state.singlePlug?.watts || (state.telemetry?.totalPowerKw || 0) * 1000).toFixed(1)} W
              </Text>
            </View>
            <View style={[styles.telemetryDivider, { backgroundColor: themeColors.cardBorder }]} />
            <View style={styles.telemetryQuickItem}>
              <Text style={[styles.telemetryQuickLabel, { color: themeColors.textMuted }]}>VOLTAGE</Text>
              <Text style={[styles.telemetryQuickVal, { color: themeColors.text }]}>
                {(state.telemetry?.voltage || 230).toFixed(1)} V
              </Text>
            </View>
            <View style={[styles.telemetryDivider, { backgroundColor: themeColors.cardBorder }]} />
            <View style={styles.telemetryQuickItem}>
              <Text style={[styles.telemetryQuickLabel, { color: themeColors.textMuted }]}>CURRENT</Text>
              <Text style={[styles.telemetryQuickVal, { color: themeColors.text }]}>
                {(state.telemetry?.currentAmps || 0).toFixed(2)} A
              </Text>
            </View>
            <View style={[styles.telemetryDivider, { backgroundColor: themeColors.cardBorder }]} />
            <View style={styles.telemetryQuickItem}>
              <Text style={[styles.telemetryQuickLabel, { color: themeColors.textMuted }]}>PF</Text>
              <Text style={[styles.telemetryQuickVal, { color: '#00C48C' }]}>
                {(state.telemetry?.powerFactor || 0.98).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Smart Plug Load Breakdown List */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.cardSectionTitle, { color: themeColors.text, marginBottom: 0 }]}>
              Smart Plug Load Breakdown
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: themeColors.textSecondary }}>
              {dateDisplay}
            </Text>
          </View>

          <View style={styles.appliancesList}>
            {topAppliances.map((app) => (
              <View key={app.id} style={styles.applianceItem}>
                <View
                  style={[
                    styles.applianceIconBox,
                    {
                      backgroundColor: themeColors.subCardBg,
                      borderColor: themeColors.subCardBorder,
                    },
                  ]}
                >
                  <Ionicons name={app.icon as any} size={20} color={app.iconColor} />
                </View>

                <View style={styles.applianceInfo}>
                  <View style={styles.applianceTitleRow}>
                    <Text style={[styles.applianceName, { color: themeColors.text }]}>{app.name}</Text>
                    <Text style={[styles.applianceKwh, { color: themeColors.textSecondary }]}>
                      {app.pct}% • {app.kwh}
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1F2937' : '#F1F5F3' }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.max(app.pct, app.pct > 0 ? 3 : 0))}%`,
                          backgroundColor: app.iconColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 🧊 APPLIANCE USAGE HISTORY CARD */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.cardSectionTitle, { color: themeColors.text, marginBottom: 2 }]}>
                Connected Load Energy History
              </Text>
              <Text style={[styles.cardSubText, { color: themeColors.textMuted }]}>
                Historical energy consumption for monitored appliance
              </Text>
            </View>
            <View style={styles.historyCounterBadge}>
              <Ionicons name="hardware-chip-outline" size={12} color="#00C48C" style={{ marginRight: 4 }} />
              <Text style={styles.historyCounterText}>1 Plug Active</Text>
            </View>
          </View>

          {/* Connected Appliance Badge / Selector */}
          <View style={styles.appChipsScroll}>
            <View
              style={[
                styles.appChip,
                {
                  backgroundColor: '#00C48C',
                  borderColor: '#00C48C',
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>⚡</Text>
              <Text style={[styles.appChipText, { color: '#FFFFFF' }]}>
                {state.singlePlug?.connectedLoadName || 'PowerSense Smart Plug'}
              </Text>
            </View>
          </View>

          {/* Selected Appliance Detail Hero Box */}
          <View style={[styles.applianceDetailCard, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
            <View style={styles.applianceDetailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.applianceEmojiBig}>
                  <Text style={{ fontSize: 30 }}>{selectedApp.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedAppName, { color: themeColors.text }]}>{selectedApp.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={[styles.selectedAppCat, { color: themeColors.textMuted }]}>{selectedApp.category}</Text>
                    <Text style={{ color: themeColors.textMuted }}>•</Text>
                    <View style={styles.efficiencyPill}>
                      <Text style={styles.efficiencyPillText}>{selectedApp.efficiencyScore}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Complete Consumption Breakdown Table */}
            <View style={styles.historyTableGrid}>
              <View style={styles.historyTableRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sunny-outline" size={15} color="#00C48C" />
                  <Text style={[styles.historyTableLabel, { color: themeColors.text }]}>Today</Text>
                </View>
                <Text style={[styles.historyTableValue, { color: '#00C48C' }]}>{selectedApp.todayKwh} kWh</Text>
              </View>

              <View style={[styles.historyTableDivider, { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.historyTableRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time-outline" size={15} color={themeColors.textSecondary} />
                  <Text style={[styles.historyTableLabel, { color: themeColors.text }]}>Yesterday</Text>
                </View>
                <Text style={[styles.historyTableValue, { color: themeColors.text }]}>{selectedApp.yesterdayKwh} kWh</Text>
              </View>

              <View style={[styles.historyTableDivider, { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.historyTableRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar-outline" size={15} color={themeColors.textSecondary} />
                  <Text style={[styles.historyTableLabel, { color: themeColors.text }]}>This Week</Text>
                </View>
                <Text style={[styles.historyTableValue, { color: themeColors.text }]}>{selectedApp.thisWeekKwh} kWh</Text>
              </View>

              <View style={[styles.historyTableDivider, { backgroundColor: themeColors.cardBorder }]} />

              <View style={styles.historyTableRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="stats-chart-outline" size={15} color="#38BDF8" />
                  <Text style={[styles.historyTableLabel, { color: themeColors.text }]}>This Month</Text>
                </View>
                <Text style={[styles.historyTableValue, { color: '#38BDF8' }]}>{selectedApp.thisMonthKwh} kWh</Text>
              </View>
            </View>

            {/* 7-Day Sparkline Bar Visualization */}
            <View style={styles.sparklineContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.sparklineTitle, { color: themeColors.textMuted }]}>7-Day Consumption Trend</Text>
                <Text style={[styles.sparklineCost, { color: '#00C48C' }]}>Est. ₹{selectedApp.estimatedCostMonth}/mo</Text>
              </View>
              <View style={styles.sparklineBarsRow}>
                {selectedApp.sparkline.map((val: number, i: number) => {
                  const maxVal = Math.max(...selectedApp.sparkline, 0.05);
                  const hPct = Math.max(12, (val / maxVal) * 100);
                  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                  return (
                    <View key={i} style={styles.sparkCol}>
                      <View style={[styles.sparkBarTrack, { backgroundColor: isDark ? '#1F2937' : '#E2E8F0' }]}>
                        <View style={[styles.sparkBarFill, { height: `${hPct}%`, backgroundColor: '#00C48C' }]} />
                      </View>
                      <Text style={[styles.sparkDayLabel, { color: themeColors.textMuted }]}>{days[i]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* ⚡ PEAK USAGE DETECTION & TARIFF OPTIMIZATION CARD */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.peakIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="flash" size={18} color="#F59E0B" />
              </View>
              <View>
                <Text style={[styles.cardSectionTitle, { color: themeColors.text, marginBottom: 0 }]}>
                  Peak Usage Detection
                </Text>
                <Text style={[styles.cardSubText, { color: themeColors.textMuted }]}>
                  Household Maximum Power Consumption
                </Text>
              </View>
            </View>

            <View style={styles.peakBadgePill}>
              <Ionicons name="time" size={12} color="#F59E0B" />
              <Text style={styles.peakBadgePillText}>{currentPeak.peakWindow}</Text>
            </View>
          </View>

          {/* Average kW vs Peak kW Grid */}
          <View style={styles.peakStatsGrid}>
            <View style={[styles.peakStatBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
              <Text style={[styles.peakStatLabel, { color: themeColors.textMuted }]}>AVERAGE LOAD</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={[styles.peakStatVal, { color: themeColors.text }]}>{currentPeak.averageKw}</Text>
                <Text style={[styles.peakStatUnit, { color: themeColors.textSecondary }]}>kW</Text>
              </View>
              <Text style={[styles.peakStatSub, { color: themeColors.textMuted }]}>All-day baseline draw</Text>
            </View>

            <View style={[styles.peakStatBox, { backgroundColor: themeColors.subCardBg, borderColor: '#F59E0B' }]}>
              <Text style={[styles.peakStatLabel, { color: '#F59E0B' }]}>PEAK LOAD</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={[styles.peakStatVal, { color: '#F59E0B' }]}>{currentPeak.peakKw}</Text>
                <Text style={[styles.peakStatUnit, { color: '#F59E0B' }]}>kW</Text>
              </View>
              <Text style={[styles.peakStatSub, { color: themeColors.textMuted }]}>Recorded during 7-10 PM</Text>
            </View>
          </View>

          {/* 24-Hour Peak Window Timeline Visual */}
          <View style={[styles.peakTimelineBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
            <Text style={[styles.timelineTitle, { color: themeColors.textSecondary }]}>24-Hour Load Intensity Profile</Text>
            <View style={styles.timelineTrack}>
              {/* Off peak morning */}
              <View style={[styles.timelineSegment, { flex: 7, backgroundColor: '#00C48C' }]} />
              {/* Mid peak */}
              <View style={[styles.timelineSegment, { flex: 12, backgroundColor: '#38BDF8' }]} />
              {/* Peak 7-10 PM */}
              <View style={[styles.timelineSegment, { flex: 3, backgroundColor: '#EF4444' }]} />
              {/* Night */}
              <View style={[styles.timelineSegment, { flex: 2, backgroundColor: '#00C48C' }]} />
            </View>
            <View style={styles.timelineLabelsRow}>
              <Text style={[styles.timelineLabel, { color: themeColors.textMuted }]}>00:00</Text>
              <Text style={[styles.timelineLabel, { color: themeColors.textMuted }]}>07:00</Text>
              <Text style={[styles.timelineLabel, { color: '#EF4444', fontWeight: '800' }]}>19:00 - 22:00 (PEAK)</Text>
              <Text style={[styles.timelineLabel, { color: themeColors.textMuted }]}>24:00</Text>
            </View>
          </View>

          {/* Tariff Advice */}
          <View style={[styles.peakAdviceBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
            <Ionicons name="bulb-outline" size={18} color="#D97706" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.peakAdviceTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                Time-of-Use Peak Shifting Tip
              </Text>
              <Text style={[styles.peakAdviceText, { color: isDark ? '#FCD34D' : '#78350F' }]}>
                {currentPeak.recommendation}
              </Text>
            </View>
          </View>
        </View>

        {/* 🎯 ENERGY-SAVING GOAL & ACHIEVEMENTS CARD */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.goalIconCircle, { backgroundColor: 'rgba(0, 196, 140, 0.15)' }]}>
                <Ionicons name="trophy" size={18} color="#00C48C" />
              </View>
              <View>
                <Text style={[styles.cardSectionTitle, { color: themeColors.text, marginBottom: 0 }]}>
                  Energy Goals & Achievements
                </Text>
                <Text style={[styles.cardSubText, { color: themeColors.textMuted }]}>
                  Monthly target tracking and milestone badges
                </Text>
              </View>
            </View>
          </View>

          {/* Goal Summary Row */}
          <View style={[styles.goalSummaryBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
            <View style={styles.goalSummaryHeader}>
              <Text style={[styles.goalTargetLabel, { color: themeColors.textSecondary }]}>
                Monthly Target: <Text style={{ color: themeColors.text, fontWeight: '800' }}>{currentGoal.targetKwh} kWh</Text>
              </Text>
              <Text style={[styles.goalUsedLabel, { color: '#00C48C', fontWeight: '800' }]}>
                Used: {currentGoal.usedKwh} kWh ({currentGoal.progressPct}%)
              </Text>
            </View>

            {/* Dynamic Meter */}
            <View style={styles.asciiMeterContainer}>
              <Text style={[styles.asciiMeterText, { color: '#00C48C' }]}>
                {'█'.repeat(Math.min(14, Math.max(1, Math.round((currentGoal.progressPct / 100) * 14))))}
                {'░'.repeat(Math.max(0, 14 - Math.min(14, Math.max(1, Math.round((currentGoal.progressPct / 100) * 14)))))} {currentGoal.progressPct}%
              </Text>
              <Text style={[styles.remainingLabel, { color: themeColors.textSecondary }]}>
                {currentGoal.remainingKwh} kWh remaining
              </Text>
            </View>

            <View style={[styles.goalBarTrack, { backgroundColor: isDark ? '#1F2937' : '#E2E8F0' }]}>
              <LinearGradient
                colors={['#00D589', '#38BDF8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.goalBarFill, { width: `${currentGoal.progressPct}%` }]}
              />
            </View>
          </View>

          {/* Achievements Badges Grid */}
          <Text style={[styles.achievementsHeading, { color: themeColors.textSecondary }]}>UNLOCKED ACHIEVEMENTS</Text>
          <View style={styles.achievementsGrid}>
            {(achievements || []).map((ach: Achievement) => (
              <View

                key={ach.id}
                style={[
                  styles.achievementTile,
                  {
                    backgroundColor: themeColors.subCardBg,
                    borderColor: ach.isNew ? '#00C48C' : themeColors.subCardBorder,
                  },
                ]}
              >
                <View style={styles.achBadgeCircle}>
                  <Text style={{ fontSize: 22 }}>{ach.badge}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.achTileTitle, { color: themeColors.text }]}>{ach.title}</Text>
                  <Text style={[styles.achTileDesc, { color: themeColors.textSecondary }]}>{ach.description}</Text>
                </View>
              </View>
            ))}
          </View>
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

  // Date Selector
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  dateArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Filters
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
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Card
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  totalKwh: {
    fontSize: 30,
    fontWeight: '800',
  },
  totalUnit: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Hardware Telemetry Quick Stats
  telemetryQuickGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  telemetryQuickItem: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryQuickLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  telemetryQuickVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  telemetryDivider: {
    width: 1,
    height: 24,
  },

  // Top Appliances
  appliancesList: {
    marginTop: 8,
    gap: 14,
  },
  applianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  applianceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  applianceInfo: {
    flex: 1,
  },
  applianceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  applianceName: {
    fontSize: 13,
    fontWeight: '600',
  },
  applianceKwh: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // 🧊 Appliance Usage History Section Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSubText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  historyCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  historyCounterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00C48C',
  },
  appChipsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  appChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  applianceDetailCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  applianceDetailHeader: {
    marginBottom: 14,
  },
  applianceEmojiBig: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAppName: {
    fontSize: 15,
    fontWeight: '800',
  },
  selectedAppCat: {
    fontSize: 11,
    fontWeight: '500',
  },
  efficiencyPill: {
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  efficiencyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00C48C',
  },
  historyTableGrid: {
    gap: 8,
    marginBottom: 14,
  },
  historyTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  historyTableLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyTableValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyTableDivider: {
    height: 1,
  },
  sparklineContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  sparklineTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  sparklineCost: {
    fontSize: 11,
    fontWeight: '800',
  },
  sparklineBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    marginTop: 8,
    paddingHorizontal: 6,
  },
  sparkCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  sparkBarTrack: {
    width: 14,
    height: 44,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sparkBarFill: {
    width: '100%',
    borderRadius: 7,
  },
  sparkDayLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },

  // ⚡ Peak Usage Section Styles
  peakIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peakBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  peakBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  peakStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  peakStatBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  peakStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  peakStatVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  peakStatUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  peakStatSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  peakTimelineBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  timelineTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 2,
  },
  timelineSegment: {
    height: '100%',
    borderRadius: 3,
  },
  timelineLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timelineLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  peakAdviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  peakAdviceTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  peakAdviceText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },

  // 🎯 Goals & Badges Styles
  goalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalSummaryBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  goalSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalTargetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalUsedLabel: {
    fontSize: 12,
  },
  asciiMeterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  asciiMeterText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  achievementsHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  achievementsGrid: {
    gap: 10,
  },
  achievementTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  achBadgeCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achTileTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  achTileDesc: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 15,
  },
});
