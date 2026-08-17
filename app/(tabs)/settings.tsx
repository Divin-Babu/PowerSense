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
import { colors } from '../../src/theme/colors';
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
  const { state, togglePlugRelay, logout } = useStore();

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Devices</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/provision')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="#00C48C" />
          </TouchableOpacity>
        </View>

        {/* Featured Smart Plug Card */}
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
                <Text style={styles.onlineText}>Online</Text>
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
          style={styles.bleSetupCard}
          onPress={() => router.push('/provision')}
          activeOpacity={0.8}
        >
          <View style={styles.bleSetupLeft}>
            <View style={styles.bleSetupIconBox}>
              <Ionicons name="bluetooth" size={24} color="#00C48C" />
            </View>
            <View style={styles.bleSetupTextCol}>
              <Text style={styles.bleSetupTitle}>Add ESP32 Smart Plug</Text>
              <Text style={styles.bleSetupSub}>Provision via Bluetooth Low Energy (BLE)</Text>
            </View>
          </View>
          <View style={styles.bleSetupBtn}>
            <Text style={styles.bleSetupBtnText}>Pair</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Other Devices Section Header */}
        <Text style={styles.sectionHeader}>CONNECTED SMART PLUGS ({deviceList.length})</Text>

        {/* Devices List */}
        <View style={styles.deviceList}>
          {deviceList.map((dev) => (
            <View key={dev.id} style={styles.deviceCard}>
              <View style={styles.deviceIconBadge}>
                <Ionicons name="power" size={22} color="#00C48C" />
              </View>

              <View style={styles.deviceDetails}>
                <Text style={styles.deviceName}>{dev.name}</Text>
                <Text style={styles.deviceAppliance}>{dev.connected_appliance || 'Smart Load'}</Text>
                <Text style={styles.deviceUid}>{dev.uid} • {dev.status}</Text>
              </View>

              <View style={styles.deviceRight}>
                <Text style={styles.deviceWatts}>{dev.watts} W</Text>
                <Switch
                  value={dev.relay_state === 'ON'}
                  onValueChange={() => {
                    const updated = deviceList.map(d => d.id === dev.id ? { ...d, relay_state: d.relay_state === 'ON' ? 'OFF' : 'ON' } : d);
                    setDeviceList(updated);
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={dev.relay_state === 'ON' ? '#00C48C' : '#94A3B8'}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Account Profile & Sign Out Section */}
        <Text style={[styles.sectionHeader, { marginTop: 24 }]}>ACCOUNT & SESSION</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarBadge}>
              <Ionicons name="person" size={22} color="#00C48C" />
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{state.user?.name || 'Resident User'}</Text>
              <Text style={styles.profileEmail}>{state.user?.email || 'user@powersense.ai'}</Text>
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
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add New Smart Plug</Text>
              <Text style={styles.modalSub}>Enter plug name or room location</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dining Room AC Plug"
                placeholderTextColor="#94A3B8"
                value={newDeviceName}
                onChangeText={setNewDeviceName}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setAddModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalAddBtn} onPress={handleAddDevice}>
                  <Text style={styles.modalAddText}>Add Device</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EDF5F1',
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E9E7',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },

  // Featured Card
  featuredCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#00D589',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    width: 8,
    height: 8,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  featuredBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredPowerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  featuredPowerVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // BLE Setup Action Card
  bleSetupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
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
    backgroundColor: '#E8FBF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bleSetupTextCol: {
    flex: 1,
  },
  bleSetupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  bleSetupSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  bleSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00C48C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bleSetupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Section Header
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Devices List
  deviceList: {
    gap: 12,
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E9E7',
  },
  deviceIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#E8FBF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  deviceAppliance: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  deviceUid: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E9E7',
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
    backgroundColor: '#F1F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E9E7',
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
    backgroundColor: '#E8FBF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
