import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Appliance } from '../types';
import { colors } from '../theme/colors';
import { useStore } from '../store/useStore';

interface ApplianceCardProps {
  appliance: Appliance;
}

export const ApplianceCard: React.FC<ApplianceCardProps> = ({ appliance }) => {
  const { toggleAppliance } = useStore();
  const isActive = appliance.status === 'Active';
  const isAnomaly = appliance.isAnomaly;

  return (
    <View
      style={[
        styles.card,
        isAnomaly && styles.cardAnomaly,
        !isAnomaly && isActive && styles.cardActive
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBox,
            isAnomaly && styles.iconBoxAnomaly,
            isActive && !isAnomaly && styles.iconBoxActive
          ]}
        >
          <Text style={styles.iconText}>
            {appliance.icon === 'ac_unit'
              ? '❄️'
              : appliance.icon === 'kitchen'
              ? '🧊'
              : appliance.icon === 'local_laundry_service'
              ? '🧺'
              : appliance.icon === 'ev_station'
              ? '🔌'
              : '💻'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            isActive && styles.toggleBtnActive,
            isAnomaly && styles.toggleBtnAnomaly
          ]}
          onPress={() => toggleAppliance(appliance.id)}
        >
          <Text
            style={[
              styles.toggleText,
              isActive && styles.toggleTextActive,
              isAnomaly && styles.toggleTextAnomaly
            ]}
          >
            {isActive ? (isAnomaly ? 'ANOMALY' : 'ON') : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View>
        <Text style={styles.categoryText}>{appliance.category}</Text>
        <Text style={styles.nameText}>{appliance.name}</Text>
      </View>

      <View style={styles.wattRow}>
        <Text style={[styles.wattVal, isAnomaly && styles.wattValAnomaly]}>
          {appliance.watts}
        </Text>
        <Text style={styles.wattUnit}>Watts</Text>
      </View>

      {/* Mini Sparkline Graph */}
      <View style={[styles.sparklineContainer, !isActive && styles.sparklineDim]}>
        {appliance.history.map((val, idx) => (
          <View
            key={idx}
            style={[
              styles.sparklineBar,
              isAnomaly ? styles.sparklineBarAnomaly : styles.sparklineBarActive,
              { height: `${Math.max(12, val)}%` }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.obsidianCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
    marginBottom: 12
  },
  cardActive: {
    borderColor: 'rgba(0, 240, 255, 0.3)'
  },
  cardAnomaly: {
    borderColor: colors.cyberCrimson,
    backgroundColor: 'rgba(255, 59, 107, 0.06)'
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.obsidianLight,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBoxActive: {
    borderColor: colors.cyberCyan,
    backgroundColor: 'rgba(0, 240, 255, 0.1)'
  },
  iconBoxAnomaly: {
    borderColor: colors.cyberCrimson,
    backgroundColor: 'rgba(255, 59, 107, 0.15)'
  },
  iconText: {
    fontSize: 18
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.obsidianLight,
    borderWidth: 1,
    borderColor: colors.outline
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: colors.cyberCyan
  },
  toggleBtnAnomaly: {
    backgroundColor: 'rgba(255, 59, 107, 0.2)',
    borderColor: colors.cyberCrimson
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  },
  toggleTextActive: {
    color: colors.cyberCyan
  },
  toggleTextAnomaly: {
    color: colors.cyberCrimson
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase'
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2
  },
  wattRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4
  },
  wattVal: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: colors.onSurface
  },
  wattValAnomaly: {
    color: colors.cyberCrimson
  },
  wattUnit: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  },
  sparklineContainer: {
    height: 36,
    backgroundColor: colors.spaceVoid,
    borderRadius: 10,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3
  },
  sparklineDim: {
    opacity: 0.25
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 2
  },
  sparklineBarActive: {
    backgroundColor: colors.cyberCyan
  },
  sparklineBarAnomaly: {
    backgroundColor: colors.cyberCrimson
  }
});
