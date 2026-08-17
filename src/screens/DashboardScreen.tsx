import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useStore } from '../store/useStore';
import { EnergyWaveChart } from '../components/EnergyWaveChart';
import { ApplianceCard } from '../components/ApplianceCard';

export const DashboardScreen: React.FC = () => {
  const { state, toggleCopilotModal } = useStore();
  const telemetry = state.telemetry;
  const isSurge = state.simulatedAnomalyActive;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Telemetry Card */}
      <View style={[styles.heroCard, isSurge && styles.heroCardSurge]}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroBadge}>REAL-TIME IOT TELEMETRY</Text>
          <Text style={styles.heroParam}>230.8V • 50.0Hz</Text>
        </View>

        <View style={styles.kwRow}>
          <Text style={styles.kwVal}>{telemetry.totalPowerKw}</Text>
          <Text style={styles.kwUnit}>kW</Text>
        </View>

        {/* Metric Chips */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>COST TODAY</Text>
            <Text style={[styles.metricVal, { color: colors.cyberEmerald }]}>
              ${telemetry.costToday.toFixed(2)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>VS YESTERDAY</Text>
            <Text style={[styles.metricVal, { color: colors.cyberCrimson }]}>
              {telemetry.vsYesterday}%
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>POWER FACTOR</Text>
            <Text style={[styles.metricVal, { color: colors.cyberCyan }]}>
              {telemetry.powerFactor}
            </Text>
          </View>
        </View>
      </View>

      {/* SVG Energy Wave Gauge */}
      <EnergyWaveChart isSurge={isSurge} />

      {/* Connected Appliance Section */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Monitored Appliances</Text>
          <Text style={styles.sectionSubtitle}>PZEM-004T Monitored Sensors</Text>
        </View>
        <Text style={styles.activeBadge}>
          {state.appliances.filter((a) => a.status === 'Active').length}/
          {state.appliances.length} Active
        </Text>
      </View>

      {state.appliances.map((app) => (
        <ApplianceCard key={app.id} appliance={app} />
      ))}

      {/* AI Insights Card */}
      <View style={styles.aiCard}>
        <View style={styles.aiTagRow}>
          <Text style={styles.aiTagIcon}>⚠️</Text>
          <Text style={styles.aiTagText}>AI THERMAL ANOMALY DETECTED</Text>
        </View>
        <Text style={styles.aiTitle}>Air Conditioner Compressor Surge</Text>
        <Text style={styles.aiDesc}>
          Active load profile indicates restricted airflow. Cleaning intake filters will restore operational efficiency.
        </Text>
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => {
            const kbItem = state.ragKnowledgeBase.find((k) => k.id === 'rag-2');
            toggleCopilotModal(true, kbItem || null);
          }}
        >
          <Text style={styles.aiBtnText}>Diagnose via AI Copilot</Text>
        </TouchableOpacity>
      </View>
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
  heroCard: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12
  },
  heroCardSurge: {
    borderColor: colors.cyberCrimson,
    backgroundColor: 'rgba(255, 59, 107, 0.08)'
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  heroBadge: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.cyberCyan,
    fontWeight: '800'
  },
  heroParam: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  },
  kwRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6
  },
  kwVal: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: colors.onSurface
  },
  kwUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cyberCyan
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  metricItem: {
    flex: 1,
    backgroundColor: colors.obsidianLight,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  metricLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface
  },
  sectionSubtitle: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  },
  activeBadge: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.cyberCyan,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)'
  },
  aiCard: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 107, 0.4)',
    gap: 8
  },
  aiTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  aiTagIcon: {
    fontSize: 12
  },
  aiTagText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: colors.cyberCrimson
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface
  },
  aiDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18
  },
  aiBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 107, 0.4)',
    marginTop: 4
  },
  aiBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.cyberCrimson
  }
});
