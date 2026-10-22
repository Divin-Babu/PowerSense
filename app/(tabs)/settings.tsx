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
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../../src/store/StoreContext';
import { fetchDevicesData, updateUserProfileApi, fetchUserProfileApi } from '../../src/services/api';

const DEFAULT_DEVICES = [
  {
    id: 1,
    name: 'PowerSense Smart Plug',
    uid: 'ESP32-PZEM-PLUG-10A',
    status: 'ONLINE',
    watts: 0,
    relay_state: 'ON',
    connected_appliance: 'Connected Load (PZEM-004T)',
    rated_power: 1500.0,
    last_seen: 'Just now'
  }
];

export default function SettingsScreen() {
  const router = useRouter();
  const { state, togglePlugRelay, logout, isDark, themeColors, toggleTheme, updateUserProfile } = useStore();

  const [deviceList, setDeviceList] = useState(DEFAULT_DEVICES);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');

  // Edit Profile & Password Modal State
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const loadDevices = async () => {
    try {
      const data: any = await fetchDevicesData(state.user?.email);
      if (data?.devices && Array.isArray(data.devices) && data.devices.length > 0) {
        setDeviceList(data.devices.slice(0, 1));
      }
    } catch (e) {}
  };

  const refreshProfile = async () => {
    try {
      if (state.user?.email) {
        const profileRes: any = await fetchUserProfileApi(state.user.email);
        if (profileRes?.user) {
          const u = profileRes.user;
          updateUserProfile({
            name: u.full_name || u.name,
            full_name: u.full_name || u.name,
            phone: u.phone || undefined,
          });
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadDevices();
    refreshProfile();
  }, [state.user?.email]);

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
      rated_power: 1500.0,
      last_seen: 'Just now'
    };
    setDeviceList([newDev, ...deviceList]);
    setNewDeviceName('');
    setAddModalVisible(false);
  };

  const openEditProfileModal = async () => {
    let curName = state.user?.full_name || state.user?.name || '';
    let curPhone = state.user?.phone || '';

    if (!curName || curName === 'Resident User' || curName === 'Smart Plug User') {
      const emailPrefix = (state.user?.email || '').split('@')[0];
      if (state.user?.email === 'divin@gmail.com') {
        curName = 'Divin Babu';
      } else if (emailPrefix) {
        curName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      }
    }

    // Fetch fresh profile from backend to ensure real DB name & phone are populated
    try {
      if (state.user?.email) {
        const fresh: any = await fetchUserProfileApi(state.user.email);
        if (fresh?.user) {
          curName = fresh.user.full_name || fresh.user.name || curName;
          curPhone = fresh.user.phone || curPhone;
          updateUserProfile({ name: curName, full_name: curName, phone: curPhone });
        }
      }
    } catch (e) {}

    setEditName(curName);
    const rawDigits = (curPhone || '').replace(/[^0-9]/g, '');
    const tenDigits = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
    setEditPhone(tenDigits);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrentPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setProfileError('');
    setProfileSuccess('');
    setEditProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    setProfileError('');
    setProfileSuccess('');

    if (!editName.trim()) {
      const errMsg = 'Name cannot be empty.';
      setProfileError(errMsg);
      Alert.alert('Notice', errMsg);
      return;
    }

    const cleanDigits = editPhone.replace(/[^0-9]/g, '');
    if (cleanDigits && cleanDigits.length !== 10) {
      const errMsg = 'Mobile number must be exactly 10 digits.';
      setProfileError(errMsg);
      Alert.alert('Notice', errMsg);
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        const errMsg = 'New password must be at least 6 characters long.';
        setProfileError(errMsg);
        Alert.alert('Notice', errMsg);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        const errMsg = 'New passwords do not match.';
        setProfileError(errMsg);
        Alert.alert('Notice', errMsg);
        return;
      }
      if (!currentPassword) {
        const errMsg = 'Please enter your current password to set a new password.';
        setProfileError(errMsg);
        Alert.alert('Notice', errMsg);
        return;
      }
    }

    setIsSavingProfile(true);

    try {
      const formattedPhone = cleanDigits ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}` : '';
      const res = await updateUserProfileApi({
        email: state.user?.email || '',
        name: editName.trim(),
        phone: formattedPhone || undefined,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });

      setIsSavingProfile(false);
      updateUserProfile({
        name: editName.trim(),
        full_name: editName.trim(),
        phone: formattedPhone || undefined,
      });

      const successMsg = res.message || 'Profile updated successfully!';
      setProfileSuccess(successMsg);
      Alert.alert('Success', successMsg, [
        { text: 'OK', onPress: () => setEditProfileModalVisible(false) }
      ]);
      setTimeout(() => {
        setEditProfileModalVisible(false);
      }, 1500);
    } catch (err: any) {
      setIsSavingProfile(false);
      const errMsg = err.message || 'Failed to update profile. Please check your current password.';
      setProfileError(errMsg);
      Alert.alert('Update Failed', errMsg);
    }
  };

  const handleDeviceRelayToggle = (devId: number, devUid: string) => {
    const isPrimary = devId === 1 || devUid === singlePlug.nodeId || devUid === 'ESP32-PZEM-PLUG-10A';
    if (isPrimary) {
      togglePlugRelay();
    } else {
      setDeviceList(prev =>
        prev.map(d => (d.id === devId ? { ...d, relay_state: d.relay_state === 'ON' ? 'OFF' : 'ON' } : d))
      );
    }
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

        {/* Theme Toggle Row */}
        <View style={[styles.themeCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.themeRow}>
            <Text style={[styles.themeTitle, { color: themeColors.text }]}>
              {isDark ? 'Dark Mode' : 'White Mode'}
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#00C48C' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Featured Smart Plug Card */}
        <Text style={[styles.sectionHeader, { marginTop: 20, color: themeColors.textSecondary }]}>ACTIVE SMART PLUG NODE</Text>
        <LinearGradient
          colors={isFeaturedRelayOn ? ['#00D589', '#009E69'] : ['#475569', '#334155']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featuredCard}
        >
          <View style={styles.featuredTop}>
            <View>
              <Text style={styles.featuredTitle}>{singlePlug.name || 'PowerSense Smart Plug'}</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.greenDot, { backgroundColor: isFeaturedRelayOn ? '#FFFFFF' : '#94A3B8' }]} />
                <Text style={styles.onlineText}>Connected Load • {isFeaturedRelayOn ? 'Active Relaying' : 'Relay Disconnected'}</Text>
              </View>
            </View>
          </View>

          {/* Central Interactive Power Button */}
          <TouchableOpacity
            style={styles.plugGraphicContainer}
            onPress={togglePlugRelay}
            activeOpacity={0.85}
            accessibilityLabel={isFeaturedRelayOn ? 'Turn Relay Off' : 'Turn Relay On'}
          >
            <View style={[styles.plugCircleOuter, isFeaturedRelayOn ? styles.plugCircleOuterOn : styles.plugCircleOuterOff]}>
              <View style={[styles.plugCircleInner, isFeaturedRelayOn ? styles.plugCircleInnerOn : styles.plugCircleInnerOff]}>
                <Ionicons
                  name="power"
                  size={42}
                  color={isFeaturedRelayOn ? '#00C48C' : '#94A3B8'}
                />
              </View>
            </View>
            <Text style={styles.plugTapHint}>
              {isFeaturedRelayOn ? '⚡ Relay Active • Tap to Disconnect' : '🔌 Relay OFF • Tap to Connect'}
            </Text>
          </TouchableOpacity>

          <View style={styles.featuredMetricsRow}>
            <View style={styles.featuredMetric}>
              <Text style={styles.featuredMetricLabel}>RELAY STATE</Text>
              <Text style={styles.featuredMetricVal}>{isFeaturedRelayOn ? 'ON' : 'OFF'}</Text>
            </View>
            <View style={styles.featuredMetricDivider} />
            <View style={styles.featuredMetric}>
              <Text style={styles.featuredMetricLabel}>LIVE POWER</Text>
              <Text style={styles.featuredMetricVal}>{featuredWatts} W</Text>
            </View>
            <View style={styles.featuredMetricDivider} />
            <View style={styles.featuredMetric}>
              <Text style={styles.featuredMetricLabel}>VOLTAGE</Text>
              <Text style={styles.featuredMetricVal}>{state.telemetry.voltage || 230.8} V</Text>
            </View>
          </View>
        </LinearGradient>

        {/* BLE Auto-Provisioning Action Card */}
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
              <Text style={[styles.bleSetupTitle, { color: themeColors.text }]}>Add New Device via BLE</Text>
              <Text style={[styles.bleSetupSub, { color: themeColors.textSecondary }]}>Scan & connect ESP32 hardware via Bluetooth</Text>
            </View>
          </View>
          <View style={styles.bleSetupBtn}>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Connected Hardware Device Node (Single ESP32 Smart Plug) */}
        <View style={styles.devicesHeaderRow}>
          <Text style={[styles.sectionHeader, { color: themeColors.textSecondary, marginBottom: 0 }]}>REGISTERED HARDWARE NODE (ESP32)</Text>
          <View style={[styles.activeNodeBadge, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.activeNodeBadgeText}>1 Online</Text>
          </View>
        </View>

        <View style={styles.devicesList}>
          {(() => {
            const dev = deviceList[0] || DEFAULT_DEVICES[0];
            const isDevRelayOn = isFeaturedRelayOn;
            const devWatts = isFeaturedRelayOn ? (singlePlug.watts > 0 ? singlePlug.watts : 288.0) : 0;
            const devVolts = state.telemetry.voltage > 0 ? state.telemetry.voltage : 230.4;
            const devAmps = isFeaturedRelayOn ? (state.telemetry.currentAmps > 0 ? state.telemetry.currentAmps : 1.25) : 0;

            return (
              <View
                style={[
                  styles.deviceCard,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.cardBorder,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: 18,
                  },
                ]}
              >
                {/* Device Title & Relay Switch */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.deviceIconBox, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4', borderColor: isDark ? 'rgba(0, 196, 140, 0.3)' : '#C5F0E1', marginRight: 12 }]}>
                      <Ionicons name="hardware-chip" size={24} color="#00C48C" />
                    </View>
                    <View>
                      <Text style={[styles.deviceName, { color: themeColors.text, fontSize: 16, fontWeight: '700' }]}>
                        {dev.name || 'PowerSense Smart Plug'}
                      </Text>
                      <Text style={[styles.deviceUid, { color: themeColors.textSecondary, marginTop: 2 }]}>
                        {dev.uid || 'ESP32-PZEM-PLUG-10A'} • <Text style={{ color: '#00C48C', fontWeight: '700' }}>ONLINE</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.deviceWatts, { color: isDevRelayOn ? '#00C48C' : themeColors.textMuted, fontSize: 16, fontWeight: '800', marginBottom: 4 }]}>
                      {devWatts} W
                    </Text>
                    <Switch
                      value={isDevRelayOn}
                      onValueChange={togglePlugRelay}
                      trackColor={{ false: isDark ? '#243040' : '#E2E8F0', true: '#A7F3D0' }}
                      thumbColor={isDevRelayOn ? '#00C48C' : '#94A3B8'}
                    />
                  </View>
                </View>

                {/* Hardware Spec Badges Grid */}
                <View style={[styles.nodeSpecsGrid, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                  <View style={styles.nodeSpecItem}>
                    <Text style={[styles.nodeSpecLabel, { color: themeColors.textMuted }]}>VOLTAGE</Text>
                    <Text style={[styles.nodeSpecVal, { color: themeColors.text }]}>{devVolts.toFixed(1)} V</Text>
                  </View>
                  <View style={[styles.nodeSpecDivider, { backgroundColor: themeColors.cardBorder }]} />
                  <View style={styles.nodeSpecItem}>
                    <Text style={[styles.nodeSpecLabel, { color: themeColors.textMuted }]}>CURRENT</Text>
                    <Text style={[styles.nodeSpecVal, { color: themeColors.text }]}>{devAmps.toFixed(2)} A</Text>
                  </View>
                  <View style={[styles.nodeSpecDivider, { backgroundColor: themeColors.cardBorder }]} />
                  <View style={styles.nodeSpecItem}>
                    <Text style={[styles.nodeSpecLabel, { color: themeColors.textMuted }]}>RELAY CH1</Text>
                    <Text style={[styles.nodeSpecVal, { color: isDevRelayOn ? '#00C48C' : '#EF4444' }]}>
                      {isDevRelayOn ? 'ACTIVE' : 'OFF'}
                    </Text>
                  </View>
                  <View style={[styles.nodeSpecDivider, { backgroundColor: themeColors.cardBorder }]} />
                  <View style={styles.nodeSpecItem}>
                    <Text style={[styles.nodeSpecLabel, { color: themeColors.textMuted }]}>WI-FI RSSI</Text>
                    <Text style={[styles.nodeSpecVal, { color: themeColors.text }]}>-58 dBm</Text>
                  </View>
                </View>

                {/* Sub-circuit Specs Info */}
                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: themeColors.textMuted }}>
                    Microcontroller: ESP32-WROOM-32D • Sensor: PZEM-004T v3
                  </Text>
                  <Text style={{ fontSize: 12, color: themeColors.textMuted }}>
                    Supply: HLK-PM01 5V
                  </Text>
                </View>
              </View>
            );
          })()}
        </View>

        {/* Account Profile & Sign Out Section */}
        <Text style={[styles.sectionHeader, { marginTop: 24, color: themeColors.textSecondary }]}>ACCOUNT & PROFILE</Text>
        <View style={[styles.profileCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarBadge, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
              <Ionicons name="person" size={22} color="#00C48C" />
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>
                {state.user?.full_name || state.user?.name || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>{state.user?.email || 'user@powersense.ai'}</Text>
              {state.user?.phone ? (
                <Text style={[styles.profilePhone, { color: themeColors.textMuted }]}>{state.user.phone}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.editProfileBtn, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4', borderColor: isDark ? '#00C48C40' : '#C5F0E1' }]}
              onPress={openEditProfileModal}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={14} color="#00C48C" />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileActionsRow}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => {
                logout();
                router.replace('/login');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
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

        {/* Edit Profile & Change Password Modal */}
        <Modal
          visible={editProfileModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setEditProfileModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={[styles.editProfileModalCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              {/* Modal Header */}
              <View style={styles.editModalHeader}>
                <View style={styles.editModalHeaderLeft}>
                  <View style={[styles.editIconBadge, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
                    <Ionicons name="person" size={20} color="#00C48C" />
                  </View>
                  <Text style={[styles.editModalTitle, { color: themeColors.text }]}>Edit Profile</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditProfileModalVisible(false)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={22} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Fixed Pop-up Notification Banner - ALWAYS visible regardless of scroll */}
              {profileError ? (
                <View style={styles.floatingPopupError}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.floatingPopupTitleError}>Update Failed</Text>
                    <Text style={styles.floatingPopupTextError}>{profileError}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setProfileError('')} style={{ padding: 4 }}>
                    <Ionicons name="close" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {profileSuccess ? (
                <View style={styles.floatingPopupSuccess}>
                  <Ionicons name="checkmark-circle" size={20} color="#00C48C" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.floatingPopupTitleSuccess}>Success!</Text>
                    <Text style={styles.floatingPopupTextSuccess}>{profileSuccess}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setProfileSuccess('')} style={{ padding: 4 }}>
                    <Ionicons name="close" size={18} color="#00C48C" />
                  </TouchableOpacity>
                </View>
              ) : null}

              <ScrollView showsVerticalScrollIndicator={false} style={styles.editModalScroll}>
                {/* Section 1: User Info */}
                <Text style={[styles.formSectionLabel, { color: themeColors.textSecondary }]}>PROFILE INFORMATION</Text>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: themeColors.textSecondary }]}>FULL NAME</Text>
                  <View style={[styles.formInputWrapper, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
                    <Ionicons name="person-outline" size={18} color={themeColors.textSecondary} style={styles.inputPrefixIcon} />
                    <TextInput
                      style={[styles.formInput, { color: themeColors.text }]}
                      placeholder="Your full name"
                      placeholderTextColor={themeColors.textMuted}
                      value={editName}
                      onChangeText={setEditName}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: themeColors.textSecondary }]}>EMAIL (READ-ONLY)</Text>
                  <View style={[styles.formInputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', borderColor: themeColors.inputBorder, opacity: 0.8 }]}>
                    <Ionicons name="mail-outline" size={18} color={themeColors.textMuted} style={styles.inputPrefixIcon} />
                    <TextInput
                      style={[styles.formInput, { color: themeColors.textMuted }]}
                      value={state.user?.email || ''}
                      editable={false}
                    />
                    <Ionicons name="lock-closed" size={16} color={themeColors.textMuted} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: themeColors.textSecondary }]}>PHONE NUMBER (10 DIGITS)</Text>
                  <View style={[styles.formInputWrapper, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
                    <Ionicons name="call-outline" size={18} color={themeColors.textSecondary} style={styles.inputPrefixIcon} />
                    <TextInput
                      style={[styles.formInput, { color: themeColors.text }]}
                      placeholder="Enter 10-digit mobile number"
                      placeholderTextColor={themeColors.textMuted}
                      value={editPhone}
                      onChangeText={(text) => {
                        const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 10);
                        setEditPhone(digitsOnly);
                      }}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>

                {/* Section 2: Change Password */}
                <View style={[styles.passwordSectionBox, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                  <View style={styles.passwordSectionHeader}>
                    <Ionicons name="key-outline" size={18} color="#00C48C" />
                    <Text style={[styles.passwordSectionTitle, { color: themeColors.text }]}>Change Password</Text>
                  </View>
                  <Text style={[styles.passwordSectionSubtitle, { color: themeColors.textMuted }]}>
                    Leave password fields blank if you do not want to change your password.
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: themeColors.textSecondary }]}>CURRENT PASSWORD</Text>
                    <View style={[styles.formInputWrapper, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
                      <Ionicons name="lock-closed-outline" size={18} color={themeColors.textSecondary} style={styles.inputPrefixIcon} />
                      <TextInput
                        style={[styles.formInput, { color: themeColors.text }]}
                        placeholder="Enter current password"
                        placeholderTextColor={themeColors.textMuted}
                        secureTextEntry={!showCurrentPass}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                      />
                      <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)}>
                        <Ionicons name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={themeColors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: themeColors.textSecondary }]}>NEW PASSWORD</Text>
                    <View style={[styles.formInputWrapper, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
                      <Ionicons name="shield-outline" size={18} color={themeColors.textSecondary} style={styles.inputPrefixIcon} />
                      <TextInput
                        style={[styles.formInput, { color: themeColors.text }]}
                        placeholder="Min. 6 characters"
                        placeholderTextColor={themeColors.textMuted}
                        secureTextEntry={!showNewPass}
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                      <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                        <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={themeColors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.formGroup, { marginBottom: 0 }]}>
                    <Text style={[styles.formLabel, { color: themeColors.textSecondary }]}>CONFIRM NEW PASSWORD</Text>
                    <View style={[styles.formInputWrapper, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
                      <Ionicons name="checkmark-done-outline" size={18} color={themeColors.textSecondary} style={styles.inputPrefixIcon} />
                      <TextInput
                        style={[styles.formInput, { color: themeColors.text }]}
                        placeholder="Repeat new password"
                        placeholderTextColor={themeColors.textMuted}
                        secureTextEntry={!showConfirmPass}
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
                        <Ionicons name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={themeColors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Modal Buttons */}
                <View style={styles.editModalButtonsRow}>
                  <TouchableOpacity
                    style={[styles.editCancelBtn, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}
                    onPress={() => setEditProfileModalVisible(false)}
                    disabled={isSavingProfile}
                  >
                    <Text style={[styles.editCancelText, { color: themeColors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.editSaveBtn}
                    onPress={handleSaveProfile}
                    disabled={isSavingProfile}
                    activeOpacity={0.85}
                  >
                    {isSavingProfile ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.editSaveText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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

  // Theme Card
  themeCard: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeTitle: {
    fontSize: 15,
    fontWeight: '700',
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
    marginVertical: 14,
  },
  plugCircleOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plugCircleOuterOn: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 6,
  },
  plugCircleOuterOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  plugCircleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  plugCircleInnerOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#00C48C',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  plugCircleInnerOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },
  plugTapHint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  featuredMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  featuredMetric: {
    alignItems: 'center',
  },
  featuredMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  featuredMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },
  featuredMetricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
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
    elevation: 2,
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
    backgroundColor: '#00C48C',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Devices List
  devicesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeNodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C48C',
  },
  activeNodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C48C',
  },
  nodeSpecsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nodeSpecItem: {
    alignItems: 'center',
    flex: 1,
  },
  nodeSpecDivider: {
    width: 1,
    height: 20,
  },
  nodeSpecLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  nodeSpecVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  addDeviceSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addDeviceSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00C48C',
  },
  devicesList: {
    gap: 10,
    marginBottom: 16,
  },
  deviceCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    elevation: 1,
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
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
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  deviceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deviceWatts: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00C48C',
  },

  // Profile Card
  profileCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    marginTop: 1,
  },
  profilePhone: {
    fontSize: 11,
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00C48C',
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  signOutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 18,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
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

  // Edit Profile Modal
  editProfileModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    elevation: 10,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    marginBottom: 12,
  },
  editModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  editModalScroll: {
    paddingTop: 4,
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 10,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  inputPrefixIcon: {
    marginRight: 10,
  },
  formInput: {
    flex: 1,
    fontSize: 14,
  },
  passwordSectionBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  passwordSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  passwordSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  passwordSectionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
  },
  floatingPopupError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  floatingPopupTitleError: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  floatingPopupTextError: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 1,
  },
  floatingPopupSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderColor: '#34D399',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#00C48C',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  floatingPopupTitleSuccess: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  floatingPopupTextSuccess: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 1,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  errorAlertText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    borderColor: 'rgba(0, 196, 140, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  successAlertText: {
    fontSize: 12,
    color: '#00C48C',
    fontWeight: '700',
    flex: 1,
  },
  editModalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  editSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
