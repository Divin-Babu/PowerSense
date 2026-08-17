import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useStore } from '../../src/store/StoreContext';
import { fetchAiRecommendationsData } from '../../src/services/api';

const DEFAULT_RECS = [
  'Turn off devices when not in use to save more energy.',
  'Consider using LED bulbs to reduce electricity consumption.',
  'Great time to run heavy appliances is between 11 PM – 6 AM.',
];

export default function AiInsightsScreen() {
  const router = useRouter();
  const { state, isDark, themeColors } = useStore();

  if (!state.isLoggedIn) return <Redirect href="/login" />;

  const [recommendations, setRecommendations] = useState(DEFAULT_RECS);
  const [savingsAmount, setSavingsAmount] = useState('₹ 245');
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: "Hello! I'm PowerSense AI. I've analyzed your telemetry: your energy efficiency improved by 15% this month!",
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

  const handleAsk = () => {
    if (!question.trim()) return;
    const userQ = question.trim();
    setQuestion('');

    const newMsgs = [...chatMessages, { role: 'user' as const, text: userQ }];
    setChatMessages(newMsgs);

    setTimeout(() => {
      let reply = "Based on your real-time PZEM-004T stream, your power consumption is within safe operational thresholds. Running appliances during off-peak hours (11 PM - 6 AM) will maximize your monthly savings.";
      const qLower = userQ.toLowerCase();
      if (qLower.includes('save') || qLower.includes('cost') || qLower.includes('bill')) {
        reply = "You can save approximately ₹245 this month by scheduling high-load appliances during the 11 PM – 6 AM off-peak tariff window and keeping standby loads unplugged.";
      } else if (qLower.includes('voltage') || qLower.includes('watt') || qLower.includes('hardware')) {
        reply = "Your ESP32 node is streaming at 230V nominal with ~0.98 power factor. No harmonic distortion or overheating detected on the 10A relay.";
      }
      setChatMessages([...newMsgs, { role: 'assistant' as const, text: reply }]);
    }, 600);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>AI Insights</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Monthly Insight Hero Card */}
        <View style={[styles.monthlyCard, { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <View style={styles.monthlyTextCol}>
            <Text style={[styles.monthlyLabel, { color: themeColors.text }]}>Monthly Insight</Text>
            <Text style={[styles.monthlyDesc, { color: themeColors.textSecondary }]}>
              You used 15% less energy this month compared to last month.
            </Text>
          </View>

          {/* 3D AI Robot Graphic */}
          <View style={styles.robotContainer}>
            <View style={[styles.robotCircle, { backgroundColor: isDark ? 'rgba(0, 196, 140, 0.15)' : '#E8FBF4' }]}>
              <Ionicons name="sparkles" size={32} color="#00C48C" />
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
            <Text style={styles.savingsLabel}>POTENTIAL SAVINGS</Text>
            <Text style={styles.savingsAmount}>
              {savingsAmount} <Text style={styles.savingsMonth}>/ month</Text>
            </Text>
            <Text style={styles.savingsSub}>By following AI energy recommendations</Text>
          </View>

          <View style={styles.growthGraphic}>
            <Ionicons name="trending-down" size={36} color="#FFFFFF" />
          </View>
        </LinearGradient>

        {/* Recommendations Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recommendations</Text>
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
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Ask PowerSense AI</Text>
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

            {/* Input Row */}
            <View style={[styles.chatInputRow, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
              <TextInput
                style={[styles.chatInput, { color: themeColors.text }]}
                placeholder="Ask about your bill, voltage, or savings..."
                placeholderTextColor={themeColors.textMuted}
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={handleAsk}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleAsk} activeOpacity={0.8}>
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  monthlyLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  monthlyDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  robotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Savings Banner
  savingsBanner: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    elevation: 5,
  },
  savingsTextCol: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 12,
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
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  growthGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 16,
    gap: 14,
    elevation: 2,
    borderWidth: 1,
  },
  recIconBadge: {
    width: 38,
    height: 38,
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
    maxWidth: '80%',
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
    lineHeight: 18,
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
