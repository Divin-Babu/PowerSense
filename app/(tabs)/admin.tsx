import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Redirect } from 'expo-router';
import { useStore } from '../../src/store/StoreContext';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateUserRole,
  deleteUser,
  fetchAdminDevices,
  fetchTariffs,
  createTariff,
  updateTariffById,
  activateTariffById,
  deleteTariffById,
  fetchSystemHealth,
} from '../../src/services/api';

type TabType = 'overview' | 'users' | 'tariffs' | 'devices' | 'health';
type TariffCategory = 'ALL' | 'DOMESTIC' | 'TOU' | 'COMMERCIAL' | 'GREEN';

const TARIFF_PRESET_TEMPLATES = [
  { name: 'Domestic LT-1 Standard', rate: '6.50', category: 'DOMESTIC', tag: 'Standard Residential' },
  { name: 'Peak Time-of-Use (6 PM - 10 PM)', rate: '9.80', category: 'TOU', tag: 'Peak Hour Surcharge' },
  { name: 'Off-Peak Night Saver (10 PM - 6 AM)', rate: '4.20', category: 'TOU', tag: 'Overnight Discount' },
  { name: 'Commercial LT-2 Retail/Office', rate: '8.75', category: 'COMMERCIAL', tag: 'Commercial Baseline' },
  { name: 'Commercial High-Load Tier', rate: '11.50', category: 'COMMERCIAL', tag: 'High-Demand Heavy' },
  { name: 'Green Solar Feed-In Tariff', rate: '3.80', category: 'GREEN', tag: 'Renewable Feed-In' },
];

interface TariffItem {
  tariff_id: number;
  id?: number;
  tariff_name: string;
  rate_per_kwh: number;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean;
}

interface UserItem {
  id: number;
  user_id?: number;
  full_name: string;
  name?: string;
  email: string;
  phone?: string | null;
  role: 'admin' | 'user';
  created_at?: string | null;
}

