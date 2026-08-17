import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useStore } from '../store/useStore';

export const Header: React.FC = () => {
  const { state, triggerSimulatedAnomaly, toggleCopilotModal } = useStore();
  const isSurge = state.simulatedAnomalyActive;

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>⚡</Text>
        </View>
        <View>
          <Text style={styles.titleText}>
            PowerSense <Text style={styles.titleHighlight}>AI</Text>
          </Text>
          <Text style={styles.subtitleText}>
            {state.user?.nodeId || 'ESP32-PZEM-PLUG-01'} • {state.telemetry.frequency}Hz
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity
          style={[styles.surgeBtn, isSurge && styles.surgeBtnActive]}
          onPress={triggerSimulatedAnomaly}
        >
          <Text style={[styles.surgeBtnText, isSurge && styles.surgeBtnTextActive]}>
            {isSurge ? '⚠️ SURGE' : '⚡ TEST'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.copilotBtn}
          onPress={() => toggleCopilotModal(true)}
        >
          <Text style={styles.copilotBtnText}>🤖 RAG</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: colors.obsidian,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 18,
    color: colors.cyberCyan,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  titleHighlight: {
    color: colors.cyberCyan,
    fontWeight: '800',
  },
  subtitleText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  surgeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.obsidianLight,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  surgeBtnActive: {
    backgroundColor: 'rgba(255, 59, 107, 0.2)',
    borderColor: colors.cyberCrimson,
  },
  surgeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant,
  },
  surgeBtnTextActive: {
    color: colors.cyberCrimson,
  },
  copilotBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.cyberCyan,
  },
  copilotBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.spaceVoid,
  },
});
