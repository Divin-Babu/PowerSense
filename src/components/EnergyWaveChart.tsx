import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

interface EnergyWaveChartProps {
  isSurge?: boolean;
}

export const EnergyWaveChart: React.FC<EnergyWaveChartProps> = ({ isSurge }) => {
  const strokeColor = isSurge ? colors.cyberCrimson : colors.cyberCyan;

  return (
    <View style={styles.chartBox}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>GRID WAVEFORM TELEMETRY</Text>
        <Text style={styles.headerStatus}>● 1.0 Hz SAMPLING</Text>
      </View>

      <Svg style={styles.svg} viewBox="0 0 400 120" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="waveGradRN" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        <Path
          d="M 0,80 Q 40,20 80,60 T 160,70 T 240,30 T 320,60 T 400,40 L 400,120 L 0,120 Z"
          fill="url(#waveGradRN)"
        />
        <Path
          d="M 0,80 Q 40,20 80,60 T 160,70 T 240,30 T 320,60 T 400,40"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
        />
        <Circle cx="400" cy="40" r="5" fill={isSurge ? colors.cyberCrimson : colors.cyberEmerald} />
      </Svg>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>PZEM-004T ACTIVE</Text>
        <Text style={styles.footerText}>OPTOCOUPLER ISOLATED</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartBox: {
    height: 180,
    backgroundColor: colors.spaceVoid,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant,
    fontWeight: '700'
  },
  headerStatus: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.cyberEmerald,
    fontWeight: '700'
  },
  svg: {
    width: '100%',
    height: 90
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 4
  },
  footerText: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  }
});
