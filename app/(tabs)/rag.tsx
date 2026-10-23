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
  'Set AC to 24°C ideal temperature to save ~6% energy per degree.',
  'Eliminate standby phantom power with automated schedule cutoffs.',
  'Shift heavy appliances (washing machine, geyser) away from 6 PM – 10 PM peak hours.',
  'Maintain 3-inch clearance behind refrigerator for optimal heat dissipation.',
];

const QUICK_PROMPTS = [
  { id: 'bill', label: '💡 How to lower my bill?', query: 'How can I reduce my monthly electricity bill?' },
  { id: 'ac', label: '❄️ 1.5 Ton AC Usage', query: 'How much electricity does a 1.5 ton AC consume per hour?' },
  { id: 'units', label: '📐 Calculate Units', query: 'How do I calculate electricity units and cost from watts?' },
  { id: 'pf', label: '⚡ What is Power Factor?', query: 'What is Power Factor and why does it matter?' },
  { id: 'geyser', label: '🚿 Water Geyser Tips', query: 'How much power does a water geyser use and how to save?' },
  { id: 'fridge', label: '🧊 Fridge Optimization', query: 'How to reduce refrigerator electricity consumption?' },
  { id: 'safety', label: '🛡️ 16A Socket Safety', query: 'Which appliances need a 16A socket and is it safe?' },
  { id: 'diag', label: '📊 Live Power Report', query: 'Explain my live voltage and power consumption right now' },
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
      text: "👋 **Hello! I'm your PowerSense AI Energy Assistant**.\n\nI can answer any doubt about your home appliances, power usage, reducing your electricity bill, electrical safety, or understanding your smart plug. How can I help you today?",
    },
  ]);

  useEffect(() => {
    const loadRecs = async () => {
      try {
        const data: any = await fetchAiRecommendationsData(state.user?.email);
        if (data) {
          if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
            setRecommendations(data.recommendations.map((r: any) => r.recommendation || r));
          }
          if (data.potential_savings) {
            setSavingsAmount(data.potential_savings);
          }
        }
      } catch (e) {}
    };
    loadRecs();
  }, [state.user?.email]);

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
      // Fallback to client-side conversational assistant
    }

    // 2. Client-side Conversational Assistant Fallback
    setTimeout(() => {
      const qLower = userQ.toLowerCase();
      let reply = '';

      if (qLower.includes('hi') || qLower.includes('hello') || qLower.includes('hey') || qLower.includes('namaste') || qLower.includes('good morning') || qLower.includes('good evening')) {
        reply = "👋 **Hello! I'm your PowerSense AI Energy Assistant**.\n\nI can help you understand your power consumption, clear doubts about household appliances, calculate electricity costs, and find smart ways to lower your electricity bill.\n\nWhat would you like to know or check today?";
      } else if (qLower.includes('who are you') || qLower.includes('what can you do') || qLower.includes('help me') || qLower.includes('introduce')) {
        reply = "🤖 **I'm PowerSense AI Assistant**, your personal smart home energy companion!\n\nHere are some things you can ask me:\n• **Appliance Power Usage**: Ask about ACs, fridges, geysers, induction cookers, or TVs.\n• **Bill Calculations**: Ask how electricity units (kWh) and bill charges are calculated.\n• **Saving Strategies**: Discover practical ways to cut 15%–25% off your monthly power spend.\n• **Electrical Doubts**: Learn about Voltage, Current (Amps), Power Factor, surges, and earthing.\n• **Live Diagnostic**: Ask *'How much power am I using right now?'* to check your active plug load.";
      } else if (qLower.includes('ac') || qLower.includes('air conditioner') || qLower.includes('cooling') || qLower.includes('1.5 ton')) {
        reply = "❄️ **Air Conditioner Power & Savings Guide**:\n\n• **Power Draw**: A typical 1.5-ton 3-star AC draws **1,400W – 1,800W** when the compressor runs, consuming about **1.4 – 1.8 units (kWh) per hour**.\n• **Inverter AC Advantage**: A 5-star inverter AC throttles down to **400W – 800W** once the room reaches target temperature, saving 30%–40% energy.\n• **Ideal Temperature**: Set your thermostat to **24°C**. Every 1°C increase saves roughly **6% electricity**.\n• **Pro Tip**: Use a ceiling fan on low speed alongside the AC to circulate cool air evenly without lowering the temperature setting.";
      } else if (qLower.includes('fridge') || qLower.includes('refrigerator') || qLower.includes('defrost')) {
        reply = "🧊 **Refrigerator Energy Efficiency Guide**:\n\n• **Daily Consumption**: A modern 250L frost-free refrigerator consumes **1.0 to 1.8 units (kWh) per day** (about 120W–250W during active cooling cycles).\n• **Keep Ventilation Space**: Leave at least **3 to 4 inches clearance** between the back of the fridge and the wall for heat dissipation.\n• **Check Door Gaskets**: Place a sheet of paper in the door seal. If it pulls out easily, warm room air is leaking in, forcing the compressor to run 20% longer.\n• **Optimal Temp Setting**: 3°C to 4°C for the main fridge compartment and -18°C for the freezer is ideal.";
      } else if (qLower.includes('geyser') || qLower.includes('water heater') || qLower.includes('boiler') || qLower.includes('hot water')) {
        reply = "🚿 **Water Geyser Power & Safety Guide**:\n\n• **High Wattage**: Geysers draw **2,000W to 3,000W** (approx 1 unit of electricity every 20–30 minutes).\n• **Biggest Mistake**: Leaving the geyser turned ON continuously throughout the day wastes 2 to 3 extra units just reheating cooling water.\n• **Savings Tip**: Switch the geyser ON 15–20 minutes before bathing and turn it OFF immediately after. This simple habit saves **₹350 – ₹500 every month**!";
      } else if (qLower.includes('iron') || qLower.includes('induction') || qLower.includes('cooktop') || qLower.includes('microwave') || qLower.includes('oven')) {
        reply = "🍳 **Kitchen & Heating Appliance Consumption**:\n\n• **Dry / Steam Iron**: Draws **1,000W – 1,500W**. Best practice: Iron clothes in a single batch so you don't repeatedly heat the soleplate from cold.\n• **Induction Cooktop**: Draws **1,200W – 2,000W**. However, it is ~84% energy-efficient (compared to ~40% for LPG gas stoves), cooking faster and wasting less heat.\n• **Microwave Oven**: Draws **800W – 1,400W**, but runs for only 2–5 minutes at a time, consuming just ~0.05 units per use.";
      } else if (qLower.includes('tv') || qLower.includes('television') || qLower.includes('pc') || qLower.includes('computer') || qLower.includes('laptop') || qLower.includes('gaming')) {
        reply = "🖥️ **Electronics & Entertainment Consumption**:\n\n• **LED / Smart TV (43\" - 55\")**: Draws **50W – 110W** (~0.1 unit per hour of watching).\n• **Laptop**: Draws **45W – 90W** (extremely efficient compared to desktop towers).\n• **Desktop PC + Monitor**: Draws **150W – 350W** depending on CPU/GPU workload.\n• **Gaming Consoles (PS5 / Xbox)**: Draws **160W – 220W** while gaming, and ~2W in rest mode.";
      } else if (qLower.includes('calculate') || qLower.includes('formula') || qLower.includes('units') || qLower.includes('how bill') || qLower.includes('how is bill')) {
        reply = "📐 **How Electricity Units & Bills Are Calculated**:\n\n• **The Golden Formula**:\n  $$\\text{Units (kWh)} = \\frac{\\text{Power (Watts)} \\times \\text{Hours Used}}{1000}$$\n\n• **Real-World Example**:\n  A **1,000W iron box** running for **2 hours**:\n  $$\\frac{1000 \\times 2}{1000} = 2.0 \\text{ Units (kWh)}$$\n  At an average rate of **₹6.50/unit**, the cost is: **₹13.00**.\n\n• **Monthly Bill Structure**: Total Bill = (Total Units Consumed × Slab Rate) + Fixed Meter Charges + Electricity Duty/Taxes.";
      } else if (qLower.includes('save') || qLower.includes('bill') || qLower.includes('reduce') || qLower.includes('lower') || qLower.includes('tips')) {
        reply = "💡 **Top 5 Practical Ways to Lower Your Electricity Bill**:\n\n1. **Set AC to 24°C**: Saves ~6% per degree compared to 18°C or 20°C.\n2. **Eliminate Standby Power**: Smart TVs, set-top boxes, and chargers left plugged in waste 5W–20W continuously (approx ₹150–₹250/mo in phantom power).\n3. **Switch to 9W–12W LED Bulbs**: Upgrading 5 old incandescent bulbs to LEDs saves ~40 units (₹260) every month.\n4. **Shift High Loads from Peak Hours (6 PM – 10 PM)**: Peak time tariffs carry higher surcharges. Run washing machines and water pumps during off-peak times.\n5. **Use Smart Plug Schedules**: Schedule automated cut-offs for bedroom appliances while you sleep.";
      } else if (qLower.includes('power factor') || qLower.includes('pf')) {
        reply = "⚡ **What is Power Factor (PF)?**\n\n• **Simple Analogy**: Think of a glass of soda. The liquid is the real, usable power (**kW**) that does actual work, while the foam on top is reactive power (**kVAR**). The entire volume of the glass is apparent power (**kVA**).\n• **The Math**: $\\text{Power Factor} = \\frac{\\text{Real Power (kW)}}{\\text{Apparent Power (kVA)}}$. It ranges from **0.0 to 1.0**.\n• **Ideal Range**: **0.95 to 1.0** is ideal. A low PF (<0.85) means inductive motors (like old fans or compressors) are drawing extra reactive current, stressing wiring and wasting grid energy.";
      } else if (qLower.includes('voltage') || qLower.includes('surge') || qLower.includes('brownout') || qLower.includes('fluctuation') || qLower.includes('volt')) {
        reply = `🔌 **Line Voltage & Fluctuations Explained**:\n\n• **Your Current Voltage**: Currently reading **${liveVolts.toFixed(1)} V** (Nominal standard is 220V–240V AC).\n• **Low Voltage (<205V - Brownouts)**: When voltage drops, electric motors (fridge/AC compressors) must draw *more current* to deliver the same power, causing dangerous overheating.\n• **High Voltage (>250V - Surges)**: Dangerous spikes can damage sensitive electronics like televisions and inverter boards.\n• **Protection**: PowerSense monitors line voltage continuously and alerts you when values deviate outside safe limits.`;
      } else if (qLower.includes('difference between watt') || qLower.includes('watt vs') || qLower.includes('what is watt') || qLower.includes('what is kwh')) {
        reply = "⚖️ **Difference Between Watts (W) and kWh (Units)**:\n\n• **Watts (W)** = **Speed / Rate of Energy Draw**.\n  Like the speedometer in your car showing **60 km/h** right now.\n• **kWh (Kilowatt-Hour)** = **Total Energy Consumed Over Time**.\n  Like the odometer showing you drove **60 kilometers** after 1 hour.\n\n• **Key Fact**: 1 Kilowatt (kW) = 1,000 Watts. Using 1,000 Watts continuously for 1 hour equals **1 kWh = 1 Unit** on your electricity meter.";
      } else if (qLower.includes('safe') || qLower.includes('safety') || qLower.includes('shock') || qLower.includes('earthing') || qLower.includes('16a') || qLower.includes('6a')) {
        reply = "🛡️ **Household Electrical Safety Essentials**:\n\n• **16A vs 6A Sockets**: High-power appliances (geysers, ACs, heaters, microwaves) draw over 6 Amps and **must** be connected to heavy-duty 16A sockets with 2.5mm² wiring.\n• **Avoid Daisy-Chaining Extension Cords**: Multi-plug extension cords can overheat if multiple heavy devices are plugged into the same board.\n• **Earthing (Ground Pin)**: The third (top) round pin provides a safe emergency path for leakage current to prevent electric shocks.\n• **Safe Load Ceiling**: PowerSense monitors up to **10 Amps (~2,300W)** and provides automated thermal warnings if loads exceed continuous safe limits.";
      } else if (qLower.includes('live') || qLower.includes('reading') || qLower.includes('status') || qLower.includes('now') || qLower.includes('what is running')) {
        reply = `📊 **Live Smart Plug Diagnostic Report**:\n\n• **Relay State**: **${isRelayOn ? 'ACTIVE (ON)' : 'STANDBY (OFF)'}**\n• **Active Power**: **${liveWatts} W**\n• **Line Voltage**: **${liveVolts.toFixed(1)} V** (Nominal standard)\n• **Current Draw**: **${liveAmps.toFixed(2)} A**\n• **Today Energy**: **${liveKwh.toFixed(3)} kWh (Units)**\n• **Today Spend**: **₹ ${(liveKwh * 6.50).toFixed(2)}** (@ ₹6.50/unit)\n\nEverything is operating normally within safe thermal parameters.`;
      } else if (qLower.includes('thank') || qLower.includes('thanks') || qLower.includes('awesome') || qLower.includes('great') || qLower.includes('ok') || qLower.includes('got it')) {
        reply = "😊 **You're very welcome!**\n\nI'm always here if you have any questions about saving electricity, appliance ratings, calculating bills, or managing your smart home. Have a wonderful day!";
      } else {
        reply = `💡 **PowerSense Assistant Response**:\n\nRegarding *"${userQ}"*:\n\n• **Energy Consideration**: Every household appliance's cost depends on its rated wattage and daily run hours ($$\\text{Units} = \\frac{\\text{Watts} \\times \\text{Hours}}{1000}$).\n• **Live Status**: Your smart plug is currently **${isRelayOn ? `drawing ${liveWatts} W` : 'idle (Relay OFF)'}** at **${liveVolts.toFixed(1)} V**.\n• **Suggestions**: You can ask me specific questions like:\n  - *"How much power does a 1.5 ton AC consume?"*\n  - *"How do I calculate units from watts?"*\n  - *"Why is my electricity bill so high?"*\n  - *"What is the ideal temperature for a refrigerator?"*\n  - *"What is Power Factor?"*`;
      }

      setChatMessages([...newMsgs, { role: 'assistant' as const, text: reply }]);
      setIsThinking(false);
    }, 350);
  };

  const clearChat = () => {
    setChatMessages([
      {
        role: 'assistant',
        text: "👋 Chat reset! Ask me anything about home appliance power usage, electricity bills, energy savings, or electrical safety.",
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

        {/* Smart Protection & Features Quick Grid */}
        <View style={styles.specSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Smart Protection & Features</Text>
          <View style={styles.specGrid}>
            <View style={[styles.specCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#00C48C" />
              <Text style={[styles.specTitle, { color: themeColors.text }]}>10A / 2300W</Text>
              <Text style={[styles.specSub, { color: themeColors.textMuted }]}>Surge & Overload Guard</Text>
            </View>
            <View style={[styles.specCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Ionicons name="timer-outline" size={20} color="#3B82F6" />
              <Text style={[styles.specTitle, { color: themeColors.text }]}>Auto Cut-off</Text>
              <Text style={[styles.specSub, { color: themeColors.textMuted }]}>Smart Routines & Timers</Text>
            </View>
            <View style={[styles.specCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
              <Ionicons name="speedometer-outline" size={20} color="#10B981" />
              <Text style={[styles.specTitle, { color: themeColors.text }]}>True RMS Meter</Text>
              <Text style={[styles.specSub, { color: themeColors.textMuted }]}>Real-time V / A / W / kWh</Text>
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
