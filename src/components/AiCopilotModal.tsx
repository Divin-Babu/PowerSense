import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet
} from 'react-native';
import { colors } from '../theme/colors';
import { useStore } from '../store/useStore';
import { queryRagEngine, RagResult } from '../services/ragEngine';

export const AiCopilotModal: React.FC = () => {
  const { state, toggleCopilotModal } = useStore();
  const [inputText, setInputText] = useState('');
  const [activeResult, setActiveResult] = useState<RagResult | null>(null);

  if (!state.isCopilotModalOpen) return null;

  const selectedKb = state.selectedKnowledgeItem;

  const handleQuery = (query: string) => {
    const res = queryRagEngine(query, state.ragKnowledgeBase, state.telemetry);
    setActiveResult(res);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={state.isCopilotModalOpen}
      onRequestClose={() => toggleCopilotModal(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.drawer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>🧠</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>PowerSense RAG AI</Text>
                <Text style={styles.headerSubtitle}>LLM + Knowledge Retriever</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => toggleCopilotModal(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Quick Chips */}
            <Text style={styles.sectionLabel}>QUICK DIAGNOSTIC PROMPTS</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => handleQuery('Why is my Air Conditioner drawing high watts?')}
              >
                <Text style={styles.chipText}>⚡ HVAC Surge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => handleQuery('How does PZEM-004T communicate with ESP32?')}
              >
                <Text style={styles.chipText}>🔌 Hardware Pins</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => handleQuery('How can I save money during peak tariff hours?')}
              >
                <Text style={styles.chipText}>💰 Peak Tariff</Text>
              </TouchableOpacity>
            </View>

            {/* Output Box */}
            <View style={styles.outputBox}>
              {activeResult ? (
                <View>
                  <View style={styles.outputHeader}>
                    <Text style={styles.outputTag}>✓ RAG VERIFIED RESPONSE</Text>
                    <Text style={styles.outputTime}>{activeResult.timestamp}</Text>
                  </View>
                  <Text style={styles.outputText}>{activeResult.response}</Text>
                  {activeResult.citations.length ? (
                    <Text style={styles.citationText}>
                      Retrieved Sources: {activeResult.citations.join(', ')}
                    </Text>
                  ) : null}
                </View>
              ) : selectedKb ? (
                <View>
                  <Text style={styles.outputTag}>{selectedKb.category}</Text>
                  <Text style={styles.outputTitle}>{selectedKb.title}</Text>
                  <Text style={styles.outputText}>{selectedKb.content}</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🤖</Text>
                  <Text style={styles.emptyText}>
                    Select a prompt chip or type below to query the ML knowledge base.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Input Footer */}
          <View style={styles.footer}>
            <TextInput
              style={styles.input}
              placeholder="Ask RAG about energy, sensors, maintenance..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => {
                if (inputText.trim()) {
                  handleQuery(inputText.trim());
                  setInputText('');
                }
              }}
            >
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 9, 14, 0.8)',
    justifyContent: 'flex-end'
  },
  drawer: {
    height: '82%',
    backgroundColor: colors.obsidianCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden'
  },
  header: {
    padding: 16,
    backgroundColor: colors.obsidian,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconText: {
    fontSize: 16
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface
  },
  headerSubtitle: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.cyberEmerald
  },
  closeBtn: {
    padding: 6
  },
  closeText: {
    fontSize: 18,
    color: colors.onSurfaceVariant
  },
  body: {
    flex: 1
  },
  bodyContent: {
    padding: 16,
    gap: 16
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant,
    fontWeight: '700'
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.obsidianLight,
    borderWidth: 1,
    borderColor: colors.outline
  },
  chipText: {
    fontSize: 11,
    color: colors.onSurface
  },
  outputBox: {
    backgroundColor: colors.spaceVoid,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 160,
    justifyContent: 'center'
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  outputTag: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: colors.cyberEmerald
  },
  outputTime: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant
  },
  outputTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4
  },
  outputText: {
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 18
  },
  citationText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.onSurfaceVariant,
    marginTop: 8
  },
  emptyState: {
    alignItems: 'center',
    gap: 6
  },
  emptyIcon: {
    fontSize: 28
  },
  emptyText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center'
  },
  footer: {
    padding: 12,
    backgroundColor: colors.obsidian,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    flexDirection: 'row',
    gap: 8
  },
  input: {
    flex: 1,
    backgroundColor: colors.spaceVoid,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outline
  },
  sendBtn: {
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.cyberCyan,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.spaceVoid
  }
});
