import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Circle,
  G,
} from 'react-native-svg';
import { useStore } from '../../src/store/StoreContext';
import { fetchAnalyticsData } from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 72, 340);
const CHART_HEIGHT = 160;

type FilterType = 'day' | 'week' | 'month' | 'year';

const DEFAULT_BREAKDOWN = [
  { label: 'Appliances', pct: 40, color: '#00C48C' },
  { label: 'Lighting', pct: 28, color: '#38BDF8' },
  { label: 'Charging', pct: 20, color: '#FBBF24' },
  { label: 'Others', pct: 12, color: '#94A3B8' },
];

const DEFAULT_TOP_APPLIANCES = [
  { id: 1, name: 'Active Load (Peak Draw)', icon: 'flash', iconColor: '#00C48C', pct: 62, kwh: '1.52 kWh' },
  { id: 2, name: 'Normal Continuous Run', icon: 'speedometer-outline', iconColor: '#38BDF8', pct: 28, kwh: '0.68 kWh' },
  { id: 3, name: 'Standby / Idle Power', icon: 'moon-outline', iconColor: '#F59E0B', pct: 10, kwh: '0.25 kWh' },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const { state, isDark, themeColors } = useStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>('day');
  const [totalKwh, setTotalKwh] = useState('2.45');
  const [breakdownData, setBreakdownData] = useState(DEFAULT_BREAKDOWN);
  const [topAppliances, setTopAppliances] = useState(DEFAULT_TOP_APPLIANCES);
  const [dateDisplay, setDateDisplay] = useState('14 May 2025');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data: any = await fetchAnalyticsData(activeFilter);
        if (data) {
          if (data.total_usage_kwh) setTotalKwh(Number(data.total_usage_kwh).toFixed(2));
          if (data.breakdown) setBreakdownData(data.breakdown);
          if (data.top_appliances) setTopAppliances(data.top_appliances);
          if (data.date_display) setDateDisplay(data.date_display);
        }
      } catch (e) {}
    };
    loadAnalytics();
  }, [activeFilter]);

  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (state.user?.role === 'admin') {
    return <Redirect href="/(tabs)/admin" />;
  }

  // Smooth spline curve path for chart
  const areaPath = `
    M 0 130
    C 40 130, 60 115, 90 90
    C 120 65, 140 30, 170 30
    C 200 30, 220 70, 260 70
    C 290 70, 310 110, ${CHART_WIDTH} 110
    L ${CHART_WIDTH} ${CHART_HEIGHT}
    L 0 ${CHART_HEIGHT}
    Z
  `;

  const linePath = `
    M 0 130
    C 40 130, 60 115, 90 90
    C 120 65, 140 30, 170 30
    C 200 30, 220 70, 260 70
    C 290 70, 310 110, ${CHART_WIDTH} 110
  `;

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
        </View>

        {/* Date Selector Row */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity
            style={[styles.dateArrowBtn, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: themeColors.text }]}>{dateDisplay}</Text>
          <TouchableOpacity
            style={[styles.dateArrowBtn, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color={themeColors.text} />
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
                onPress={() => setActiveFilter(filter)}
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

        {/* Total Usage Card with Spline Wave Chart */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <Text style={[styles.cardSectionTitle, { color: themeColors.textSecondary }]}>Total Usage</Text>
          <View style={styles.totalRow}>
            <Text style={[styles.totalKwh, { color: themeColors.text }]}>{totalKwh}</Text>
            <Text style={[styles.totalUnit, { color: themeColors.textSecondary }]}>kWh</Text>
          </View>

          {/* SVG Wave Chart Container */}
          <View style={styles.chartContainer}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <SvgGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#00C48C" stopOpacity="0.35" />
                  <Stop offset="100%" stopColor="#00C48C" stopOpacity="0.0" />
                </SvgGradient>
              </Defs>

              {/* Area Fill */}
              <Path d={areaPath} fill="url(#waveGradient)" />

              {/* Main Line */}
              <Path d={linePath} fill="none" stroke="#00C48C" strokeWidth="3" strokeLinecap="round" />

              {/* Peak Tooltip Point at 13:00 (1.32 kWh) */}
              <Circle cx="170" cy="30" r="5" fill="#00C48C" stroke={isDark ? '#141B24' : '#FFFFFF'} strokeWidth="3" />
            </Svg>

            {/* Peak Tooltip Bubble */}
            <View style={[styles.peakTooltip, { backgroundColor: isDark ? '#1F2937' : '#111827' }]}>
              <Text style={styles.peakTooltipText}>1.32 kWh  1:00 PM</Text>
            </View>

            {/* X-Axis Horizontal Grid Labels */}
            <View style={styles.chartXLabels}>
              <Text style={[styles.xLabel, { color: themeColors.textMuted }]}>00:00</Text>
              <Text style={[styles.xLabel, { color: themeColors.textMuted }]}>06:00</Text>
              <Text style={[styles.xLabel, { color: themeColors.textMuted }]}>12:00</Text>
              <Text style={[styles.xLabel, { color: themeColors.textMuted }]}>18:00</Text>
              <Text style={[styles.xLabel, { color: themeColors.textMuted }]}>24:00</Text>
            </View>
          </View>
        </View>

        {/* Usage Breakdown Card (Donut Chart & Legend) */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <Text style={[styles.cardSectionTitle, { color: themeColors.textSecondary }]}>Usage Breakdown</Text>

          <View style={styles.donutRow}>
            {/* Donut Chart SVG */}
            <View style={styles.donutWrapper}>
              <Svg width="120" height="120" viewBox="0 0 120 120">
                <G rotation="-90" origin="60, 60">
                  {/* Segment 1: Appliances 40% (Green) */}
                  <Circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke="#00C48C"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray="282.7"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Segment 2: Lighting 28% (Cyan) */}
                  <Circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke="#38BDF8"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray="282.7"
                    strokeDashoffset="113"
                    strokeLinecap="round"
                  />
                  {/* Segment 3: Charging 20% (Amber) */}
                  <Circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke="#FBBF24"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray="282.7"
                    strokeDashoffset="192"
                    strokeLinecap="round"
                  />
                  {/* Segment 4: Others 12% (Muted) */}
                  <Circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke={isDark ? '#232D3B' : '#CBD5E1'}
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray="282.7"
                    strokeDashoffset="248"
                    strokeLinecap="round"
                  />
                </G>
              </Svg>

              {/* Center Donut Label */}
              <View style={styles.donutCenter}>
                <Text style={[styles.donutCenterText, { color: themeColors.text }]}>{totalKwh}</Text>
                <Text style={[styles.donutUnit, { color: themeColors.textSecondary }]}>kWh</Text>
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legendCol}>
              {breakdownData.map((item) => (
                <View key={item.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendLabel, { color: themeColors.text }]}>{item.label}</Text>
                  <Text style={[styles.legendPct, { color: themeColors.text }]}>{item.pct}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Appliances Ranked List */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <Text style={[styles.cardSectionTitle, { color: themeColors.textSecondary }]}>Smart Plug Load Breakdown</Text>

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
                    <Text style={[styles.applianceKwh, { color: themeColors.textSecondary }]}>{app.kwh}</Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1F2937' : '#F1F5F3' }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${app.pct * 2}%`,
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

  // Wave Chart
  chartContainer: {
    alignItems: 'center',
    marginTop: 6,
    position: 'relative',
  },
  peakTooltip: {
    position: 'absolute',
    top: 4,
    left: 105,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  peakTooltipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chartXLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  xLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Donut Breakdown
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  donutWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterText: {
    fontSize: 18,
    fontWeight: '800',
  },
  donutUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  legendCol: {
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 80,
  },
  legendPct: {
    fontSize: 13,
    fontWeight: '700',
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
});
