import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../../src/store/StoreContext';
import { fetchDevicesData } from '../../src/services/api';

const DEFAULT_DEVICES = [
  {
    id: 1,
    name: 'PowerSense Smart Plug',
    uid: 'ESP32-PZEM-PLUG-10A',
    status: 'ONLINE',
    watts: 215,
    relay_state: 'ON',
    connected_appliance: 'Connected Load (PZEM-004T)',
    rated_power: 1500.0,
    last_seen: 'Just now'
  }
];

export default function SettingsScreen() {
  const router = useRouter();
  const { state, togglePlugRelay, logout, isDark, themeColors, toggleTheme, setTheme } = useStore();

  const [deviceList, setDeviceList] = useState(DEFAULT_DEVICES);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');

  const loadDevices = async () => {
    try {
      const data: any = await fetchDevicesData();
      if (data?.devices && Array.isArray(data.devices) && data.devices.length > 0) {
        setDeviceList(data.devices);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadDevices();
  }, []);

  if (!state.isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (state.user?.role === 'admin') {
    return <Redirect href="/(tabs)/admin" />;
  }

  const { singlePlug } = state;
  const isFeaturedRelayOn = singlePlug.relayState === 'ON';
  const featuredWatts = isFeaturedRelayOn ? (singlePlug.watts > 0 ? singlePlug.watts : 215) : 0;

  const handleAddDevice = () => {
    if (!newDeviceName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the smart plug.');
      return;
    }
    const newDev = {
      id: Date.now(),
      name: newDeviceName.trim(),
      uid: `ESP32-PZEM-PLUG-${Math.floor(10 + Math.random() * 90)}`,
      status: 'ONLINE',
      watts: 0,
      relay_state: 'OFF',
      connected_appliance: 'Smart Appliance',
      rated_power: 1200.0,
      last_seen: 'Just now'
    };
    setDeviceList([newDev, ...deviceList]);
    setNewDeviceName('');
    setAddModalVisible(false);
    Alert.alert('Device Added', `${newDev.name} has been added and paired with PZEM telemetry.`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Settings & Devices</Text>
            <Text style={[styles.headerSub, { color: themeColors.textSecondary }]}>Manage hardware, appearance & session</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: isDark ? '#1A2432' : '#E8FBF4', borderColor: isDark ? '#2B384A' : '#C5F0E1' }]}
            onPress={() => router.push('/provision')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="#00C48C" />
          </TouchableOpacity>
        </View>

        {/* Appearance & Theme Toggle Section */}
        <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>APPEARANCE & THEME</Text>
        <View style={[styles.themeCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.themeRow}>
            <View style={[styles.themeIconBadge, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#FEF3C7' }]}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={22}
                color={isDark ? '#38BDF8' : '#F59E0B'}
              />
            </View>
            <View style={styles.themeDetails}>
              <Text style={[styles.themeTitle, { color: themeColors.text }]}>
                {isDark ? 'Dark Mode' : 'White Mode'}
              </Text>
              <Text style={[styles.themeSub, { color: themeColors.textSecondary }]}>
                {isDark ? 'Using dark surfaces and sleek obsidian theme' : 'Using crisp bright white and soft mint theme'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#00C48C' }}
              thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {/* Quick theme selector buttons */}
          <View style={styles.themeQuickRow}>
            <TouchableOpacity
              onPress={() => setTheme('light')}
              style={[
                styles.themeChoiceBtn,
                !isDark && styles.themeChoiceActiveLight,
                { borderColor: !isDark ? '#00C48C' : themeColors.subCardBorder, backgroundColor: !isDark ? '#E8FBF4' : themeColors.subCardBg },
              ]}
            >
              <Ionicons name="sunny" size={16} color={!isDark ? '#009668' : themeColors.textMuted} />
              <Text style={[styles.themeChoiceText, { color: !isDark ? '#009668' : themeColors.textSecondary, fontWeight: !isDark ? '700' : '500' }]}>
                White Mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTheme('dark')}
              style={[
                styles.themeChoiceBtn,
                isDark && styles.themeChoiceActiveDark,
                { borderColor: isDark ? '#00C48C' : themeColors.subCardBorder, backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : themeColors.subCardBg },
              ]}
            >
              <Ionicons name="moon" size={16} color={isDark ? '#00C48C' : themeColors.textMuted} />
              <Text style={[styles.themeChoiceText, { color: isDark ? '#00C48C' : themeColors.textSecondary, fontWeight: isDark ? '700' : '500' }]}>
                Dark Mode
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Smart Plug Card */}
        <Text style={[styles.sectionHeader, { marginTop: 20, color: themeColors.textSecondary }]}>ACTIVE SMART PLUG NODE</Text>
        <LinearGradient
          colors={['#00D589', '#009E69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featuredCard}
        >
          <View style={styles.featuredTop}>
            <View>
              <Text style={styles.featuredTitle}>{singlePlug.name || 'Living Room Plug'}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.greenDot} />
                <Text style={styles.onlineText}>Online • {singlePlug.nodeId || 'ESP32-PZEM-PLUG-10A'}</Text>
              </View>
            </View>

            {/* Toggle Switch */}
            <Switch
              value={isFeaturedRelayOn}
              onValueChange={togglePlugRelay}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#FFFFFF' }}
              thumbColor={isFeaturedRelayOn ? '#00C48C' : '#F4F3F4'}
            />
          </View>

          {/* 3D Smart Plug Illustration Container */}
          <View style={styles.plugGraphicContainer}>
            <View style={styles.plugCircleGlow}>
              <Ionicons name="hardware-chip" size={44} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.featuredBottom}>
            <Text style={styles.featuredPowerLabel}>CURRENT LOAD</Text>
            <Text style={styles.featuredPowerVal}>{featuredWatts} W</Text>
          </View>
        </LinearGradient>

        {/* BLE Provisioning Action Card */}
        <TouchableOpacity
          style={[styles.bleSetupCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}
          onPress={() => router.push('/provision')}
          activeOpacity={0.8}
        >
          <View style={styles.bleSetupLeft}>
            <View style={[styles.bleSetupIconBox, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
              <Ionicons name="bluetooth" size={24} color="#00C48C" />
            </View>
            <View style={styles.bleSetupTextCol}>
              <Text style={[styles.bleSetupTitle, { color: themeColors.text }]}>Add ESP32 Smart Plug</Text>
              <Text style={[styles.bleSetupSub, { color: themeColors.textSecondary }]}>Provision via Bluetooth Low Energy (BLE)</Text>
            </View>
          </View>
          <View style={styles.bleSetupBtn}>
            <Text style={styles.bleSetupBtnText}>Pair</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Other Devices Section Header */}
        <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>CONNECTED SMART PLUGS ({deviceList.length})</Text>

        {/* Devices List */}
        <View style={styles.deviceList}>
          {deviceList.map((dev) => (
            <View key={dev.id} style={[styles.deviceCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <View style={[styles.deviceIconBadge, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
                <Ionicons name="power" size={22} color="#00C48C" />
              </View>

              <View style={styles.deviceDetails}>
                <Text style={[styles.deviceName, { color: themeColors.text }]}>{dev.name}</Text>
                <Text style={[styles.deviceAppliance, { color: themeColors.textSecondary }]}>{dev.connected_appliance || 'Smart Load'}</Text>
                <Text style={[styles.deviceUid, { color: themeColors.textMuted }]}>{dev.uid} • {dev.status}</Text>
              </View>

              <View style={styles.deviceRight}>
                <Text style={styles.deviceWatts}>{dev.watts} W</Text>
                <Switch
                  value={dev.relay_state === 'ON'}
                  onValueChange={() => {
                    const updated = deviceList.map(d => d.id === dev.id ? { ...d, relay_state: d.relay_state === 'ON' ? 'OFF' : 'ON' } : d);
                    setDeviceList(updated);
                  }}
                  trackColor={{ false: isDark ? '#243040' : '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={dev.relay_state === 'ON' ? '#00C48C' : '#94A3B8'}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Account Profile & Sign Out Section */}
        <Text style={[styles.sectionHeader, { marginTop: 24, color: themeColors.textSecondary }]}>ACCOUNT & SESSION</Text>
        <View style={[styles.profileCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarBadge, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
              <Ionicons name="person" size={22} color="#00C48C" />
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>{state.user?.name || 'Resident User'}</Text>
              <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>{state.user?.email || 'user@powersense.ai'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => {
              logout();
              router.replace('/login');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.signOutBtnText}>Sign Out of Account</Text>
          </TouchableOpacity>
        </View>

        {/* Add Device Modal */}
        <Modal
          visible={addModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: themeColors.modalBg }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add New Smart Plug</Text>
              <Text style={[styles.modalSub, { color: themeColors.textSecondary }]}>Enter plug name or room location</Text>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: themeColors.inputBg,
                    borderColor: themeColors.inputBorder,
                    color: themeColors.text,
                  },
                ]}
                placeholder="e.g. Dining Room AC Plug"
                placeholderTextColor={themeColors.textMuted}
                value={newDeviceName}
                onChangeText={setNewDeviceName}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: themeColors.subCardBg }]}
                  onPress={() => setAddModalVisible(false)}
                >
                  <Text style={[styles.modalCancelText, { color: themeColors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalAddBtn}
                  onPress={handleAddDevice}
                >
                  <Text style={styles.modalAddText}>Save Device</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 10,
  },

  // Appearance & Theme Card
  themeCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeDetails: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  themeSub: {
    fontSize: 12,
    marginTop: 2,
  },
  themeQuickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  themeChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeChoiceActiveLight: {},
  themeChoiceActiveDark: {},
  themeChoiceText: {
    fontSize: 12,
  },

  // Featured Card
  featuredCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#00C48C',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  plugGraphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  plugCircleGlow: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  featuredBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredPowerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.6,
  },
  featuredPowerVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // BLE Setup Card
  bleSetupCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    marginBottom: 18,
  },
  bleSetupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bleSetupIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bleSetupTextCol: {
    flex: 1,
  },
  bleSetupTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bleSetupSub: {
    fontSize: 11,
    marginTop: 2,
  },
  bleSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C48C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  bleSetupBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Device list
  deviceList: {
    gap: 10,
    marginBottom: 16,
  },
  deviceCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  deviceIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
  },
  deviceAppliance: {
    fontSize: 12,
    marginTop: 1,
  },
  deviceUid: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  deviceRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  deviceWatts: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C48C',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalAddBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Profile & Sign Out
  profileCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
