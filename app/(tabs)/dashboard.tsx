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
  Modal,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
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

const TIMER_PRESETS = [15, 30, 45, 60, 120, 180];

export default function DashboardScreen() {
  const router = useRouter();
  const {
    state,
    togglePlugRelay,
    togglePlugRelayChannel,
    setPlugRelayState,
    logout,
    isDark,
    themeColors,
    toggleTheme,
    schedules,
    timer,
    startTimer,
    cancelTimer,
    addMinutesToTimer,
    addSchedule,
    toggleSchedule,
    deleteSchedule,
  } = useStore();

  const [hourlyBars, setHourlyBars] = useState(DEFAULT_HOURLY_BARS);
  const [selectedBar, setSelectedBar] = useState<number | null>(Math.min(12, Math.floor(new Date().getHours() / 2)));
  const [activeModal, setActiveModal] = useState<'schedule' | 'timer' | 'hardware' | null>(null);
  const [billAmount, setBillAmount] = useState('0.00');
  const [monthKwh, setMonthKwh] = useState('0.000');
  const [monthGoalPct, setMonthGoalPct] = useState('0%');
  const [liveHistory, setLiveHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  // Push new live telemetry points to the live waveform buffer
  useEffect(() => {
    const rawVal = Number(state.singlePlug?.watts ?? ((state.telemetry?.totalPowerKw || 0) * 1000));
    const currentWatts = state.singlePlug?.relayState === 'ON' ? rawVal : 0;
    setLiveHistory((prev) => [...prev.slice(1), currentWatts]);
  }, [state.singlePlug?.watts, state.telemetry?.totalPowerKw, state.singlePlug?.relayState]);

  // Timer Modal Form State
  const [selectedTimerMinutes, setSelectedTimerMinutes] = useState(30);
  const [timerTargetState, setTimerTargetState] = useState<'OFF' | 'ON'>('OFF');

  // Schedule Modal Form State
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newOnTime, setNewOnTime] = useState('06:30');
  const [newOffTime, setNewOffTime] = useState('23:00');
  const [newRepeat, setNewRepeat] = useState<'EVERYDAY' | 'WEEKDAYS' | 'WEEKENDS'>('EVERYDAY');
  const [newCategory, setNewCategory] = useState('Custom Routine');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data: any = await fetchDashboardData(state.user?.email);
        if (data) {
          if (data.today_usage?.hourly_bars && Array.isArray(data.today_usage.hourly_bars)) {
            setHourlyBars(data.today_usage.hourly_bars);
          }
          if (data.bill_estimate?.amount !== undefined) {
            setBillAmount(Number(data.bill_estimate.amount).toFixed(2));
          }
          if (data.this_month?.kwh !== undefined) {
            setMonthKwh(Number(data.this_month.kwh).toFixed(3));
            setMonthGoalPct(`${data.this_month.goal_pct || 0}%`);
          }
        }
      } catch (e) { }
    };
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [state.user?.email]);

  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (state.user?.role === 'admin') {
    return <Redirect href="/(tabs)/admin" />;
  }

  const { telemetry, singlePlug, alerts } = state;
  const isRelayOn = singlePlug.relayState === 'ON';
  const alertCount = alerts.length;

  const rawWatts = singlePlug.watts ?? (telemetry.totalPowerKw * 1000);
  const displayWatts = isRelayOn ? (typeof rawWatts === 'number' ? (Number.isInteger(rawWatts) ? rawWatts.toString() : rawWatts.toFixed(1)) : rawWatts) : '0.0';
  const displayAmps = isRelayOn ? (telemetry.currentAmps || 0).toFixed(2) : '0.00';
  const displayVolts = (telemetry.voltage || 0).toFixed(1);
  const displayPf = isRelayOn ? (telemetry.powerFactor || 0).toFixed(2) : '0.00';
  const displayKwh = (telemetry.cumulativeKwh || 0).toFixed(3);

  const activeScheduleCount = schedules ? schedules.filter((s) => s.enabled).length : 0;

  // Format Helper: Seconds to MM:SS
  const formatTimerDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Format Helper: 24h to 12h AM/PM
  const format12Hour = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return timeStr || '--:--';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  // Handle Start Timer Submit
  const handleStartTimer = () => {
    startTimer(selectedTimerMinutes, timerTargetState);
    Alert.alert('Timer Active', `Smart plug will automatically turn ${timerTargetState} in ${selectedTimerMinutes} minutes.`);
    setActiveModal(null);
  };

  // Handle Create Schedule Submit
  const handleCreateSchedule = () => {
    if (!newScheduleName.trim()) {
      Alert.alert('Validation', 'Please enter a name for the schedule.');
      return;
    }
    addSchedule({
      name: newScheduleName.trim(),
      enabled: true,
      onTime: newOnTime,
      offTime: newOffTime,
      repeat: newRepeat,
      category: newCategory,
    });
    setNewScheduleName('');
    setIsAddingSchedule(false);
    Alert.alert('Schedule Saved', `Automation schedule '${newScheduleName.trim()}' is now active.`);
  };

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
            <View
              style={[
                styles.logoBadge,
                {
                  backgroundColor: themeColors.logoBadgeBg,
                  borderColor: themeColors.logoBadgeBorder,
                },
              ]}
            >
              <Ionicons name="flash" size={24} color="#00C48C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brandTitle, { color: themeColors.text }]} numberOfLines={1}>PowerSense AI</Text>
              <Text style={[styles.brandSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>
                Smart Energy Monitor • {state.user?.name || 'Home'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.bellBtn,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              onPress={() => router.push('/(tabs)/alerts')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={22} color={themeColors.text} />
              {alertCount > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.logoutBtn,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              onPress={logout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ⚠️ Low Voltage Brownout Warning Banner */}
        {state.telemetry.voltage > 50 && state.telemetry.voltage < 205 && (
          <TouchableOpacity
            style={[
              styles.voltageWarningBanner,
              {
                backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                borderColor: '#F59E0B',
              },
            ]}
            onPress={() => router.push('/(tabs)/alerts')}
            activeOpacity={0.85}
          >
            <View style={styles.voltageWarningIconBox}>
              <Ionicons name="warning" size={22} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.voltageWarningTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                ⚠️ Low Line Voltage: {state.telemetry.voltage.toFixed(1)} V
              </Text>
              <Text style={[styles.voltageWarningSub, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                Mains dropped below 205V threshold. Sensitive compressor motors may stall. Tap to view alerts.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Hero Card: Real-time Power Output */}
        <LinearGradient
          colors={['#00D589', '#009E69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>LIVE POWER OUTPUT</Text>
              <View style={styles.heroPowerRow}>
                <Text style={styles.heroPowerValue}>{displayWatts}</Text>
                <Text style={styles.heroPowerUnit}>W</Text>
              </View>
            </View>
            <View style={styles.heroIconBadge}>
              <Ionicons name={isRelayOn ? 'flash' : 'flash-off'} size={28} color="#FFFFFF" />
            </View>
          </View>

          {/* Key Metrics Row */}
          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricCol}>
              <Text style={styles.heroMetricLabel}>VOLTAGE</Text>
              <Text style={styles.heroMetricValue}>
                {displayVolts} <Text style={styles.heroMetricUnit}>V</Text>
              </Text>
            </View>
            <View style={styles.heroMetricCol}>
              <Text style={styles.heroMetricLabel}>CURRENT</Text>
              <Text style={styles.heroMetricValue}>
                {displayAmps} <Text style={styles.heroMetricUnit}>A</Text>
              </Text>
            </View>
            <View style={styles.heroMetricCol}>
              <Text style={styles.heroMetricLabel}>POWER FACTOR</Text>
              <Text style={styles.heroMetricValue}>{displayPf}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ⏱️ ACTIVE COUNTDOWN TIMER BANNER */}
        {timer && timer.active && (
          <View style={[styles.timerBanner, { backgroundColor: isDark ? '#064E3B' : '#E6FBF5', borderColor: '#00C48C' }]}>
            <View style={styles.timerBannerLeft}>
              <View style={styles.timerPillIcon}>
                <Ionicons name="stopwatch" size={18} color="#00C48C" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.timerBannerTitle, { color: isDark ? '#FFFFFF' : '#065F46' }]}>
                  Timer Active: {formatTimerDigits(timer.secondsRemaining)} remaining
                </Text>
                <Text style={[styles.timerBannerSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                  Will switch Smart Plug {timer.targetState} • {timer.label}
                </Text>
              </View>
            </View>
            <View style={styles.timerBannerActions}>
              <TouchableOpacity
                style={styles.timerBannerManageBtn}
                onPress={() => setActiveModal('timer')}
                activeOpacity={0.8}
              >
                <Text style={styles.timerBannerManageText}>Manage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerBannerCancelBtn}
                onPress={cancelTimer}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions Row: On/Off, Schedule, Timer */}
        <View style={styles.actionRow}>
          {/* 1. Power On/Off */}
          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: themeColors.card,
                borderColor: isRelayOn ? '#00C48C' : themeColors.cardBorder,
              },
            ]}
            onPress={togglePlugRelay}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIconCircle,
                {
                  backgroundColor: isRelayOn ? 'rgba(0, 196, 140, 0.15)' : themeColors.subCardBg,
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
            <Text style={[styles.actionText, { color: isRelayOn ? '#00C48C' : themeColors.text }]}>
              {isRelayOn ? 'Relay ON' : 'Turn ON'}
            </Text>
          </TouchableOpacity>

          {/* 2. Schedule */}
          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: themeColors.card,
                borderColor: activeScheduleCount > 0 ? '#00C48C' : themeColors.cardBorder,
              },
            ]}
            onPress={() => setActiveModal('schedule')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
              <Ionicons name="time-outline" size={22} color="#00C48C" />
              {activeScheduleCount > 0 && (
                <View style={styles.actionBadgePill}>
                  <Text style={styles.actionBadgeText}>{activeScheduleCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.actionText, { color: themeColors.text }]}>Schedule</Text>
          </TouchableOpacity>

          {/* 3. Timer */}
          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: themeColors.card,
                borderColor: timer && timer.active ? '#00C48C' : themeColors.cardBorder,
              },
            ]}
            onPress={() => setActiveModal('timer')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: timer && timer.active ? 'rgba(0, 196, 140, 0.15)' : themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
              <Ionicons name="stopwatch-outline" size={22} color="#00C48C" />
              {timer && timer.active && (
                <View style={[styles.actionBadgePill, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="play" size={8} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={[styles.actionText, { color: timer && timer.active ? '#00C48C' : themeColors.text }]}>
              {timer && timer.active ? formatTimerDigits(timer.secondsRemaining) : 'Timer'}
            </Text>
          </TouchableOpacity>
        </View>


        {/* 1. Live Real-Time Power Waveform Card */}
        {(() => {
          const svgWidth = 320;
          const svgHeight = 85;
          const peakWatts = Math.max(...liveHistory, 0);
          const maxLiveScale = Math.max(25, Math.ceil(peakWatts * 1.25));
          const points = liveHistory.map((val, idx) => {
            const x = (idx / (liveHistory.length - 1)) * svgWidth;
            const y = svgHeight - ((val / maxLiveScale) * (svgHeight - 16)) - 8;
            return { x, y };
          });

          const linePath = points.reduce((acc, pt, idx) => {
            return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
          }, '');

          const areaPath = `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
          const lastPoint = points[points.length - 1];

          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.cardBorder,
                  marginBottom: 16,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isRelayOn ? '#00C48C' : '#94A3B8' }} />
                      <Text style={[styles.cardTitle, { color: themeColors.textSecondary, marginBottom: 0 }]}>
                        Live Power Waveform
                      </Text>
                    </View>
                    <View style={[styles.decreasePill, { backgroundColor: isRelayOn ? (isDark ? 'rgba(0, 196, 140, 0.2)' : '#E8FBF4') : (isDark ? '#334155' : '#F1F5F9'), paddingHorizontal: 8, paddingVertical: 2 }]}>
                      <Text style={[styles.decreaseText, { color: isRelayOn ? '#00C48C' : '#94A3B8', fontSize: 10, fontWeight: '700' }]}>
                        {isRelayOn ? '● LIVE (2Hz)' : 'STANDBY'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.kwhHeaderRow}>
                    <Text style={[styles.kwhValue, { color: themeColors.text, fontSize: 32 }]}>{displayWatts}</Text>
                    <Text style={[styles.kwhUnit, { color: themeColors.textSecondary }]}>Watts</Text>
                    <Text style={{ marginLeft: 'auto', fontSize: 11, color: themeColors.textMuted, alignSelf: 'flex-end', marginBottom: 4 }}>
                      Peak: <Text style={{ color: '#00C48C', fontWeight: '700' }}>{peakWatts.toFixed(1)} W</Text> • Range: 0–{maxLiveScale}W
                    </Text>
                  </View>
                </View>
              </View>

              {/* Real-time SVG Stream Graph */}
              <View style={{ marginTop: 6, alignItems: 'center', overflow: 'hidden' }}>
                <Svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  <Defs>
                    <SvgGradient id="liveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#00D589" stopOpacity="0.45" />
                      <Stop offset="100%" stopColor="#00D589" stopOpacity="0.0" />
                    </SvgGradient>
                  </Defs>
                  {/* Subtle Grid Lines */}
                  <Path d={`M 0 ${svgHeight / 2} L ${svgWidth} ${svgHeight / 2}`} stroke={isDark ? '#334155' : '#E2E8F0'} strokeWidth="1" strokeDasharray="4,4" />
                  <Path d={`M 0 ${svgHeight - 1} L ${svgWidth} ${svgHeight - 1}`} stroke={isDark ? '#334155' : '#E2E8F0'} strokeWidth="1" />

                  {/* Shaded Area Under Curve */}
                  <Path d={areaPath} fill="url(#liveAreaGrad)" />

                  {/* Waveform Line */}
                  <Path d={linePath} fill="none" stroke="#00C48C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Pulsing Dot at current live point */}
                  <Circle cx={lastPoint.x} cy={lastPoint.y} r="8" fill="#00C48C" opacity="0.3" />
                  <Circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="#00C48C" />
                </Svg>

                {/* Live Time Labels */}
                <View style={[styles.xAxisRow, { width: '100%', marginTop: 4 }]}>
                  <Text style={[styles.xAxisLabel, { color: themeColors.textMuted }]}>-30s</Text>
                  <Text style={[styles.xAxisLabel, { color: themeColors.textMuted }]}>-20s</Text>
                  <Text style={[styles.xAxisLabel, { color: themeColors.textMuted }]}>-10s</Text>
                  <Text style={[styles.xAxisLabel, { color: '#00C48C', fontWeight: '700' }]}>Now (Live)</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* 2. Today's Usage Card (Dynamically Scaled for Low-Power Devices) */}
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
                  <Text style={styles.decreaseText}>
                    {Number(displayKwh) < 0.1 ? `${(Number(displayKwh) * 1000).toFixed(0)} Wh logged` : '▼ 12% vs yesterday'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bar Chart Tooltip */}
          {selectedBar !== null && hourlyBars[selectedBar] && (
            <View style={[styles.tooltipBox, { backgroundColor: isDark ? '#1F2937' : '#111827' }]}>
              <Text style={styles.tooltipText}>
                {hourlyBars[selectedBar].val < 0.1
                  ? `${(hourlyBars[selectedBar].val * 1000).toFixed(1)} Wh (${hourlyBars[selectedBar].val.toFixed(3)} kWh)`
                  : `${hourlyBars[selectedBar].val.toFixed(2)} kWh`} • {hourlyBars[selectedBar].time}
              </Text>
            </View>
          )}

          {/* Hourly Bar Chart with Adaptive Scale for Low-Power Appliances */}
          <View style={styles.barChartContainer}>
            <View style={styles.barsFlexRow}>
              {(() => {
                const maxVal = Math.max(0.005, ...hourlyBars.map((b) => b.val || 0));
                return hourlyBars.map((item, idx) => {
                  const heightPct = item.val > 0 ? Math.min(100, Math.max(12, (item.val / maxVal) * 100)) : 6;
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
                });
              })()}
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
                <Defs>
                  <SvgGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#00D589" />
                    <Stop offset="100%" stopColor="#3B82F6" />
                  </SvgGradient>
                </Defs>
                <Path
                  d="M 15 55 A 40 40 0 0 1 95 55"
                  fill="none"
                  stroke={isDark ? '#334155' : '#E2E8F0'}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <Path
                  d="M 15 55 A 40 40 0 0 1 80 20"
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              </Svg>
              <View style={styles.gaugeCenterIcon}>
                <Ionicons name="shield-checkmark" size={16} color="#00C48C" />
              </View>
            </View>

            <Text style={[styles.gaugeFooterText, { color: themeColors.textSecondary }]}>
              Goal: <Text style={{ color: '#00C48C', fontWeight: '700' }}>{monthGoalPct}</Text> used
            </Text>
          </View>

          {/* Estimated Bill Card */}
          <View style={[styles.halfCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.halfCardLabel, { color: themeColors.textSecondary }]}>Estimated Bill</Text>
            <Text style={[styles.halfCardValue, { color: themeColors.text }]}>₹ {billAmount}</Text>
            <Text style={[styles.billDueText, { color: themeColors.textMuted }]}>Based on active tariffs</Text>

            <View style={styles.billIconContainer}>
              <View
                style={[
                  styles.billIconBadge,
                  {
                    backgroundColor: themeColors.subCardBg,
                    borderColor: themeColors.subCardBorder,
                  },
                ]}
              >
                <Ionicons name="receipt-outline" size={28} color="#00C48C" />
                <View style={styles.shieldBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                </View>
              </View>
            </View>

            <Text style={[styles.gaugeFooterText, { color: themeColors.textSecondary }]}>
              Rate: <Text style={{ color: '#00C48C', fontWeight: '700' }}>₹6.50/kWh</Text>
            </Text>
          </View>
        </View>

        {/* Quick Insights Banner */}
        <TouchableOpacity
          style={[styles.insightBanner, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}
          onPress={() => router.push('/(tabs)/analytics')}
          activeOpacity={0.8}
        >
          <View style={[styles.leafIconBadge, { backgroundColor: isDark ? '#064E3B' : '#E8FBF4' }]}>
            <Ionicons name="leaf" size={20} color="#00C48C" />
          </View>
          <Text style={[styles.insightText, { color: themeColors.text }]}>
            Great! Active schedules are saving you an estimated 15% on monthly power consumption.
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

      {/* ─── MODAL 1: COUNTDOWN TIMER ─── */}
      <Modal visible={activeModal === 'timer'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconBadge}>
                  <Ionicons name="stopwatch" size={20} color="#00C48C" />
                </View>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>Smart Plug Timer</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Timer Active View */}
            {timer && timer.active ? (
              <View style={styles.timerActiveContainer}>
                <LinearGradient
                  colors={['#00D589', '#009E69']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.timerProgressHero}
                >
                  <Text style={styles.timerHeroLabel}>COUNTDOWN RUNNING</Text>
                  <Text style={styles.timerHeroDigits}>{formatTimerDigits(timer.secondsRemaining)}</Text>
                  <Text style={styles.timerHeroSub}>
                    Smart Plug will switch <Text style={{ fontWeight: '800' }}>{timer.targetState}</Text>
                  </Text>
                </LinearGradient>

                {/* Quick Add Minutes Row */}
                <View style={styles.timerExtendRow}>
                  <TouchableOpacity
                    style={[styles.timerExtendBtn, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}
                    onPress={() => addMinutesToTimer(5)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timerExtendText, { color: themeColors.text }]}>+5 Mins</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.timerExtendBtn, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}
                    onPress={() => addMinutesToTimer(15)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timerExtendText, { color: themeColors.text }]}>+15 Mins</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.timerExtendBtn, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}
                    onPress={() => addMinutesToTimer(30)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timerExtendText, { color: themeColors.text }]}>+30 Mins</Text>
                  </TouchableOpacity>
                </View>

                {/* Cancel Timer Button */}
                <TouchableOpacity
                  style={styles.cancelTimerBtn}
                  onPress={() => {
                    cancelTimer();
                    Alert.alert('Timer Cancelled', 'The countdown timer has been stopped.');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="stop-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.cancelTimerBtnText}>Stop & Cancel Timer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Timer Setup View */
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalSectionDesc, { color: themeColors.textSecondary }]}>
                  Automatically switch the smart plug ON or OFF after a designated duration.
                </Text>

                {/* Target State Selector */}
                <Text style={[styles.modalInputLabel, { color: themeColors.textSecondary }]}>WHEN TIMER ENDS:</Text>
                <View style={styles.timerActionToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.timerActionToggleBtn,
                      timerTargetState === 'OFF' && styles.timerActionToggleBtnActive,
                      { borderColor: timerTargetState === 'OFF' ? '#00C48C' : themeColors.subCardBorder },
                    ]}
                    onPress={() => setTimerTargetState('OFF')}
                  >
                    <Ionicons name="power" size={16} color={timerTargetState === 'OFF' ? '#00C48C' : themeColors.textMuted} />
                    <Text
                      style={[
                        styles.timerActionToggleText,
                        { color: timerTargetState === 'OFF' ? '#00C48C' : themeColors.textSecondary },
                      ]}
                    >
                      Turn Relay OFF
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.timerActionToggleBtn,
                      timerTargetState === 'ON' && styles.timerActionToggleBtnActive,
                      { borderColor: timerTargetState === 'ON' ? '#00C48C' : themeColors.subCardBorder },
                    ]}
                    onPress={() => setTimerTargetState('ON')}
                  >
                    <Ionicons name="flash" size={16} color={timerTargetState === 'ON' ? '#00C48C' : themeColors.textMuted} />
                    <Text
                      style={[
                        styles.timerActionToggleText,
                        { color: timerTargetState === 'ON' ? '#00C48C' : themeColors.textSecondary },
                      ]}
                    >
                      Turn Relay ON
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Preset Duration Pills */}
                <Text style={[styles.modalInputLabel, { color: themeColors.textSecondary }]}>SELECT DURATION:</Text>
                <View style={styles.presetPillsGrid}>
                  {TIMER_PRESETS.map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.presetPill,
                        selectedTimerMinutes === mins && styles.presetPillActive,
                        {
                          backgroundColor: selectedTimerMinutes === mins ? '#00C48C' : themeColors.subCardBg,
                          borderColor: selectedTimerMinutes === mins ? '#00C48C' : themeColors.subCardBorder,
                        },
                      ]}
                      onPress={() => setSelectedTimerMinutes(mins)}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          { color: selectedTimerMinutes === mins ? '#FFFFFF' : themeColors.text },
                        ]}
                      >
                        {mins < 60 ? `${mins} Mins` : `${mins / 60} Hr${mins > 60 ? 's' : ''}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Stepper for Custom Duration */}
                <View style={[styles.stepperContainer, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setSelectedTimerMinutes((m) => Math.max(5, m - 5))}
                  >
                    <Ionicons name="remove" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.stepperValue, { color: themeColors.text }]}>{selectedTimerMinutes} Mins</Text>
                    <Text style={[styles.stepperSub, { color: themeColors.textMuted }]}>Duration</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setSelectedTimerMinutes((m) => Math.min(480, m + 5))}
                  >
                    <Ionicons name="add" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Start Timer Button */}
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={handleStartTimer}
                  activeOpacity={0.88}
                >
                  <Ionicons name="play" size={18} color="#FFFFFF" />
                  <Text style={styles.modalPrimaryBtnText}>
                    Start {selectedTimerMinutes} Min Timer
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL 2: AUTOMATION SCHEDULES ─── */}
      <Modal visible={activeModal === 'schedule'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCardLarge, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconBadge}>
                  <Ionicons name="time" size={20} color="#00C48C" />
                </View>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>Plug Schedules</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header Bar & Add Trigger */}
              <View style={styles.scheduleHeaderBar}>
                <Text style={[styles.scheduleCountBadge, { color: themeColors.textSecondary }]}>
                  {activeScheduleCount} OF {schedules ? schedules.length : 0} ACTIVE
                </Text>
                <TouchableOpacity
                  style={[styles.addScheduleToggleBtn, { backgroundColor: isAddingSchedule ? '#EF4444' : '#00C48C' }]}
                  onPress={() => setIsAddingSchedule(!isAddingSchedule)}
                >
                  <Ionicons name={isAddingSchedule ? 'close' : 'add'} size={14} color="#FFFFFF" />
                  <Text style={styles.addScheduleToggleText}>{isAddingSchedule ? 'Cancel' : 'New Schedule'}</Text>
                </TouchableOpacity>
              </View>

              {/* Add Schedule Form */}
              {isAddingSchedule && (
                <View style={[styles.addScheduleBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                  <Text style={[styles.addScheduleTitle, { color: themeColors.text }]}>Create Plug Schedule</Text>

                  <View style={styles.scheduleInputGroup}>
                    <Text style={[styles.modalInputLabel, { color: themeColors.textSecondary }]}>SCHEDULE NAME</Text>
                    <TextInput
                      style={[styles.scheduleTextInput, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, color: themeColors.text }]}
                      placeholder="e.g. Night Sleep Saver, AC Cutoff"
                      placeholderTextColor={themeColors.textMuted}
                      value={newScheduleName}
                      onChangeText={setNewScheduleName}
                    />
                  </View>

                  <View style={styles.timeInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalInputLabel, { color: themeColors.textSecondary }]}>TURN ON TIME</Text>
                      <TextInput
                        style={[styles.scheduleTextInput, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, color: themeColors.text }]}
                        placeholder="06:30"
                        placeholderTextColor={themeColors.textMuted}
                        value={newOnTime}
                        onChangeText={setNewOnTime}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalInputLabel, { color: themeColors.textSecondary }]}>TURN OFF TIME</Text>
                      <TextInput
                        style={[styles.scheduleTextInput, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, color: themeColors.text }]}
                        placeholder="23:30"
                        placeholderTextColor={themeColors.textMuted}
                        value={newOffTime}
                        onChangeText={setNewOffTime}
                      />
                    </View>
                  </View>

                  <Text style={[styles.modalInputLabel, { color: themeColors.textSecondary }]}>REPEAT DAYS:</Text>
                  <View style={styles.repeatPillsRow}>
                    {(['EVERYDAY', 'WEEKDAYS', 'WEEKENDS'] as const).map((rep) => (
                      <TouchableOpacity
                        key={rep}
                        style={[
                          styles.repeatPill,
                          newRepeat === rep && styles.repeatPillActive,
                          {
                            backgroundColor: newRepeat === rep ? '#00C48C' : themeColors.card,
                            borderColor: newRepeat === rep ? '#00C48C' : themeColors.cardBorder,
                          },
                        ]}
                        onPress={() => setNewRepeat(rep)}
                      >
                        <Text style={[styles.repeatPillText, { color: newRepeat === rep ? '#FFFFFF' : themeColors.textSecondary }]}>
                          {rep === 'EVERYDAY' ? 'Every Day' : rep === 'WEEKDAYS' ? 'Weekdays' : 'Weekends'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.saveScheduleSubmitBtn}
                    onPress={handleCreateSchedule}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.saveScheduleSubmitText}>Save Automation Schedule</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Schedules List */}
              {schedules && schedules.length > 0 ? (
                schedules.map((sch) => (
                  <View
                    key={sch.id}
                    style={[
                      styles.scheduleCard,
                      {
                        backgroundColor: themeColors.subCardBg,
                        borderColor: sch.enabled ? '#00C48C' : themeColors.subCardBorder,
                      },
                    ]}
                  >
                    <View style={styles.scheduleCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.scheduleCardName, { color: themeColors.text }]}>{sch.name}</Text>
                          {sch.category && (
                            <View style={styles.scheduleCatBadge}>
                              <Text style={styles.scheduleCatBadgeText}>{sch.category}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.scheduleTimeRow}>
                          <View style={styles.timePillOn}>
                            <Ionicons name="play" size={10} color="#10B981" />
                            <Text style={styles.timePillOnText}>ON: {format12Hour(sch.onTime)}</Text>
                          </View>
                          <Ionicons name="arrow-forward" size={12} color={themeColors.textMuted} />
                          <View style={styles.timePillOff}>
                            <Ionicons name="stop" size={10} color="#EF4444" />
                            <Text style={styles.timePillOffText}>OFF: {format12Hour(sch.offTime)}</Text>
                          </View>
                        </View>
                        <Text style={[styles.scheduleRepeatText, { color: themeColors.textMuted }]}>
                          🔁 Repeats {sch.repeat === 'EVERYDAY' ? 'Daily (7 days)' : sch.repeat === 'WEEKDAYS' ? 'Mon – Fri' : 'Sat – Sun'}
                        </Text>
                      </View>

                      {/* Switch and Delete */}
                      <View style={styles.scheduleCardActions}>
                        <Switch
                          value={sch.enabled}
                          onValueChange={() => toggleSchedule(sch.id)}
                          trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#00D589' }}
                          thumbColor="#FFFFFF"
                        />
                        <TouchableOpacity
                          style={styles.deleteScheduleBtn}
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              const g = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
                              if (g?.confirm && g.confirm(`Delete '${sch.name}'?`)) {
                                deleteSchedule(sch.id);
                              }
                            } else {
                              Alert.alert('Delete Schedule', `Delete '${sch.name}'?`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteSchedule(sch.id) },
                              ]);
                            }
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptySchedulesBox}>
                  <Ionicons name="calendar-outline" size={36} color={themeColors.textMuted} />
                  <Text style={[styles.emptySchedulesTitle, { color: themeColors.text }]}>No Schedules Created</Text>
                  <Text style={[styles.emptySchedulesSub, { color: themeColors.textSecondary }]}>
                    Click 'New Schedule' above to automate when your smart plug switches ON and OFF.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL 3: HARDWARE KIT & WIRING GUIDE ─── */}
      <Modal visible={activeModal === 'hardware'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconBadge}>
                  <Ionicons name="hardware-chip" size={20} color="#00C48C" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>IoT Kit Wiring & Specs</Text>
                  <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>Ordered Components Pinout Map</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Ordered Components Inventory List */}
              <Text style={[styles.hwSectionTitle, { color: themeColors.text }]}>📦 ORDERED HARDWARE INVENTORY</Text>
              
              <View style={[styles.hwCompBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                <View style={styles.hwCompRow}>
                  <Text style={[styles.hwCompName, { color: themeColors.text }]}>1. Peacefair PZEM-004T v3 AC Meter</Text>
                  <View style={styles.hwBadgeOk}><Text style={styles.hwBadgeOkText}>UART Serial2</Text></View>
                </View>
                <Text style={[styles.hwCompSub, { color: themeColors.textSecondary }]}>SKU: R154877 • Measures Voltage, Current, Power, kWh, Hz, PF</Text>
              </View>

              <View style={[styles.hwCompBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                <View style={styles.hwCompRow}>
                  <Text style={[styles.hwCompName, { color: themeColors.text }]}>2. Hi-Link HLK-PM01 5V/3W AC-DC Module</Text>
                  <View style={styles.hwBadgeOk}><Text style={styles.hwBadgeOkText}>220V ➔ 5V DC</Text></View>
                </View>
                <Text style={[styles.hwCompSub, { color: themeColors.textSecondary }]}>SKU: 211849 • Self-Powers ESP32, Relays & PZEM directly</Text>
              </View>

              <View style={[styles.hwCompBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                <View style={styles.hwCompRow}>
                  <Text style={[styles.hwCompName, { color: themeColors.text }]}>3. ESP-WROOM-32 WIFI Bluetooth Board</Text>
                  <View style={styles.hwBadgeOk}><Text style={styles.hwBadgeOkText}>MCU Core</Text></View>
                </View>
                <Text style={[styles.hwCompSub, { color: themeColors.textSecondary }]}>SKU: 835800 • BLE Provisioning & 1Hz Telemetry Transmitter</Text>
              </View>

              <View style={[styles.hwCompBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                <View style={styles.hwCompRow}>
                  <Text style={[styles.hwCompName, { color: themeColors.text }]}>4. 5V Dual Channel Relay Module</Text>
                  <View style={styles.hwBadgeOk}><Text style={styles.hwBadgeOkText}>Optocoupler</Text></View>
                </View>
                <Text style={[styles.hwCompSub, { color: themeColors.textSecondary }]}>SKU: 31557 • Relay CH1 (GPIO 26 Active) & Relay CH2 (GPIO 27 Free)</Text>
              </View>

              <View style={[styles.hwCompBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                <View style={styles.hwCompRow}>
                  <Text style={[styles.hwCompName, { color: themeColors.text }]}>5. MB102 Breadboard + Jumper Cable Kit</Text>
                  <View style={styles.hwBadgeOk}><Text style={styles.hwBadgeOkText}>Prototyping</Text></View>
                </View>
                <Text style={[styles.hwCompSub, { color: themeColors.textSecondary }]}>SKUs: 24438, 7447, 7450, 44299 • Male-Male, Male-Female, Female-Female</Text>
              </View>

              {/* Pinout Connection Table */}
              <Text style={[styles.hwSectionTitle, { color: themeColors.text, marginTop: 16 }]}>🔌 BREADBOARD PINOUT MAP</Text>
              <View style={[styles.pinoutTable, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                <View style={styles.pinoutRowHeader}>
                  <Text style={[styles.pinoutHeaderCell, { flex: 1.2, color: themeColors.text }]}>ESP32 Pin</Text>
                  <Text style={[styles.pinoutHeaderCell, { flex: 1.5, color: themeColors.text }]}>Target Pin</Text>
                  <Text style={[styles.pinoutHeaderCell, { flex: 1.3, color: themeColors.text }]}>Wire Type</Text>
                </View>

                <View style={styles.pinoutRow}>
                  <Text style={[styles.pinoutCell, { flex: 1.2, color: '#00C48C' }]}>GPIO 16 (RX2)</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.5, color: themeColors.text }]}>PZEM-004T TX</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.3, color: themeColors.textSecondary }]}>Male-Female</Text>
                </View>

                <View style={styles.pinoutRow}>
                  <Text style={[styles.pinoutCell, { flex: 1.2, color: '#00C48C' }]}>GPIO 17 (TX2)</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.5, color: themeColors.text }]}>PZEM-004T RX</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.3, color: themeColors.textSecondary }]}>Male-Female</Text>
                </View>

                <View style={styles.pinoutRow}>
                  <Text style={[styles.pinoutCell, { flex: 1.2, color: '#00C48C' }]}>GPIO 26</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.5, color: themeColors.text }]}>Relay IN1 (Primary Load)</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.3, color: themeColors.textSecondary }]}>Male-Female</Text>
                </View>

                <View style={styles.pinoutRow}>
                  <Text style={[styles.pinoutCell, { flex: 1.2, color: '#00C48C' }]}>GPIO 27</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.5, color: themeColors.text }]}>Relay IN2 (Free / Reserved)</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.3, color: themeColors.textSecondary }]}>Unassigned</Text>
                </View>

                <View style={styles.pinoutRow}>
                  <Text style={[styles.pinoutCell, { flex: 1.2, color: '#00C48C' }]}>5V / VIN</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.5, color: themeColors.text }]}>HLK-PM01 +5V Rail</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.3, color: themeColors.textSecondary }]}>Male-Male</Text>
                </View>

                <View style={styles.pinoutRow}>
                  <Text style={[styles.pinoutCell, { flex: 1.2, color: '#00C48C' }]}>GND</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.5, color: themeColors.text }]}>HLK-PM01 GND Rail</Text>
                  <Text style={[styles.pinoutCell, { flex: 1.3, color: themeColors.textSecondary }]}>Male-Male</Text>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeHwBtn}
                onPress={() => setActiveModal(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.closeHwBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    marginRight: 10,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    fontSize: 20,
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
    gap: 10,
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
    position: 'relative',
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
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  timerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timerPillIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 196, 140, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  timerBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  timerBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBannerManageBtn: {
    backgroundColor: '#00C48C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timerBannerManageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerBannerCancelBtn: {
    padding: 4,
  },
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
    position: 'relative',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  actionBadgePill: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#00C48C',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  actionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalCardLarge: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 196, 140, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSectionDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  timerActionToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  timerActionToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  timerActionToggleBtnActive: {
    borderColor: '#00C48C',
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
  },
  timerActionToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetPillActive: {
    backgroundColor: '#00C48C',
    borderColor: '#00C48C',
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  stepperSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalPrimaryBtn: {
    backgroundColor: '#00C48C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timerActiveContainer: {
    paddingVertical: 8,
  },
  timerProgressHero: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  timerHeroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
  },
  timerHeroDigits: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
    letterSpacing: -1,
  },
  timerHeroSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  timerExtendRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timerExtendBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  timerExtendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancelTimerBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  cancelTimerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scheduleHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  scheduleCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addScheduleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addScheduleToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addScheduleBox: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  addScheduleTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  scheduleInputGroup: {
    marginBottom: 10,
  },
  scheduleTextInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  repeatPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  repeatPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  repeatPillActive: {
    backgroundColor: '#00C48C',
    borderColor: '#00C48C',
  },
  repeatPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  saveScheduleSubmitBtn: {
    backgroundColor: '#00C48C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveScheduleSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scheduleCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  scheduleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleCardName: {
    fontSize: 14,
    fontWeight: '800',
  },
  scheduleCatBadge: {
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scheduleCatBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00C48C',
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  timePillOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timePillOnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  timePillOff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timePillOffText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  scheduleRepeatText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  scheduleCardActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  deleteScheduleBtn: {
    padding: 4,
  },
  emptySchedulesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptySchedulesTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  dualRelayCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  dualRelayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dualRelayHeaderBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualRelayTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dualRelaySub: {
    fontSize: 11,
  },
  hardwareModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  hardwareModalBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C48C',
  },
  dualRelayGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  channelCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
  },
  channelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  channelIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  channelName: {
    fontSize: 13,
    fontWeight: '800',
  },
  channelRole: {
    fontSize: 10,
    marginTop: 2,
  },
  hwSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  hwCompBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  hwCompRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hwCompName: {
    fontSize: 13,
    fontWeight: '800',
  },
  hwCompSub: {
    fontSize: 11,
    marginTop: 4,
  },
  hwBadgeOk: {
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hwBadgeOkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00C48C',
  },
  pinoutTable: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  pinoutRowHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.2)',
  },
  pinoutHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
  },
  pinoutRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(156, 163, 175, 0.1)',
  },
  pinoutCell: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeHwBtn: {
    backgroundColor: '#00C48C',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeHwBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySchedulesSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  voltageWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  voltageWarningIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voltageWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  voltageWarningSub: {
    fontSize: 11,
    lineHeight: 15,
  },
});
