import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AutophagyAIProposal } from '../../src/services/aiCoachService';

interface Props {
  visible: boolean;
  proposal: AutophagyAIProposal | null;
  onClose: () => void;
  onApplyTargetHours: (hours: number) => void;
}

export default function AutophagyAiModal({
  visible,
  proposal,
  onClose,
  onApplyTargetHours,
}: Props) {
  if (!proposal) return null;

  const handleApply = () => {
    onApplyTargetHours(proposal.recommendedHours);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={20} color="#38bdf8" />
              <Text style={styles.title}>オートファジー時間最適化</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* 推奨時間の表示 */}
            <View style={styles.recommendCard}>
              <Text style={styles.recommendSub}>AI推奨絶食目標時間</Text>
              <Text style={styles.recommendHours}>
                {proposal.recommendedHours} <Text style={styles.hoursUnit}>時間</Text>
              </Text>
            </View>

            {/* 解析理由 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 推奨の理由・分析</Text>
              <Text style={styles.bodyText}>{proposal.reason}</Text>
            </View>

            {/* アドバイス */}
            {proposal.advice ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🛡️ 実践アドバイス</Text>
                <Text style={styles.bodyText}>{proposal.advice}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* ボタンエリア */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.applyBtnText}>
                この目標時間に設定 ({proposal.recommendedHours}h)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    marginTop: 14,
  },
  recommendCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  recommendSub: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendHours: {
    fontSize: 32,
    fontWeight: '800',
    color: '#38bdf8',
  },
  hoursUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  section: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  footer: {
    gap: 8,
    marginTop: 8,
  },
  applyBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
