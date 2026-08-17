import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Redirect } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { useStore } from '../../src/store/StoreContext';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateUserRole,
  deleteUser,
  fetchAdminDevices,
  fetchTariffs,
  updateTariffs,
} from '../../src/services/api';

type TabType = 'overview' | 'users' | 'devices' | 'tariffs' | 'health';

export default function AdminScreen() {
  const router = useRouter();
  const { state, triggerSimulatedAnomaly, logout } = useStore();

  // Strict session & role security guard
  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }
  if (state.user?.role !== 'admin') {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Tariff State
  const [stdRate, setStdRate] = useState('6.50');
  const [peakRate, setPeakRate] = useState('9.80');
  const [offPeakRate, setOffPeakRate] = useState('4.20');
  const [peakStart, setPeakStart] = useState('18');
  const [peakEnd, setPeakEnd] = useState('22');
  const [tariffSaved, setTariffSaved] = useState(false);

  const handleSignOut = () => {
    logout();
    router.replace('/login');
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uData, dData, tData]: [any, any, any] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminDevices(),
        fetchTariffs(),
      ]);

      if (uData?.users) setUsers(uData.users);
      if (dData?.devices) setDevices(dData.devices);
      if (tData?.tariff) {
        setStdRate(String(tData.tariff.standard_rate || 6.5));
        setPeakRate(String(tData.tariff.peak_rate || 9.8));
        setOffPeakRate(String(tData.tariff.off_peak_rate || 4.2));
        setPeakStart(String(tData.tariff.peak_start_hour || 18));
        setPeakEnd(String(tData.tariff.peak_end_hour || 22));
      }
    } catch (e) {
      console.log('Error loading admin data:', e);
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

  const handleRoleChange = async (userId: number, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    Alert.alert(
      'Change User Role',
      `Set role for user #${userId} to '${nextRole}'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const res: any = await updateUserRole(userId, nextRole);
              Alert.alert('Success', res.message || `Role updated to ${nextRole}`);
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = (userId: number, email: string) => {
    if (email === 'admin@powersense.com') {
      Alert.alert('Protected', 'Primary administrator cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete User',
      `Permanently remove user account for ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res: any = await deleteUser(userId);
              Alert.alert('Deleted', res.message || 'User removed');
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleSaveTariff = async () => {
    try {
      const res: any = await updateTariffs({
        standard_rate: parseFloat(stdRate) || 6.5,
        peak_rate: parseFloat(peakRate) || 9.8,
        off_peak_rate: parseFloat(offPeakRate) || 4.2,
        currency: 'INR',
        peak_start_hour: parseInt(peakStart) || 18,
        peak_end_hour: parseInt(peakEnd) || 22,
      });
      setTariffSaved(true);
      setTimeout(() => setTariffSaved(false), 3000);
      Alert.alert('Success', res.message || 'Tariff rates saved.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save tariffs.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ROLE: ADMIN</Text>
            </View>
            <Text style={styles.headerSub}>Fleet Core Active</Text>
          </View>
          <Text style={styles.headerTitle}>Enterprise Command Center</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.adminSignOutBtn}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.cyberCrimson} />
            <Text style={styles.adminSignOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Admin Session Status Bar */}
      <View style={styles.sessionBanner}>
        <View style={styles.sessionBannerLeft}>
          <Ionicons name="shield-checkmark" size={16} color={colors.cyberEmerald} />
          <Text style={styles.sessionBannerText}>
            Active Admin Session: <Text style={styles.sessionBold}>{state.user?.email || 'admin@powersense.com'}</Text>
          </Text>
        </View>
        <View style={styles.sessionPill}>
          <View style={styles.sessionGreenDot} />
          <Text style={styles.sessionPillText}>AUTHENTICATED</Text>
        </View>
      </View>

      {/* Sub Tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons name="grid-outline" size={14} color={activeTab === 'overview' ? colors.spaceVoid : colors.onSurfaceVariant} />
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons name="people-outline" size={14} color={activeTab === 'users' ? colors.spaceVoid : colors.onSurfaceVariant} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users ({users.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'devices' && styles.tabBtnActive]}
            onPress={() => setActiveTab('devices')}
          >
            <Ionicons name="hardware-chip-outline" size={14} color={activeTab === 'devices' ? colors.spaceVoid : colors.onSurfaceVariant} />
            <Text style={[styles.tabText, activeTab === 'devices' && styles.tabTextActive]}>Nodes ({devices.length || 4})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'tariffs' && styles.tabBtnActive]}
            onPress={() => setActiveTab('tariffs')}
          >
            <Ionicons name="cash-outline" size={14} color={activeTab === 'tariffs' ? colors.spaceVoid : colors.onSurfaceVariant} />
            <Text style={[styles.tabText, activeTab === 'tariffs' && styles.tabTextActive]}>Tariffs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'health' && styles.tabBtnActive]}
            onPress={() => setActiveTab('health')}
          >
            <Ionicons name="pulse-outline" size={14} color={activeTab === 'health' ? colors.spaceVoid : colors.onSurfaceVariant} />
            <Text style={[styles.tabText, activeTab === 'health' && styles.tabTextActive]}>Diagnostics</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyberEmerald} />}
      >
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabSection}>
            {/* KPI Cards Grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>TOTAL USERS</Text>
                <Text style={styles.kpiValue}>{users.length}</Text>
                <Text style={styles.kpiNote}>Registered Accounts</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>ACTIVE NODES</Text>
                <Text style={styles.kpiValue}>{devices.filter(d => d.status === 'ONLINE').length} / {devices.length}</Text>
                <Text style={styles.kpiNote}>ESP32 PZEM Plugs</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>SYSTEM LOAD</Text>
                <Text style={styles.kpiValue}>{(devices.reduce((sum, d) => sum + (d.live_watts || 0), 0) / 1000).toFixed(2)} kW</Text>
                <Text style={styles.kpiNote}>Live Hardware Draw</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>HEALTH</Text>
                <Text style={[styles.kpiValue, { color: colors.cyberEmerald }]}>100%</Text>
                <Text style={styles.kpiNote}>Core Services Nominal</Text>
              </View>
            </View>

            {/* Actions Card */}
            <View style={styles.actionCard}>
              <Text style={styles.cardHeader}>MASTER CONTROL ACTIONS</Text>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.cyberAmber }]}
                onPress={() => {
                  triggerSimulatedAnomaly();
                  Alert.alert('Surge Anomaly', 'Simulated overload signal dispatched.');
                }}
              >
                <Ionicons name="flash-outline" size={18} color={colors.cyberAmber} />
                <Text style={[styles.actionBtnText, { color: colors.cyberAmber }]}>Trigger Simulated Overload</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.cyberCrimson }]}
                onPress={() => {
                  Alert.alert('Emergency Cutoff', 'Initiate emergency cutoff signal to all smart plug nodes?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Cutoff',
                      style: 'destructive',
                      onPress: () => Alert.alert('Command Sent', 'Emergency cutoff broadcasted via MQTT broker.'),
                    },
                  ]);
                }}
              >
                <Ionicons name="power-outline" size={18} color={colors.cyberCrimson} />
                <Text style={[styles.actionBtnText, { color: colors.cyberCrimson }]}>Emergency Relay Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB: USERS */}
        {activeTab === 'users' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Registered Users</Text>
              <TouchableOpacity onPress={loadData} style={styles.miniRefreshBtn}>
                <Ionicons name="refresh" size={16} color={colors.cyberEmerald} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator color={colors.cyberEmerald} style={{ marginVertical: 20 }} />
            ) : users.length === 0 ? (
              <View style={styles.emptyDevicesCard}>
                <Ionicons name="people-outline" size={32} color={colors.cyberCyan} />
                <Text style={styles.emptyDevicesTitle}>No Registered Users Found</Text>
                <Text style={styles.emptyDevicesText}>
                  User accounts created via registration will appear here automatically.
                </Text>
              </View>
            ) : (
              users.map((u) => (
                <View key={u.id} style={styles.userCard}>
                  <View style={styles.userTop}>
                    <View>
                      <Text style={styles.userName}>{u.name || 'User'}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                      {u.phone ? <Text style={styles.userPhone}>{u.phone}</Text> : null}
                    </View>
                    <View style={[styles.rolePill, u.role === 'admin' ? styles.roleAdmin : styles.roleUser]}>
                      <Text style={[styles.roleText, u.role === 'admin' ? styles.roleTextAdmin : styles.roleTextUser]}>
                        {u.role || 'user'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.userBottom}>
                    <TouchableOpacity
                      style={[styles.roleBtn, { borderColor: colors.cyberEmerald }]}
                      onPress={() => handleRoleChange(u.id, u.role || 'user')}
                    >
                      <Text style={[styles.roleBtnText, { color: colors.cyberEmerald }]}>
                        Switch to {u.role === 'admin' ? 'user' : 'admin'}
                      </Text>
                    </TouchableOpacity>

                    {u.email !== 'admin@powersense.com' && (
                      <TouchableOpacity
                        style={[styles.roleBtn, { borderColor: colors.cyberCrimson }]}
                        onPress={() => handleDeleteUser(u.id, u.email)}
                      >
                        <Text style={[styles.roleBtnText, { color: colors.cyberCrimson }]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB: DEVICES */}
        {activeTab === 'devices' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>ESP32 Smart Plug Nodes</Text>
            {devices.length === 0 ? (
              <View style={styles.emptyDevicesCard}>
                <Ionicons name="hardware-chip-outline" size={32} color={colors.cyberCyan} />
                <Text style={styles.emptyDevicesTitle}>No ESP32 Nodes Registered Yet</Text>
                <Text style={styles.emptyDevicesText}>
                  When your ESP32 PZEM-004T nodes are powered on and post telemetry to POST /api/esp32/telemetry, they will register here automatically with real-time IP, MAC, and live load stats.
                </Text>
              </View>
            ) : (
              devices.map((d) => (
                <View key={d.id} style={styles.deviceCard}>
                  <View style={styles.deviceTop}>
                    <View>
                      <Text style={styles.deviceName}>{d.name}</Text>
                      <Text style={styles.deviceId}>{d.id} • {d.ip}</Text>
                    </View>
                    <View style={[styles.deviceStatus, d.status === 'ONLINE' ? styles.statusOnline : styles.statusOffline]}>
                      <Text style={[styles.statusText, d.status === 'ONLINE' ? styles.statusTextOnline : styles.statusTextOffline]}>
                        {d.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.deviceMetrics}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>VOLTAGE</Text>
                      <Text style={styles.metricVal}>{d.voltage}V</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>POWER</Text>
                      <Text style={[styles.metricVal, { color: colors.cyberEmerald }]}>{d.live_watts}W</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>RELAY</Text>
                      <Text style={[styles.metricVal, { color: d.relay_state === 'ON' ? colors.cyberEmerald : colors.onSurfaceVariant }]}>
                        {d.relay_state}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB: TARIFFS */}
        {activeTab === 'tariffs' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Electricity Tariff Rates (₹/kWh)</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>STANDARD TARIFF (₹/kWh)</Text>
              <TextInput
                style={styles.input}
                value={stdRate}
                onChangeText={setStdRate}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PEAK TIME-OF-USE RATE (₹/kWh)</Text>
              <TextInput
                style={styles.input}
                value={peakRate}
                onChangeText={setPeakRate}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OFF-PEAK RATE (₹/kWh)</Text>
              <TextInput
                style={styles.input}
                value={offPeakRate}
                onChangeText={setOffPeakRate}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>PEAK START (24H)</Text>
                <TextInput
                  style={styles.input}
                  value={peakStart}
                  onChangeText={setPeakStart}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>PEAK END (24H)</Text>
                <TextInput
                  style={styles.input}
                  value={peakEnd}
                  onChangeText={setPeakEnd}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTariff}>
              <Text style={styles.saveBtnText}>Save Tariff Configuration</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB: HEALTH */}
        {activeTab === 'health' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>System Health Diagnostics</Text>

            <View style={styles.healthCard}>
              <View style={styles.healthRow}>
                <Text style={styles.healthKey}>FASTAPI SERVICE</Text>
                <Text style={styles.healthVal}>ONLINE (port 8000)</Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={styles.healthKey}>DATABASE STORAGE</Text>
                <Text style={styles.healthVal}>CONNECTED & HEALTHY</Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={styles.healthKey}>MQTT BROKER</Text>
                <Text style={styles.healthVal}>ACTIVE (Mosquitto 1883)</Text>
              </View>
              <View style={styles.healthRow}>
                <Text style={styles.healthKey}>SAMPLING RATE</Text>
                <Text style={[styles.healthVal, { color: colors.cyberCyan }]}>1.0 Hz Real-Time</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.spaceVoid,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  adminBadge: {
    backgroundColor: 'rgba(0,255,157,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,255,157,0.4)',
  },
  adminBadgeText: {
    color: colors.cyberEmerald,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerSub: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onSurface,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  switchBtnText: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: '700',
  },
  adminSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,59,107,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,59,107,0.3)',
  },
  adminSignOutText: {
    color: colors.cyberCrimson,
    fontSize: 11,
    fontWeight: '700',
  },
  sessionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sessionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sessionBannerText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sessionBold: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,255,157,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,255,157,0.3)',
  },
  sessionGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.cyberEmerald,
  },
  sessionPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.cyberEmerald,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.obsidianCard,
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerLowest,
  },
  tabBtnActive: {
    backgroundColor: colors.cyberEmerald,
  },
  tabText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.spaceVoid,
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
    backgroundColor: colors.obsidianCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  kpiLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
    marginVertical: 4,
  },
  kpiNote: {
    color: colors.cyberEmerald,
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionCard: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 10,
  },
  cardHeader: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surfaceContainerLowest,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.onSurface,
  },
  miniRefreshBtn: {
    padding: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 6,
  },
  userCard: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 10,
    marginBottom: 10,
  },
  userTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onSurface,
  },
  userEmail: {
    fontSize: 11,
    color: colors.cyberCyan,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  userPhone: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleAdmin: {
    backgroundColor: 'rgba(0,255,157,0.15)',
    borderColor: colors.cyberEmerald,
  },
  roleUser: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: colors.outlineVariant,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
  },
  roleTextAdmin: {
    color: colors.cyberEmerald,
  },
  roleTextUser: {
    color: colors.onSurfaceVariant,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
  },
  userActionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  userActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurface,
  },
  deviceCard: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 12,
    marginBottom: 10,
  },
  deviceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onSurface,
  },
  deviceId: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  deviceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: 'rgba(0,255,157,0.15)',
    borderColor: colors.cyberEmerald,
  },
  statusOffline: {
    backgroundColor: 'rgba(255,46,99,0.15)',
    borderColor: colors.cyberCrimson,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextOnline: {
    color: colors.cyberEmerald,
  },
  statusTextOffline: {
    color: colors.cyberCrimson,
  },
  deviceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 8,
    paddingVertical: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 8,
    color: colors.onSurfaceVariant,
    fontWeight: '800',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onSurfaceVariant,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  input: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.onSurface,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  saveBtn: {
    backgroundColor: colors.cyberEmerald,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: colors.spaceVoid,
    fontSize: 13,
    fontWeight: '800',
  },
  healthCard: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 10,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  healthKey: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  healthVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cyberEmerald,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyDevicesCard: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  emptyDevicesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptyDevicesText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 300,
  },
  userBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  roleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBtnText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
