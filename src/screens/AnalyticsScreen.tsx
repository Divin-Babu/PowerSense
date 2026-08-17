import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useStore } from '../store/useStore';
import { EnergyWaveChart } from '../components/EnergyWaveChart';

export const AnalyticsScreen: React.FC = () => {
  const { state } = useStore();
  const telemetry = state.telemetry;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Energy Analytics</Text>
        <Text style={styles.subtitle}>PZEM-004T Voltage, Current & Active Power</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>LINE VOLTAGE (AC)</Text>
          <Text style={[styles.cardVal, { color: colors.cyberCyan }]}>
            {telemetry.voltage} V
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>INSTANT CURRENT</Text>
          <Text style={[styles.cardVal, { color: colors.cyberEmerald }]}>
            {telemetry.currentAmps} A
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>POWER FACTOR</Text>
          <Text style={[styles.cardVal, { color: colors.onSurface }]}>
            {telemetry.powerFactor}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>CUMULATIVE ENERGY</Text>
          <Text style={[styles.cardVal, { color: colors.cyberAmber }]}>
            {telemetry.cumulativeKwh} kWh
          </Text>
        </View>
      </View>

      <EnergyWaveChart isSurge={state.simulatedAnomalyActive} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.spaceVoid
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 16
  },
  header: {
    gap: 2
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onSurface
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  card: {
    width: '48%',
    backgroundColor: colors.obsidianCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  },
  cardVal: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 4
  }
});
