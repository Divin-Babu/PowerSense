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
import { colors } from '../../src/theme/colors';
import { useStore } from '../../src/store/StoreContext';
import { fetchAiRecommendationsData } from '../../src/services/api';

const DEFAULT_RECS = [
  'Turn off devices when not in use to save more energy.',
  'Consider using LED bulbs to reduce electricity consumption.',
  'Great time to run heavy appliances is between 11 PM – 6 AM.',
];

export default function AiInsightsScreen() {
  const router = useRouter();
  const { state } = useStore();

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Insights</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Monthly Insight Hero Card */}
        <View style={styles.monthlyCard}>
          <View style={styles.monthlyTextCol}>
            <Text style={styles.monthlyLabel}>Monthly Insight</Text>
            <Text style={styles.monthlyDesc}>
              You used 15% less energy this month compared to last month.
            </Text>
          </View>

          {/* 3D AI Robot Graphic */}
          <View style={styles.robotGraphicWrapper}>
            <View style={styles.robotHead}>
              <View style={styles.robotAntenna} />
              <View style={styles.robotFace}>
                <View style={styles.robotEye} />
                <View style={styles.robotEye} />
              </View>
              <View style={styles.robotSmile} />
            </View>
            <View style={styles.robotBody}>
              <View style={styles.robotCore} />
            </View>
          </View>
        </View>

        {/* Recommendations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>

          <View style={styles.recommendationsList}>
            {recommendations.map((recText, idx) => {
              const icons = ['leaf-outline', 'bulb-outline', 'time-outline', 'shield-checkmark-outline'];
              const iconColors = ['#111827', '#F59E0B', '#3B82F6', '#00C48C'];
              const iconName = icons[idx % icons.length];
              const iconColor = iconColors[idx % iconColors.length];

              return (
                <View key={idx} style={styles.recCard}>
                  <View style={styles.recIconBadge}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>
                  <Text style={styles.recText}>{recText}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Green Savings Banner */}
        <LinearGradient
          colors={['#00D589', '#009E69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.savingsBanner}
        >
          <View style={styles.savingsTextCol}>
            <Text style={styles.savingsLabel}>You can save up to</Text>
            <Text style={styles.savingsAmount}>{savingsAmount} <Text style={styles.savingsMonth}>this month</Text></Text>
            <Text style={styles.savingsSub}>by optimizing usage!</Text>
          </View>

          {/* Upward Growth Chart & Coin Graphic */}
          <View style={styles.growthGraphic}>
            <Svg width="70" height="50" viewBox="0 0 70 50">
              <Path
                d="M 5 45 L 25 30 L 42 35 L 65 10"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <Path d="M 55 10 L 65 10 L 65 20" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {/* Stacked Coins */}
              <Rect x="48" y="32" width="16" height="6" rx="3" fill="#FBBF24" />
              <Rect x="48" y="24" width="16" height="6" rx="3" fill="#FDE047" />
              <Rect x="48" y="16" width="16" height="6" rx="3" fill="#FEF08A" />
            </Svg>
          </View>
        </LinearGradient>

        {/* AI Chatbot Assistant */}
        <View style={styles.chatSection}>
          <Text style={styles.sectionTitle}>Ask PowerSense AI</Text>

          <View style={styles.chatBox}>
            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.msgRow,
                  msg.role === 'user' ? styles.userMsgRow : styles.aiMsgRow,
                ]}
              >
                {msg.role === 'assistant' && (
                  <View style={styles.aiMsgBadge}>
                    <Ionicons name="flash" size={12} color="#00C48C" />
                  </View>
                )}
                <View
                  style={[
                    styles.msgBubble,
                    msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      msg.role === 'user' ? styles.userMsgText : styles.aiMsgText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Ask about tariffs, savings, or hardware..."
                placeholderTextColor="#94A3B8"
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  // Monthly Card
  monthlyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E9E7',
  },
  monthlyTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  monthlyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  monthlyDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  robotGraphicWrapper: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#E8FBF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotHead: {
    width: 36,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#00C48C',
  },
  robotAntenna: {
    width: 3,
    height: 4,
    backgroundColor: '#00C48C',
    position: 'absolute',
    top: -5,
  },
  robotFace: {
    flexDirection: 'row',
    gap: 8,
  },
  robotEye: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00C48C',
  },
  robotSmile: {
    width: 8,
    height: 2,
    backgroundColor: '#00C48C',
    borderRadius: 1,
    marginTop: 3,
  },
  robotBody: {
    width: 22,
    height: 12,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00C48C',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00D589',
  },

  // Recommendations
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  recommendationsList: {
    gap: 10,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E9E7',
  },
  recIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E9E7',
  },
  recText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 18,
  },

  // Savings Banner
  savingsBanner: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#00D589',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 5,
  },
  savingsTextCol: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
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

  // Chat Section
  chatSection: {
    marginTop: 4,
  },
  chatBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E9E7',
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
    backgroundColor: '#E8FBF4',
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
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E5E9E7',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userMsgText: {
    color: '#FFFFFF',
  },
  aiMsgText: {
    color: '#111827',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9E7',
    paddingHorizontal: 12,
    height: 46,
    marginTop: 4,
  },
  chatInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
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
