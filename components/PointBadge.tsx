import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useFeatureUnlockStore } from '../src/store/featureUnlockStore';
import { POINT_REWARDS, POINT_COSTS } from '../src/constants/featureUnlockConstants';

interface PointBadgeProps {
  style?: any;
}

export const PointBadge: React.FC<PointBadgeProps> = ({ style }) => {
  const points = useFeatureUnlockStore(state => state.pointsBalance);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <Ionicons name="diamond" size={14} color="#ffd700" style={{ marginRight: 4 }} />
        <Text style={styles.pointText}>
          {points} <Text style={styles.pointUnit}>P</Text>
        </Text>
      </TouchableOpacity>

      {/* Point Explanation Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="diamond" size={32} color="#ffd700" />
              </View>
              <Text style={styles.modalTitle}>所持 Pポイント: {points} P</Text>
              <Text style={styles.modalDesc}>
                日々のトレーニングやログを記録するとPポイントが貯まり、新機能の開放やAI機能に利用できます。
              </Text>
            </View>

            {/* How to Earn */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 ポイントの獲得方法（Earn）</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>・機能の初回記録ボーナス</Text>
                <Text style={styles.rowValue}>+{POINT_REWARDS.FIRST_RECORD_BONUS} P</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>・機能ごとの今日の初回記録</Text>
                <Text style={styles.rowValue}>+{POINT_REWARDS.DAILY_RECORD_BONUS} P</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>・ワークアウト完了</Text>
                <Text style={styles.rowValue}>+{POINT_REWARDS.WORKOUT_COMPLETE} P</Text>
              </View>
            </View>

            {/* How to Spend */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 ポイントの使い道（Spend）</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>・新機能のアンロック</Text>
                <Text style={[styles.rowValue, { color: Theme.colors.primary }]}>10 P〜</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>・音声AIアシスタント利用</Text>
                <Text style={[styles.rowValue, { color: Theme.colors.primary }]}>{POINT_COSTS.AI_VOICE_PER_USE} P / 回</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>・AI Coach 相談・解析</Text>
                <Text style={[styles.rowValue, { color: Theme.colors.primary }]}>{POINT_COSTS.AI_COACH_PER_USE} P / 回</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
              <Text style={styles.closeBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.35)',
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  pointText: {
    color: '#ffd700',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pointUnit: {
    fontSize: 10,
    fontWeight: 'normal',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 12,
    color: Theme.colors.text,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  closeBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