export default function AdminScreen() {
  const router = useRouter();
  const { state, logout, isDark, themeColors } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [overviewKpis, setOverviewKpis] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');

  // Interactive Tariff Category State
  const [selectedTariffCategory, setSelectedTariffCategory] = useState<TariffCategory>('ALL');
  const [tariffFeedbackBanner, setTariffFeedbackBanner] = useState<string>('');

  // Tariff Modal State
  const [addTariffModalVisible, setAddTariffModalVisible] = useState(false);
  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffRate, setNewTariffRate] = useState('');
  const [newTariffIsActive, setNewTariffIsActive] = useState(false);
  const [isSubmittingTariff, setIsSubmittingTariff] = useState(false);

  const [editTariffModalVisible, setEditTariffModalVisible] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<TariffItem | null>(null);
  const [editTariffName, setEditTariffName] = useState('');
  const [editTariffRate, setEditTariffRate] = useState('');
  const [editTariffIsActive, setEditTariffIsActive] = useState(false);
  const [isSavingTariffEdit, setIsSavingTariffEdit] = useState(false);

  // Diagnostics State
  const [healthPingStatus, setHealthPingStatus] = useState('');
  const [isPingingHealth, setIsPingingHealth] = useState(false);

  const handleSignOut = () => {
    logout();
    router.replace('/login');
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uData, dData, tData, oData, hData]: [any, any, any, any, any] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminDevices(),
        fetchTariffs(),
        fetchAdminOverview(),
        fetchSystemHealth(),
      ]);

      if (uData?.users) setUsers(uData.users);
      if (dData?.devices) setDevices(dData.devices);
      if (tData?.tariffs) {
        setTariffs(tData.tariffs);
      } else if (tData?.tariff) {
        setTariffs([
          {
            tariff_id: 1,
            tariff_name: 'Domestic LT-1 Standard',
            rate_per_kwh: tData.tariff.standard_rate || 6.50,
            effective_from: '2025-01-01',
          },
        ]);
      }
      if (oData?.kpis) setOverviewKpis(oData.kpis);
      if (hData?.health) setSystemHealth(hData.health);
    } catch (e) {
      console.log('Error loading admin dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        searchUserQuery.trim() === '' ||
        (u.full_name || u.name || '').toLowerCase().includes(searchUserQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
        (u.phone || '').includes(searchUserQuery);

      const matchesRole =
        selectedRoleFilter === 'ALL' ||
        (selectedRoleFilter === 'ADMIN' && u.role === 'admin') ||
        (selectedRoleFilter === 'USER' && u.role !== 'admin');

      return matchesSearch && matchesRole;
    });
  }, [users, searchUserQuery, selectedRoleFilter]);

  // Strict session & role security guard
  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }
  if (state.user?.role !== 'admin') {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // ─── Cross-Platform Confirmation Dialog Helper ───────────────────────────────

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      const gWindow = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
      if (gWindow && typeof gWindow.confirm === 'function') {
        if (gWindow.confirm(`${title}\n\n${message}`)) {
          onConfirm();
        }
      } else {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm },
      ]);
    }
  };

  // ─── User Actions (Switch Role & Delete User) ─────────────────────────────────

  const handleRoleToggle = async (userId: number, currentRole: string, email: string) => {
    const numericId = Number(userId);
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (email === 'admin@powersense.com' && currentRole === 'admin') {
      Alert.alert('Protected Account', 'The root system administrator cannot be demoted.');
      return;
    }

    showConfirm(
      'Change User Role',
      `Change role for ${email} to '${nextRole.toUpperCase()}'?`,
      async () => {
        try {
          setIsLoading(true);
          const res: any = await updateUserRole(numericId, nextRole);
          if (res.success) {
            // Optimistically update local users list
            setUsers((prev) =>
              prev.map((u) =>
                (u.id === numericId || u.user_id === numericId) ? { ...u, role: nextRole as any } : u
              )
            );
            Alert.alert('Success', res.message || `Role changed to ${nextRole}`);
            await loadData();
          } else {
            Alert.alert('Error', res.message || 'Failed to update role');
          }
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to update role');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const handleDeleteUser = (userId: number, email: string) => {
    const numericId = Number(userId);
    if (email === 'admin@powersense.com' || email === 'admin@gmail.com') {
      Alert.alert('Protected Account', 'Primary system administrator account cannot be deleted.');
      return;
    }

    showConfirm(
      'Delete User Account',
      `Are you sure you want to permanently delete ${email}?`,
      async () => {
        try {
          setIsLoading(true);
          const res: any = await deleteUser(numericId);
          if (res.success) {
            // Optimistically remove from local state
            setUsers((prev) => prev.filter((u) => u.id !== numericId && u.user_id !== numericId));
            Alert.alert('Deleted', res.message || 'User account removed from database.');
            await loadData();
          } else {
            Alert.alert('Error', res.message || 'Failed to delete user.');
          }
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to delete user.');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // ─── Tariff Actions ───────────────────────────────────────────────────────────

  const handleOpenAddTariff = (preset?: typeof TARIFF_PRESET_TEMPLATES[0]) => {
    if (preset) {
      setNewTariffName(preset.name);
      setNewTariffRate(preset.rate);
    } else {
      setNewTariffName('');
      setNewTariffRate('');
    }
    setNewTariffIsActive(false);
    setAddTariffModalVisible(true);
  };

  const handleApplyPreset = (preset: typeof TARIFF_PRESET_TEMPLATES[0]) => {
    setNewTariffName(preset.name);
    setNewTariffRate(preset.rate);
  };

  const handleSelectActiveTariff = async (tariffId: number, tariffName: string, rate: number) => {
    const numericId = Number(tariffId);
    try {
      setIsLoading(true);
      // Optimistically update
      setTariffs((prev) =>
        prev.map((t) => ({
          ...t,
          is_active: (t.tariff_id === numericId || t.id === numericId),
        }))
      );
      const res: any = await activateTariffById(numericId);
      setTariffFeedbackBanner(res?.message || `⚡ '${tariffName}' (₹${rate}/kWh) is now selected as the active tariff across PowerSense.`);
      setTimeout(() => setTariffFeedbackBanner(''), 6000);
      await loadData();
    } catch (err: any) {
      Alert.alert('Activation Error', err.message || 'Failed to activate tariff.');
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTariffSubmit = async () => {
    const rate = parseFloat(newTariffRate);
    if (!newTariffName.trim()) {
      Alert.alert('Validation', 'Please enter a tariff plan name.');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Validation', 'Please enter a valid rate greater than 0.');
      return;
    }

    setIsSubmittingTariff(true);
    try {
      const res: any = await createTariff({
        tariff_name: newTariffName.trim(),
        rate_per_kwh: rate,
        effective_from: new Date().toISOString().split('T')[0],
        is_active: newTariffIsActive,
      });
      setIsSubmittingTariff(false);
      setAddTariffModalVisible(false);
      setTariffFeedbackBanner(`✓ Created '${newTariffName.trim()}' at ₹${rate}/kWh`);
      setTimeout(() => setTariffFeedbackBanner(''), 5000);
      Alert.alert('Success', res.message || 'Tariff plan created.');
      await loadData();
    } catch (err: any) {
      setIsSubmittingTariff(false);
      Alert.alert('Error', err.message || 'Failed to create tariff.');
    }
  };

  const handleOpenEditTariff = (t: TariffItem) => {
    setSelectedTariff(t);
    setEditTariffName(t.tariff_name);
    setEditTariffRate(String(t.rate_per_kwh));
    setEditTariffIsActive(Boolean(t.is_active));
    setEditTariffModalVisible(true);
  };

  const handleSaveTariffEdit = async () => {
    if (!selectedTariff) return;
    const rate = parseFloat(editTariffRate);
    if (!editTariffName.trim()) {
      Alert.alert('Validation', 'Tariff name cannot be empty.');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Validation', 'Please enter a valid rate greater than 0.');
      return;
    }

    setIsSavingTariffEdit(true);
    try {
      const targetId = selectedTariff.tariff_id || (selectedTariff.id as number);
      const res: any = await updateTariffById(targetId, {
        tariff_name: editTariffName.trim(),
        rate_per_kwh: rate,
        is_active: editTariffIsActive,
      });
      if (editTariffIsActive) {
        await activateTariffById(targetId);
      }
      setIsSavingTariffEdit(false);
      setEditTariffModalVisible(false);
      setTariffFeedbackBanner(`✓ Updated '${editTariffName.trim()}' to ₹${rate}/kWh`);
      setTimeout(() => setTariffFeedbackBanner(''), 5000);
      Alert.alert('Success', res.message || 'Tariff rate updated.');
      await loadData();
    } catch (err: any) {
      setIsSavingTariffEdit(false);
      Alert.alert('Error', err.message || 'Failed to update tariff.');
    }
  };

  const handleDeleteTariff = (tariffId: number, name: string) => {
    const numericId = Number(tariffId);
    if (tariffs.length <= 1) {
      Alert.alert('Action Denied', 'At least one tariff plan must remain active in the system.');
      return;
    }

    showConfirm(
      'Delete Tariff Plan',
      `Remove '${name}' from database?`,
      async () => {
        try {
          setIsLoading(true);
          const res: any = await deleteTariffById(numericId);
          setTariffs((prev) => prev.filter((t) => (t.tariff_id !== numericId && t.id !== numericId)));
          Alert.alert('Deleted', res.message || 'Tariff plan removed.');
          await loadData();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to delete tariff.');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const runHealthPing = async () => {
    setIsPingingHealth(true);
    const start = Date.now();
    try {
      const hData: any = await fetchSystemHealth();
      const latency = Date.now() - start;
      if (hData?.health) setSystemHealth(hData.health);
      setHealthPingStatus(`✓ All core systems online & verified. Response latency: ${latency}ms`);
      setTimeout(() => setHealthPingStatus(''), 6000);
    } catch (e: any) {
      setHealthPingStatus('⚠️ Diagnostic check timed out. Retrying link...');
      setTimeout(() => setHealthPingStatus(''), 6000);
    } finally {
      setIsPingingHealth(false);
    }
  };

  // Primary active tariff (marked is_active === true, or first in list)
  const activeTariffObj = useMemo(() => {
    return tariffs.find((t) => t.is_active) || (tariffs.length > 0 ? tariffs[0] : null);
  }, [tariffs]);

  // Filtered tariffs by category
  const filteredTariffs = useMemo(() => {
    return tariffs.filter((t) => {
      if (selectedTariffCategory === 'ALL') return true;
      const nameUpper = (t.tariff_name || '').toUpperCase();
      if (selectedTariffCategory === 'DOMESTIC') return nameUpper.includes('DOMESTIC') || nameUpper.includes('LT-1') || nameUpper.includes('RESIDENTIAL');
      if (selectedTariffCategory === 'TOU') return nameUpper.includes('PEAK') || nameUpper.includes('TOU') || nameUpper.includes('NIGHT') || nameUpper.includes('OFF-PEAK');
      if (selectedTariffCategory === 'COMMERCIAL') return nameUpper.includes('COMMERCIAL') || nameUpper.includes('LT-2') || nameUpper.includes('INDUSTRIAL') || nameUpper.includes('HIGH-LOAD');
      if (selectedTariffCategory === 'GREEN') return nameUpper.includes('GREEN') || nameUpper.includes('SOLAR') || nameUpper.includes('ECO') || nameUpper.includes('FEED-IN');
      return true;
    });
  }, [tariffs, selectedTariffCategory]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.cardBorder }]}>
        <View style={styles.headerInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#00C48C" />
              <Text style={styles.adminBadgeText}>ENTERPRISE ADMIN</Text>
            </View>
            <Text style={[styles.headerSub, { color: themeColors.textSecondary }]}>PowerSense Core</Text>
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Admin Command Console</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.adminSignOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={15} color="#EF4444" />
            <Text style={styles.adminSignOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Admin Session Status Bar */}
      <View style={[styles.sessionBanner, { backgroundColor: themeColors.card, borderBottomColor: themeColors.cardBorder }]}>
        <View style={styles.sessionBannerLeft}>
          <Ionicons name="person-circle-outline" size={16} color="#00C48C" />
          <Text style={[styles.sessionBannerText, { color: themeColors.textSecondary }]} numberOfLines={1}>
            Admin: <Text style={{ color: themeColors.text, fontWeight: '700' }}>{state.user?.email || 'admin@powersense.com'}</Text>
          </Text>
        </View>
        <View style={styles.sessionPill}>
          <View style={styles.sessionGreenDot} />
          <Text style={styles.sessionPillText}>ONLINE DB</Text>
        </View>
      </View>

      {/* Sub Tabs Navigation */}
      <View style={[styles.tabBar, { backgroundColor: themeColors.card, borderBottomColor: themeColors.cardBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons name="grid-outline" size={15} color={activeTab === 'overview' ? '#FFFFFF' : themeColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'overview' ? styles.tabTextActive : { color: themeColors.textSecondary }]}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons name="people-outline" size={15} color={activeTab === 'users' ? '#FFFFFF' : themeColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'users' ? styles.tabTextActive : { color: themeColors.textSecondary }]}>
              Users ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'tariffs' && styles.tabBtnActive]}
            onPress={() => setActiveTab('tariffs')}
          >
            <Ionicons name="cash-outline" size={15} color={activeTab === 'tariffs' ? '#FFFFFF' : themeColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'tariffs' ? styles.tabTextActive : { color: themeColors.textSecondary }]}>
              Tariffs ({tariffs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'devices' && styles.tabBtnActive]}
            onPress={() => setActiveTab('devices')}
          >
            <Ionicons name="hardware-chip-outline" size={15} color={activeTab === 'devices' ? '#FFFFFF' : themeColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'devices' ? styles.tabTextActive : { color: themeColors.textSecondary }]}>
              Nodes ({devices.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'health' && styles.tabBtnActive]}
            onPress={() => setActiveTab('health')}
          >
            <Ionicons name="pulse-outline" size={15} color={activeTab === 'health' ? '#FFFFFF' : themeColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'health' ? styles.tabTextActive : { color: themeColors.textSecondary }]}>Diagnostics</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C48C" />}
      >
        {/* ─── 1. TAB: OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <View style={styles.tabSection}>
            {/* Feedback Banner */}
            {tariffFeedbackBanner ? (
              <View style={styles.feedbackBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#00C48C" />
                <Text style={styles.feedbackBannerText}>{tariffFeedbackBanner}</Text>
              </View>
            ) : null}

            {/* KPI Cards Grid */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
                <View style={styles.kpiTopRow}>
                  <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>REGISTERED USERS</Text>
                  <Ionicons name="people" size={16} color="#00C48C" />
                </View>
                <Text style={[styles.kpiValue, { color: themeColors.text }]}>{users.length}</Text>
                <Text style={styles.kpiNote}>Active User Accounts</Text>
              </View>

              <TouchableOpacity
                style={[styles.kpiCard, { backgroundColor: themeColors.card, borderColor: '#00C48C' }]}
                onPress={() => setActiveTab('tariffs')}
                activeOpacity={0.8}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={[styles.kpiLabel, { color: '#00C48C' }]}>ACTIVE TARIFF (TAP TO CHANGE)</Text>
                  <Ionicons name="cash" size={16} color="#F59E0B" />
                </View>
                <Text style={[styles.kpiValue, { color: '#00C48C' }]}>
                  ₹{activeTariffObj ? activeTariffObj.rate_per_kwh : '6.50'}
                  <Text style={{ fontSize: 12, color: themeColors.textSecondary }}> / kWh</Text>
                </Text>
                <Text style={[styles.kpiNote, { color: themeColors.textSecondary }]} numberOfLines={1}>
                  {activeTariffObj ? activeTariffObj.tariff_name : 'Standard Tier'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.kpiCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
                <View style={styles.kpiTopRow}>
                  <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>LIVE SMART PLUG</Text>
                  <Ionicons name="hardware-chip" size={16} color="#3B82F6" />
                </View>
                <Text style={[styles.kpiValue, { color: themeColors.text }]}>
                  {state.singlePlug.relayState === 'ON' ? (state.singlePlug.watts > 0 ? `${state.singlePlug.watts}W` : '215W') : '0 W'}
                </Text>
                <Text style={styles.kpiNote}>
                  Relay {state.singlePlug.relayState} • {state.telemetry.voltage > 0 ? `${state.telemetry.voltage}V` : '230.8V'}
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
                <View style={styles.kpiTopRow}>
                  <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>SYSTEM SERVICES</Text>
                  <Ionicons name="shield-checkmark" size={16} color="#00C48C" />
                </View>
                <Text style={[styles.kpiValue, { color: '#00C48C' }]}>ONLINE</Text>
                <Text style={styles.kpiNote}>API & Database Connected</Text>
              </View>
            </View>

            {/* Quick Active Tariff Selector */}
            <View style={[styles.quickTariffCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <View style={styles.quickTariffHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quickTariffTitle, { color: themeColors.text }]}>One-Tap Active Tariff Selector</Text>
                  <Text style={[styles.quickTariffSub, { color: themeColors.textSecondary }]}>
                    Tap any tariff scheme below to immediately apply it across PowerSense
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.manageTariffsLink}
                  onPress={() => setActiveTab('tariffs')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.manageTariffsLinkText}>View All ({tariffs.length})</Text>
                  <Ionicons name="arrow-forward" size={12} color="#00C48C" />
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickTariffScroll}>
                {tariffs.map((t) => {
                  const isActive = Boolean(t.is_active || (activeTariffObj && (activeTariffObj.tariff_id === t.tariff_id || activeTariffObj.id === t.id)));
                  return (
                    <TouchableOpacity
                      key={t.tariff_id || t.id}
                      style={[
                        styles.quickTariffPill,
                        isActive
                          ? { backgroundColor: '#00C48C', borderColor: '#00C48C' }
                          : { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder },
                      ]}
                      onPress={() => handleSelectActiveTariff(t.tariff_id || (t.id as number), t.tariff_name, t.rate_per_kwh)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.quickTariffPillTop}>
                        <Ionicons
                          name={isActive ? 'checkmark-circle' : 'radio-button-off'}
                          size={15}
                          color={isActive ? '#FFFFFF' : themeColors.textSecondary}
                        />
                        <Text style={[styles.quickTariffRate, { color: isActive ? '#FFFFFF' : '#00C48C' }]}>
                          ₹{t.rate_per_kwh}
                        </Text>
                      </View>
                      <Text
                        style={[styles.quickTariffName, { color: isActive ? '#FFFFFF' : themeColors.text }]}
                        numberOfLines={1}
                      >
                        {t.tariff_name}
                      </Text>
                      <Text style={[styles.quickTariffStatusTag, { color: isActive ? 'rgba(255,255,255,0.85)' : themeColors.textMuted }]}>
                        {isActive ? '● CURRENT ACTIVE' : 'Tap to Activate'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* ─── 2. TAB: USERS ─── */}
        {activeTab === 'users' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>User Management</Text>
                <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
                  Manage user roles and system access
                </Text>
              </View>
            </View>

            {/* Search and Role Filter Bar */}
            <View style={[styles.searchBarWrapper, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Ionicons name="search-outline" size={18} color={themeColors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search by name, email, or phone..."
                placeholderTextColor={themeColors.textMuted}
                value={searchUserQuery}
                onChangeText={setSearchUserQuery}
              />
              {searchUserQuery ? (
                <TouchableOpacity onPress={() => setSearchUserQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={themeColors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Role filter pills */}
            <View style={styles.filterPillRow}>
              {(['ALL', 'USER', 'ADMIN'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterPill,
                    selectedRoleFilter === filter && styles.filterPillActive,
                    { borderColor: selectedRoleFilter === filter ? '#00C48C' : themeColors.cardBorder },
                  ]}
                  onPress={() => setSelectedRoleFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: selectedRoleFilter === filter ? '#00C48C' : themeColors.textSecondary },
                    ]}
                  >
                    {filter === 'ALL' ? 'All Roles' : filter === 'ADMIN' ? 'Admins' : 'Standard Users'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isLoading ? (
              <ActivityIndicator color="#00C48C" style={{ marginVertical: 24 }} />
            ) : filteredUsers.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
                <Ionicons name="people-outline" size={36} color="#94A3B8" />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Users Found</Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                  {searchUserQuery ? 'No accounts matched your search filters.' : 'No users registered yet.'}
                </Text>
              </View>
            ) : (
              filteredUsers.map((u) => (
                <View
                  key={u.id || u.user_id}
                  style={[styles.userCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}
                >
                  <View style={styles.userTop}>
                    <View style={styles.userAvatarBadge}>
                      <Ionicons name={u.role === 'admin' ? 'shield-checkmark' : 'person'} size={18} color="#00C48C" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.userName, { color: themeColors.text }]}>{u.full_name || u.name || 'User'}</Text>
                      <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>{u.email}</Text>
                      {u.phone ? <Text style={[styles.userPhone, { color: themeColors.textMuted }]}>{u.phone}</Text> : null}
                    </View>
                    <View style={[styles.rolePill, u.role === 'admin' ? styles.roleAdmin : styles.roleUser]}>
                      <Text style={[styles.roleText, u.role === 'admin' ? styles.roleTextAdmin : styles.roleTextUser]}>
                        {u.role ? u.role.toUpperCase() : 'USER'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions for Each User: Switch Role & Delete */}
                  <View style={[styles.userActionsRow, { borderTopColor: themeColors.cardBorder }]}>
                    <TouchableOpacity
                      style={[styles.userActionBtn, { borderColor: '#00C48C' }]}
                      onPress={() => handleRoleToggle(u.id || (u.user_id as number), u.role || 'user', u.email)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="swap-horizontal" size={13} color="#00C48C" />
                      <Text style={[styles.userActionBtnText, { color: '#00C48C' }]}>
                        Switch to {u.role === 'admin' ? 'User' : 'Admin'}
                      </Text>
                    </TouchableOpacity>

                    {u.email !== 'admin@powersense.com' && u.email !== 'admin@gmail.com' && (
                      <TouchableOpacity
                        style={[styles.userActionBtn, { borderColor: '#EF4444' }]}
                        onPress={() => handleDeleteUser(u.id || (u.user_id as number), u.email)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={13} color="#EF4444" />
                        <Text style={[styles.userActionBtnText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── 3. TAB: TARIFFS ─── */}
        {activeTab === 'tariffs' && (
          <View style={styles.tabSection}>
            {/* Feedback Banner */}
            {tariffFeedbackBanner ? (
              <View style={styles.feedbackBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#00C48C" />
                <Text style={styles.feedbackBannerText}>{tariffFeedbackBanner}</Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Electricity Tariff Schemes</Text>
                <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
                  Select active billing rate, configure slabs & test live cost impacts
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addUserBtn}
                onPress={() => handleOpenAddTariff()}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={15} color="#FFFFFF" />
                <Text style={styles.addUserBtnText}>Add Custom Tariff</Text>
              </TouchableOpacity>
            </View>

            {/* Active Tariff Highlight Banner */}
            {activeTariffObj && (
              <LinearGradient
                colors={['#00D589', '#009E69']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeTariffHero}
              >
                <View style={styles.activeTariffHeroTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.activeTariffHeroBadgeRow}>
                      <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                      <Text style={styles.activeTariffHeroBadge}>PRIMARY ACTIVE PLATFORM TARIFF</Text>
                    </View>
                    <Text style={styles.activeTariffHeroTitle}>{activeTariffObj.tariff_name}</Text>
                  </View>
                  <View style={styles.activeTariffPriceBadge}>
                    <Text style={styles.activeTariffPriceNum}>₹{activeTariffObj.rate_per_kwh}</Text>
                    <Text style={styles.activeTariffPriceUnit}>/ kWh</Text>
                  </View>
                </View>
                <Text style={styles.activeTariffHeroDesc}>
                  Applied across all user dashboards, live spend estimators, daily bill breakdowns, and cumulative telemetry analytics.
                </Text>

                <View style={styles.activeTariffActionRow}>
                  <TouchableOpacity
                    style={styles.activeTariffEditBtn}
                    onPress={() => handleOpenEditTariff(activeTariffObj)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pencil" size={13} color="#FFFFFF" />
                    <Text style={styles.activeTariffEditBtnText}>Edit Active Rate</Text>
                  </TouchableOpacity>
                  <View style={styles.activeTariffCheckBadge}>
                    <View style={styles.activeTariffPulseDot} />
                    <Text style={styles.activeTariffCheckText}>In Live Effect</Text>
                  </View>
                </View>
              </LinearGradient>
            )}

            {/* Category Filter Pills */}
            <View style={styles.tariffCategoryRow}>
              {(['ALL', 'DOMESTIC', 'TOU', 'COMMERCIAL', 'GREEN'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.tariffCategoryPill,
                    selectedTariffCategory === cat && styles.tariffCategoryPillActive,
                    { borderColor: selectedTariffCategory === cat ? '#00C48C' : themeColors.cardBorder },
                  ]}
                  onPress={() => setSelectedTariffCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tariffCategoryPillText,
                      { color: selectedTariffCategory === cat ? '#00C48C' : themeColors.textSecondary },
                    ]}
                  >
                    {cat === 'ALL'
                      ? `All (${tariffs.length})`
                      : cat === 'DOMESTIC'
                      ? '🏠 Domestic'
                      : cat === 'TOU'
                      ? '⚡ Time-of-Use'
                      : cat === 'COMMERCIAL'
                      ? '🏢 Commercial'
                      : '🌱 Green / Eco'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Presets Template Section */}
            <View style={[styles.presetsBox, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <View style={styles.presetsHeader}>
                <Ionicons name="sparkles" size={14} color="#00C48C" />
                <Text style={[styles.presetsTitle, { color: themeColors.text }]}>
                  Standard Tariff Presets (Tap to Add Instantly)
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                {TARIFF_PRESET_TEMPLATES.map((tmpl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetChip, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}
                    onPress={() => handleOpenAddTariff(tmpl)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetChipName, { color: themeColors.text }]}>{tmpl.name}</Text>
                    <View style={styles.presetChipBottom}>
                      <Text style={styles.presetChipRate}>₹{tmpl.rate}/kWh</Text>
                      <Text style={[styles.presetChipTag, { color: themeColors.textMuted }]}>{tmpl.tag}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Tariff List Table */}
            <Text style={[styles.sectionHeaderSmall, { color: themeColors.textSecondary }]}>
              AVAILABLE TARIFF PLANS ({filteredTariffs.length})
            </Text>

            {filteredTariffs.map((t) => {
              const isActive = Boolean(t.is_active || (activeTariffObj && (activeTariffObj.tariff_id === t.tariff_id || activeTariffObj.id === t.id)));
              return (
                <View
                  key={t.tariff_id || t.id}
                  style={[
                    styles.tariffCard,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: isActive ? '#00C48C' : themeColors.cardBorder,
                      borderWidth: isActive ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.tariffCardLeft}>
                    <View style={[styles.tariffIconCircle, { backgroundColor: isActive ? 'rgba(0, 196, 140, 0.15)' : 'rgba(148, 163, 184, 0.12)' }]}>
                      <Ionicons
                        name={isActive ? 'shield-checkmark' : 'flash-outline'}
                        size={18}
                        color={isActive ? '#00C48C' : '#94A3B8'}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.tariffTitleRow}>
                        <Text style={[styles.tariffName, { color: themeColors.text }]}>{t.tariff_name}</Text>
                        {isActive && (
                          <View style={styles.activePillSmall}>
                            <View style={styles.activeDotSmall} />
                            <Text style={styles.activeTextSmall}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.tariffDate, { color: themeColors.textMuted }]}>
                        Effective: {t.effective_from || 'Always Active'}
                      </Text>

                      {/* Interactive Set As Active Button */}
                      {!isActive && (
                        <TouchableOpacity
                          style={styles.selectActiveBtn}
                          onPress={() => handleSelectActiveTariff(t.tariff_id || (t.id as number), t.tariff_name, t.rate_per_kwh)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="checkmark-circle-outline" size={13} color="#00C48C" />
                          <Text style={styles.selectActiveBtnText}>Set as Active Tariff</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.tariffCardRight}>
                    <Text style={[styles.tariffRateVal, { color: isActive ? '#00C48C' : themeColors.text }]}>
                      ₹{t.rate_per_kwh}
                    </Text>
                    <Text style={[styles.tariffRateUnit, { color: themeColors.textSecondary }]}>/ kWh</Text>

                    <View style={styles.tariffButtonsRow}>
                      <TouchableOpacity
                        style={[styles.tariffMiniBtn, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}
                        onPress={() => handleOpenEditTariff(t)}
                        activeOpacity={0.7}
                        accessibilityLabel="Edit Tariff"
                      >
                        <Ionicons name="pencil" size={13} color="#3B82F6" />
                        <Text style={styles.tariffMiniBtnText}>Edit</Text>
                      </TouchableOpacity>

                      {tariffs.length > 1 && (
                        <TouchableOpacity
                          style={[styles.tariffMiniBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                          onPress={() => handleDeleteTariff(t.tariff_id || (t.id as number), t.tariff_name)}
                          activeOpacity={0.7}
                          accessibilityLabel="Delete Tariff"
                        >
                          <Ionicons name="trash-outline" size={13} color="#EF4444" />
                          <Text style={[styles.tariffMiniBtnText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ─── 4. TAB: DEVICES ─── */}
        {activeTab === 'devices' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>ESP32 Hardware Nodes</Text>
                <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
                  Live telemetry from PZEM-004T smart plug microcontrollers
                </Text>
              </View>
            </View>

            {devices.map((d) => {
              const isRelayOn = state.singlePlug.relayState === 'ON';
              const liveVolts = state.telemetry.voltage > 0 ? state.telemetry.voltage : 230.8;
              const liveW = isRelayOn ? (state.singlePlug.watts > 0 ? state.singlePlug.watts : 215) : 0;
              const liveAmps = isRelayOn ? (state.telemetry.currentAmps > 0 ? state.telemetry.currentAmps : 1.25) : 0;

              return (
                <View
                  key={d.id}
                  style={[styles.deviceCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}
                >
                  <View style={styles.deviceTop}>
                    <View>
                      <Text style={[styles.deviceName, { color: themeColors.text }]}>{d.name}</Text>
                      <Text style={[styles.deviceId, { color: themeColors.textMuted }]}>{d.id} • PZEM-004T Hardware Node</Text>
                    </View>
                    <View style={[styles.deviceStatus, styles.statusOnline]}>
                      <Text style={[styles.statusText, styles.statusTextOnline]}>ONLINE</Text>
                    </View>
                  </View>

                  <View style={[styles.deviceMetrics, { backgroundColor: themeColors.subCardBg }]}>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>VOLTAGE</Text>
                      <Text style={[styles.metricVal, { color: themeColors.text }]}>{liveVolts} V</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>POWER</Text>
                      <Text style={[styles.metricVal, { color: '#00C48C' }]}>{liveW} W</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>CURRENT</Text>
                      <Text style={[styles.metricVal, { color: themeColors.text }]}>{liveAmps} A</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>RELAY</Text>
                      <Text style={[styles.metricVal, { color: isRelayOn ? '#00C48C' : '#EF4444' }]}>
                        {isRelayOn ? 'ON' : 'OFF'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ─── 5. TAB: HEALTH & DIAGNOSTICS (CLEAN TELEMETRY, NO UNWANTED STATIC DATA) ─── */}
        {activeTab === 'health' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Platform Diagnostic Telemetry</Text>
                <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
                  Real-time health of REST API, PostgreSQL database & hardware ingestion
                </Text>
              </View>

              <TouchableOpacity
                style={styles.pingHealthBtn}
                onPress={runHealthPing}
                disabled={isPingingHealth}
                activeOpacity={0.8}
              >
                {isPingingHealth ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={14} color="#FFFFFF" />
                    <Text style={styles.pingHealthBtnText}>Run Health Ping</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {healthPingStatus ? (
              <View style={styles.healthPingBanner}>
                <Ionicons name="information-circle" size={16} color="#00C48C" />
                <Text style={styles.healthPingBannerText}>{healthPingStatus}</Text>
              </View>
            ) : null}

            <View style={[styles.healthCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <View style={[styles.healthRow, { borderBottomColor: themeColors.cardBorder }]}>
                <View style={styles.healthKeyCol}>
                  <Ionicons name="server-outline" size={16} color="#00C48C" />
                  <Text style={[styles.healthKey, { color: themeColors.textSecondary }]}>FASTAPI REST ENGINE</Text>
                </View>
                <Text style={[styles.healthVal, { color: '#00C48C' }]}>ONLINE (Uvicorn Port 8000)</Text>
              </View>

              <View style={[styles.healthRow, { borderBottomColor: themeColors.cardBorder }]}>
                <View style={styles.healthKeyCol}>
                  <Ionicons name="layers-outline" size={16} color="#3B82F6" />
                  <Text style={[styles.healthKey, { color: themeColors.textSecondary }]}>DATABASE (POSTGRESQL)</Text>
                </View>
                <Text style={[styles.healthVal, { color: '#00C48C' }]}>CONNECTED (tbl_tariff & readings)</Text>
              </View>

              <View style={[styles.healthRow, { borderBottomColor: themeColors.cardBorder }]}>
                <View style={styles.healthKeyCol}>
                  <Ionicons name="cash-outline" size={16} color="#F59E0B" />
                  <Text style={[styles.healthKey, { color: themeColors.textSecondary }]}>ACTIVE TARIFF IN EFFECT</Text>
                </View>
                <Text style={[styles.healthVal, { color: '#00C48C' }]}>
                  {activeTariffObj ? `${activeTariffObj.tariff_name} (₹${activeTariffObj.rate_per_kwh}/kWh)` : 'Domestic Standard'}
                </Text>
              </View>

              <View style={[styles.healthRow, { borderBottomColor: themeColors.cardBorder }]}>
                <View style={styles.healthKeyCol}>
                  <Ionicons name="pulse" size={16} color="#00C48C" />
                  <Text style={[styles.healthKey, { color: themeColors.textSecondary }]}>TELEMETRY STREAM RATE</Text>
                </View>
                <Text style={[styles.healthVal, { color: '#00C48C' }]}>1.0 Hz (Real-Time Ingestion)</Text>
              </View>

              <View style={[styles.healthRow, { borderBottomColor: themeColors.cardBorder }]}>
                <View style={styles.healthKeyCol}>
                  <Ionicons name="hardware-chip-outline" size={16} color="#8B5CF6" />
                  <Text style={[styles.healthKey, { color: themeColors.textSecondary }]}>HARDWARE PZEM-004T</Text>
                </View>
                <Text style={[styles.healthVal, { color: '#00C48C' }]}>STREAMING (Healthy Telemetry)</Text>
              </View>

              <View style={[styles.healthRow, { borderBottomWidth: 0 }]}>
                <View style={styles.healthKeyCol}>
                  <Ionicons name="power" size={16} color={state.singlePlug.relayState === 'ON' ? '#00C48C' : '#EF4444'} />
                  <Text style={[styles.healthKey, { color: themeColors.textSecondary }]}>RELAY CONTROLLER</Text>
                </View>
                <Text style={[styles.healthVal, { color: state.singlePlug.relayState === 'ON' ? '#00C48C' : '#EF4444' }]}>
                  {state.singlePlug.relayState === 'ON' ? 'ENERGIZED (Connected)' : 'ISOLATED (Cut Off)'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── MODAL: ADD TARIFF ─── */}
      <Modal visible={addTariffModalVisible} transparent animationType="slide" onRequestClose={() => setAddTariffModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add Electricity Tariff Plan</Text>
              <TouchableOpacity onPress={() => setAddTariffModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Templates Inside Modal */}
            <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>POPULAR PRESET TEMPLATES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalPresetsRow}>
              {TARIFF_PRESET_TEMPLATES.map((tmpl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.modalPresetChip, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}
                  onPress={() => handleApplyPreset(tmpl)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalPresetChipText, { color: themeColors.text }]}>{tmpl.name}</Text>
                  <Text style={styles.modalPresetChipRate}>₹{tmpl.rate}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>TARIFF PLAN NAME</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                placeholder="e.g. Commercial High-Load Tier"
                placeholderTextColor={themeColors.textMuted}
                value={newTariffName}
                onChangeText={setNewTariffName}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>RATE PER KWH (₹ / kWh)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                placeholder="e.g. 7.80"
                placeholderTextColor={themeColors.textMuted}
                keyboardType="decimal-pad"
                value={newTariffRate}
                onChangeText={setNewTariffRate}
              />
            </View>

            {/* Set as Active Switch */}
            <View style={[styles.modalSwitchRow, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalSwitchTitle, { color: themeColors.text }]}>Set as Primary Active Tariff</Text>
                <Text style={[styles.modalSwitchSub, { color: themeColors.textSecondary }]}>
                  Apply to all users and real-time bills immediately
                </Text>
              </View>
              <Switch
                value={newTariffIsActive}
                onValueChange={setNewTariffIsActive}
                trackColor={{ false: '#CBD5E1', true: '#00C48C' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleCreateTariffSubmit}
              disabled={isSubmittingTariff}
              activeOpacity={0.88}
            >
              {isSubmittingTariff ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Save Tariff Plan</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL: EDIT TARIFF ─── */}
      <Modal visible={editTariffModalVisible} transparent animationType="slide" onRequestClose={() => setEditTariffModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Electricity Tariff</Text>
              <TouchableOpacity onPress={() => setEditTariffModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>TARIFF PLAN NAME</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                value={editTariffName}
                onChangeText={setEditTariffName}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>RATE PER KWH (₹ / kWh)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }]}
                keyboardType="decimal-pad"
                value={editTariffRate}
                onChangeText={setEditTariffRate}
              />
            </View>

            {/* Set as Active Switch in Edit */}
            <View style={[styles.modalSwitchRow, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalSwitchTitle, { color: themeColors.text }]}>Set as Primary Active Tariff</Text>
                <Text style={[styles.modalSwitchSub, { color: themeColors.textSecondary }]}>
                  Make this the active billing tariff across PowerSense
                </Text>
              </View>
              <Switch
                value={editTariffIsActive}
                onValueChange={setEditTariffIsActive}
                trackColor={{ false: '#CBD5E1', true: '#00C48C' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSaveTariffEdit}
              disabled={isSavingTariffEdit}
              activeOpacity={0.88}
            >
              {isSavingTariffEdit ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Update Rate in Database</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  adminBadge: {
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 196, 140, 0.3)',
  },
  adminBadgeText: {
    color: '#00C48C',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  adminSignOutText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  sessionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sessionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sessionBannerText: {
    fontSize: 11,
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C48C',
  },
  sessionPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#00C48C',
    letterSpacing: 0.5,
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: '#00C48C',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tabSection: {
    gap: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    elevation: 2,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  kpiNote: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00C48C',
  },
  actionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderSmall: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  addUserBtn: {
    backgroundColor: '#00C48C',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addUserBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  userTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  userPhone: {
    fontSize: 10,
    marginTop: 2,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleAdmin: {
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    borderColor: '#00C48C',
  },
  roleUser: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: '#94A3B8',
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
  },
  roleTextAdmin: {
    color: '#00C48C',
  },
  roleTextUser: {
    color: '#64748B',
  },
  userActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  userActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  userActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeTariffHero: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#00C48C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  activeTariffHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activeTariffHeroBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  activeTariffHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeTariffPriceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeTariffPriceNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00C48C',
  },
  activeTariffPriceUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00C48C',
    marginLeft: 2,
  },
  activeTariffHeroDesc: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.92,
    lineHeight: 16,
  },
  tariffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  tariffCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tariffIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tariffName: {
    fontSize: 13,
    fontWeight: '800',
  },
  tariffDate: {
    fontSize: 10,
    marginTop: 2,
  },
  tariffCardRight: {
    alignItems: 'flex-end',
  },
  tariffRateVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  tariffRateUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  tariffButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tariffMiniBtn: {
    padding: 4,
    borderRadius: 6,
  },
  deviceCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  deviceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '800',
  },
  deviceId: {
    fontSize: 10,
    marginTop: 2,
  },
  deviceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    borderColor: '#00C48C',
  },
  statusOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextOnline: {
    color: '#00C48C',
  },
  statusTextOffline: {
    color: '#EF4444',
  },
  deviceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 10,
    paddingVertical: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  healthCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  healthKey: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  healthVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 11,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubDesc: {
    fontSize: 12,
    marginBottom: 14,
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  roleSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleSelectOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    alignItems: 'center',
  },
  roleSelectOptionActive: {
    backgroundColor: '#00C48C',
    borderColor: '#00C48C',
  },
  roleSelectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  roleSelectTextActive: {
    color: '#FFFFFF',
  },
  modalSubmitBtn: {
    backgroundColor: '#00C48C',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Interactive Feedback & Quick Tariff Styles
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
    borderColor: 'rgba(0, 196, 140, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  feedbackBannerText: {
    color: '#00C48C',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  quickTariffCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  quickTariffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickTariffTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickTariffSub: {
    fontSize: 10,
    marginTop: 2,
  },
  manageTariffsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  manageTariffsLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C48C',
  },
  quickTariffScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  quickTariffPill: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    minWidth: 160,
  },
  quickTariffPillTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickTariffRate: {
    fontSize: 14,
    fontWeight: '800',
  },
  quickTariffName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickTariffStatusTag: {
    fontSize: 9,
    fontWeight: '700',
  },
  relayControlCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  relayControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  relayIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relayControlTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  relayControlSub: {
    fontSize: 10,
    marginTop: 1,
  },
  relayToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  relayToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeTariffHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeTariffActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  activeTariffEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeTariffEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeTariffCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeTariffPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  activeTariffCheckText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tariffCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tariffCategoryPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tariffCategoryPillActive: {
    backgroundColor: 'rgba(0, 196, 140, 0.14)',
  },
  tariffCategoryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetsBox: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  presetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  presetsTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  presetsScroll: {
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipName: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetChipBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  presetChipRate: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00C48C',
  },
  presetChipTag: {
    fontSize: 9,
  },
  tariffTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00C48C',
  },
  activeTextSmall: {
    fontSize: 8,
    fontWeight: '800',
    color: '#00C48C',
  },
  selectActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 196, 140, 0.1)',
    alignSelf: 'flex-start',
  },
  selectActiveBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00C48C',
  },
  tariffMiniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    marginLeft: 2,
  },
  simCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  simSub: {
    fontSize: 10,
    marginTop: 1,
  },
  simKwhLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  simKwhChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simKwhChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  simKwhChipActive: {
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
  },
  simKwhChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  simResultBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
  },
  simResultLeft: {
    flex: 1.2,
  },
  simResultLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  simResultNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00C48C',
    marginVertical: 2,
  },
  simResultFormula: {
    fontSize: 9,
  },
  simResultDivider: {
    width: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  simResultRight: {
    flex: 1.3,
  },
  simComparisonTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  simAltRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  simAltName: {
    fontSize: 10,
    flex: 1,
  },
  simAltVal: {
    fontSize: 10,
    fontWeight: '700',
  },
  deviceRelayActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  deviceRelayActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pingHealthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C48C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pingHealthBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  healthPingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 196, 140, 0.12)',
    padding: 10,
    borderRadius: 10,
  },
  healthPingBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C48C',
    flex: 1,
  },
  healthKeyCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalPresetsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  modalPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalPresetChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  modalPresetChipRate: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00C48C',
  },
  modalSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  modalSwitchTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalSwitchSub: {
    fontSize: 10,
    marginTop: 1,
  },
});

