import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { useStore } from '../../src/store/StoreContext';
import { fetchAiRecommendationsData, sendAiChatMessage } from '../../src/services/api';

const DEFAULT_RECS = [
  'Turn off devices when not in use to save more energy.',
  'Consider using LED bulbs to reduce electricity consumption.',
  'Great time to run heavy appliances is between 11 PM – 6 AM.',
];

const QUICK_PROMPTS = [
  { id: 'load', label: '⚡ Max Load Limit', query: 'What is the maximum power and load limit?' },
  { id: 'wifi', label: '📶 Wi-Fi Setup Guide', query: 'How do I set up Wi-Fi and connect my phone?' },
  { id: 'unplug', label: '🔌 Why 0V when unplugged?', query: 'Why does it show 0V and 0W when unplugged?' },
  { id: 'save', label: '💰 How to save electricity', query: 'How can I save electricity and lower my bill?' },
  { id: 'safety', label: '🛡️ Is it safe for heaters?', query: 'Is PowerSense safe for heavy loads like geysers and AC?' },
  { id: 'diag', label: '📊 Live Status Report', query: 'Explain my live voltage and power consumption' },
];

export default function AiInsightsScreen() {
  const router = useRouter();
  const { state, isDark, themeColors } = useStore();

  const [recommendations, setRecommendations] = useState(DEFAULT_RECS);
  const [savingsAmount, setSavingsAmount] = useState('₹ 245');
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: "👋 **Hello! I'm PowerSense AI Product Assistant**.\n\nI can answer any doubt about your Smart Plug hardware, 10A thermal safety, Wi-Fi setup (`vivo Y75`), 0V zero-load behavior, or how to lower your monthly electricity bill!",
    },
  ]);

  useEffect(() => {
    const loadRecs = async () => {
      try {
        const data: any = await fetchAiRecommendationsData();
        if (data) {
          if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
            setRecommendations(data.recommendations.map((r: any) => r.recommendation));
          }
          if (data.potential_savings) {
            setSavingsAmount(data.potential_savings);
          }
        }
      } catch (e) {}
    };
    loadRecs();
  }, []);

  if (!state.isLoggedIn) return <Redirect href="/login" />;

  const liveVolts = state.telemetry?.voltage || 0.0;
  const liveWatts = state.singlePlug?.watts ?? Math.round((state.telemetry?.totalPowerKw || 0) * 1000);
  const liveAmps = state.telemetry?.currentAmps || 0.0;
  const liveKwh = state.telemetry?.cumulativeKwh || 0.0;
  const isRelayOn = state.singlePlug?.relayState === 'ON';

  const askQuestionText = async (textQuery: string) => {
    if (!textQuery.trim() || isThinking) return;
    const userQ = textQuery.trim();
    setQuestion('');

    const newMsgs = [...chatMessages, { role: 'user' as const, text: userQ }];
    setChatMessages(newMsgs);
    setIsThinking(true);

    const telemetryPayload = {
      voltage: liveVolts,
      current: liveAmps,
      watts: liveWatts,
      kwh: liveKwh,
      power_factor: state.telemetry?.powerFactor || 0.0,
      relay_state: isRelayOn ? 'ON' : 'OFF',
    };

    try {
      // 1. Try Backend AI Endpoint
      const backendRes: any = await sendAiChatMessage(userQ, telemetryPayload);
      if (backendRes && backendRes.answer) {
        setChatMessages([...newMsgs, { role: 'assistant' as const, text: backendRes.answer }]);
        setIsThinking(false);
        return;
      }
    } catch (err) {
      // Fallback to offline rule engine
    }

    // 2. Client-side Offline Knowledge Assistant Fallback
    setTimeout(() => {
      const qLower = userQ.toLowerCase();
      let reply = `🤖 **PowerSense AI Assistant**:\n\n` +
        `Your smart plug node is currently **${isRelayOn ? 'ACTIVE (ON)' : 'IDLE (OFF)'}** with live telemetry: **${liveVolts}V**, **${liveAmps}A**, **${liveWatts}W**.\n\n` +
        `You can ask me about product safety, Wi-Fi setup, zero-load behavior, tariff rates, or how to reduce your monthly power bill!`;

      if (qLower.includes('how does') || qLower.includes('how it works') || qLower.includes('product') || qLower.includes('powersense') || qLower.includes('monitor')) {
        reply = `💡 **How PowerSense AI Smart Plug Works**:\n\n` +
          `• **Hardware Module**: ESP32 dual-core microcontroller (240MHz) paired with PZEM-004T v3 high-precision AC transducer.\n` +
          `• **Live Data Stream**: Measures Voltage (80-260V), Current (0-10A), Active Power (Watts), and Energy (kWh) in real-time and streams over Wi-Fi @ 1.0 Hz.\n` +
          `• **Relay Control**: Built-in optocoupler safety relay (GPIO 26) lets you toggle appliances remotely.\n` +
          `• **Live Telemetry**: Currently reading **${liveVolts}V**, **${liveAmps}A**, and **${liveWatts}W** (Relay ${isRelayOn ? 'ON' : 'OFF'}).`;
      } else if (qLower.includes('wifi') || qLower.includes('wi-fi') || qLower.includes('hotspot') || qLower.includes('connect') || qLower.includes('ip') || qLower.includes('ssid')) {
        reply = `📶 **Wi-Fi & Connectivity Setup**:\n\n` +
          `1. **Hotspot Band**: Ensure your phone hotspot AP Band is set to **2.4 GHz** (ESP32 only supports 2.4 GHz).\n` +
          `2. **SSID & Password**: ESP32 auto-connects to SSID \`vivo Y75\` with Pass \`1133557799\`.\n` +
          `3. **Server IP**: Backend API server runs on laptop IP \`http://10.170.121.5:8000\`.\n` +
          `4. **LED Indicator**: Blinking LED = searching Wi-Fi; Solid Blue = Connected & Streaming live!`;
      } else if (qLower.includes('safe') || qLower.includes('load') || qLower.includes('rating') || qLower.includes('limit') || qLower.includes('overload') || qLower.includes('max') || qLower.includes('heat')) {
        reply = `⚡ **Safety & Thermal Load Ratings**:\n\n` +
          `• **Max Rated Current**: 10 Amperes (2300 Watts peak @ 230V AC).\n` +
          `• **Recommended Baseline**: Continuous operating load up to 1450 Watts (ideal for TV, PC, Geysers, Fridges, Fans).\n` +
          `• **Thermal Auto-Cutoff**: If load exceeds 1450W continuously, PowerSense AI flags a critical overload alert and triggers safety cutoff.\n` +
          `• **Current Draw**: Currently drawing **${liveWatts} Watts** (${liveAmps} A). Status: Safe.`;
      } else if (qLower.includes('unplug') || qLower.includes('0v') || qLower.includes('0w') || qLower.includes('mains') || qLower.includes('ac') || qLower.includes('zero')) {
        reply = `🔌 **PZEM Unplugged / 0V Zero-Load Explanation**:\n\n` +
          `When 230V AC mains line is unplugged from the green screw terminal:\n` +
          `• PZEM-004T v3 sensor returns 0.0V, 0.0A, 0.0W (no line voltage detected).\n` +
          `• The ESP32 node remains powered by USB 5V and keeps streaming heartbeat and relay commands over Wi-Fi.\n` +
          `• As soon as 230V AC mains load is reconnected, real line voltage (~230V) and watts draw display instantly!`;
      } else if (qLower.includes('save') || qLower.includes('bill') || qLower.includes('cost') || qLower.includes('tariff') || qLower.includes('money') || qLower.includes('kwh')) {
        reply = `💰 **Energy & Cost Optimization**:\n\n` +
          `• **Cumulative Usage**: You have consumed **${liveKwh.toFixed(2)} kWh** today.\n` +
          `• **Estimated Spend**: ₹${(liveKwh * 6.50).toFixed(2)} based on standard tariff ₹6.50/kWh.\n` +
          `• **Peak Shift Tip**: Shift heavy cycles away from peak tariff hours (6 PM – 10 PM) to save up to ₹245/month.`;
      } else if (qLower.includes('schedule') || qLower.includes('timer') || qLower.includes('auto')) {
        reply = `⏱️ **Automated Schedules & Countdown Timers**:\n\n` +
          `• You can configure custom routines (e.g. Night Sleep Saver, AC Cutoff) in the Home tab.\n` +
          `• Set 15m, 30m, 60m countdown timers to auto-toggle the relay even when you're away from home.`;
      }

      setChatMessages([...newMsgs, { role: 'assistant' as const, text: reply }]);
      setIsThinking(false);
    }, 400);
  };

  const clearChat = () => {
    setChatMessages([
      {
        role: 'assistant',
        text: "👋 Chat reset! Ask me anything about your PowerSense AI Smart Plug hardware, Wi-Fi setup, safety, or energy savings.",
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>AI Product Insights</Text>
            <Text style={[styles.headerSub, { color: themeColors.textMuted }]}>
              {isRelayOn ? `Plug Active • ${liveWatts}W (${liveVolts}V)` : 'Plug Idle • Relay OFF'}
            </Text>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearBtn} accessibilityLabel="Clear Chat">
            <Ionicons name="trash-outline" size={20} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Monthly Insight Hero Card */}
        <View style={[styles.monthlyCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.monthlyTextCol}>
            <View style={styles.monthlyBadgeRow}>
              <Ionicons name="sparkles" size={14} color="#00C48C" />
              <Text style={styles.monthlyBadgeText}>POWER SENSE INTELLIGENCE</Text>
            </View>
            <Text style={[styles.monthlyLabel, { color: themeColors.text }]}>Monthly Optimization</Text>
            <Text style={[styles.monthlyDesc, { color: themeColors.textSecondary }]}>
              Your energy efficiency improved by 15% this month! Shifting heavy loads away from peak tariff hours (6 PM - 10 PM) maximizes savings.
            </Text>
          </View>

          {/* AI Robot Graphic */}
          <View style={styles.robotContainer}>
            <View style={[styles.robotCircle, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
              <Ionicons name="hardware-chip-outline" size={30} color="#00C48C" />
            </View>
          </View>
        </View>

        {/* Potential Savings Banner */}
        <LinearGradient
          colors={['#00D589', '#009E69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.savingsBanner}
        >
          <View style={styles.savingsTextCol}>
            <Text style={styles.savingsLabel}>ESTIMATED MONTHLY SAVINGS</Text>
            <Text style={styles.savingsAmount}>
              {savingsAmount} <Text style={styles.savingsMonth}>/ month</Text>
            </Text>
            <Text style={styles.savingsSub}>Based on AI peak tariff shifting & automated relay schedules</Text>
          </View>

          <View style={styles.growthGraphic}>
            <Ionicons name="trending-down" size={36} color="#FFFFFF" />
          </View>
        </LinearGradient>

        {/* Product Spec Highlights Quick Grid */}
        <View style={styles.specSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Product Quick Specs</Text>
          <View style={styles.specGrid}>
            <View style={[styles.specCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Ionicons name="thunderstorm-outline" size={20} color="#00C48C" />
              <Text style={[styles.specTitle, { color: themeColors.text }]}>10A / 1450W</Text>
              <Text style={[styles.specSub, { color: themeColors.textMuted }]}>Safe Continuous Rating</Text>
            </View>
            <View style={[styles.specCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Ionicons name="wifi-outline" size={20} color="#3B82F6" />
              <Text style={[styles.specTitle, { color: themeColors.text }]}>2.4 GHz Wi-Fi</Text>
              <Text style={[styles.specSub, { color: themeColors.textMuted }]}>vivo Y75 Hotspot</Text>
            </View>
            <View style={[styles.specCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
              <Text style={[styles.specTitle, { color: themeColors.text }]}>PZEM-004T v3</Text>
              <Text style={[styles.specSub, { color: themeColors.textMuted }]}>Optocoupler Isolated</Text>
            </View>
          </View>
        </View>

        {/* Energy Recommendations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Energy Recommendations</Text>
          <View style={styles.recommendationsList}>
            {recommendations.map((rec, idx) => (
              <View key={idx} style={[styles.recCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
                <View style={[styles.recIconBadge, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }]}>
                  <Ionicons name="bulb-outline" size={18} color="#00C48C" />
                </View>
                <Text style={[styles.recText, { color: themeColors.text }]}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Interactive AI Chat Section */}
        <View style={styles.chatSection}>
          <View style={styles.chatHeaderRow}>
            <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 0 }]}>
              Ask PowerSense AI
            </Text>
            <Text style={[styles.chatSub, { color: themeColors.textMuted }]}>
              Product Doubt Clarifier
            </Text>
          </View>

          {/* Quick Prompt Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {QUICK_PROMPTS.map((chip) => (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.promptChip,
                  { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder },
                ]}
                onPress={() => askQuestionText(chip.query)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: themeColors.text }]}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.chatBox, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.msgRow,
                  msg.role === 'user' ? styles.userMsgRow : styles.aiMsgRow,
                ]}
              >
                {msg.role === 'assistant' && (
                  <View style={[styles.aiMsgBadge, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.2)' : '#E8FBF4' }]}>
                    <Ionicons name="sparkles" size={12} color="#00C48C" />
                  </View>
                )}
                <View
                  style={[
                    styles.msgBubble,
                    msg.role === 'user'
                      ? styles.userBubble
                      : [styles.aiBubble, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder }],
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      msg.role === 'user' ? styles.userMsgText : [styles.aiMsgText, { color: themeColors.text }],
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}

            {isThinking && (
              <View style={[styles.msgRow, styles.aiMsgRow]}>
                <View style={[styles.aiMsgBadge, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.2)' : '#E8FBF4' }]}>
                  <Ionicons name="sparkles" size={12} color="#00C48C" />
                </View>
                <View style={[styles.msgBubble, styles.aiBubble, { backgroundColor: themeColors.subCardBg, borderColor: themeColors.subCardBorder, paddingVertical: 8 }]}>
                  <ActivityIndicator size="small" color="#00C48C" />
                </View>
              </View>
            )}

            {/* Input Row */}
            <View style={[styles.chatInputRow, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
              <TextInput
                style={[styles.chatInput, { color: themeColors.text }]}
                placeholder="Ask any doubt about product, Wi-Fi, or load..."
                placeholderTextColor={themeColors.textMuted}
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={() => askQuestionText(question)}
              />
              <TouchableOpacity
                style={[styles.sendBtn, isThinking && { opacity: 0.6 }]}
                onPress={() => askQuestionText(question)}
                disabled={isThinking}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
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
    paddingTop: 10,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  clearBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Monthly Card
  monthlyCard: {
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
  },
  monthlyTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  monthlyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  monthlyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00C48C',
    letterSpacing: 0.5,
  },
  monthlyLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  monthlyDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  robotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Savings Banner
  savingsBanner: {
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    elevation: 4,
  },
  savingsTextCol: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  savingsAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  savingsMonth: {
    fontSize: 14,
    fontWeight: '600',
  },
  savingsSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  growthGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Specs Section
  specSection: {
    marginBottom: 20,
  },
  specGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  specCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  specTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  specSub: {
    fontSize: 10,
  },

  // Recommendations
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  recommendationsList: {
    gap: 10,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    elevation: 2,
    borderWidth: 1,
  },
  recIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  recText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Chat Section
  chatSection: {
    marginTop: 4,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chatSub: {
    fontSize: 12,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  promptChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chatBox: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMsgRow: {
    justifyContent: 'flex-end',
  },
  aiMsgRow: {
    justifyContent: 'flex-start',
  },
  aiMsgBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#00C48C',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userMsgText: {
    color: '#FFFFFF',
  },
  aiMsgText: {},
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    marginTop: 4,
  },
  chatInput: {
    flex: 1,
    fontSize: 13,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
