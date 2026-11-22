import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '../src/theme';
import { useFeatureUnlockStore } from '../src/store/featureUnlockStore';
import { POINT_REWARDS, POINT_COSTS } from '../src/constants/featureUnlockConstants';

interface PointBadgeProps {
  style?: any;
}

export const PointBadge: React.FC<PointBadgeProps> = ({ style }) => {
  const { colors } = useAppTheme();
  const points = useFeatureUnlockStore(state => state.pointsBalance);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="diamond" size={14} color="#ffd700" style={styles.badgeIcon} />
        <Text style={styles.pointText}>
          {points} <Text style={styles.pointUnit}>P</Text>
        </Text>
      </TouchableOpacity>

      {/* Point Explanation Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="diamond" size={32} color="#ffd700" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                所持 Pポイント: {points} P
              </Text>
              <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                日々のトレーニングやログを記録するとPポイントが貯まり、新機能の開放やAI機能に利用できます。
              </Text>
            </View>

            {/* How to Earn */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                💰 ポイントの獲得方法（Earn）
              </Text>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  ・機能の初回記録ボーナス
                </Text>
                <Text style={styles.rowValue}>+{POINT_REWARDS.FIRST_RECORD_BONUS} P</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  ・機能ごとの今日の初回記録
                </Text>
                <Text style={styles.rowValue}>+{POINT_REWARDS.DAILY_RECORD_BONUS} P</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  ・ワークアウト完了
                </Text>
                <Text style={styles.rowValue}>+{POINT_REWARDS.WORKOUT_COMPLETE} P</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  ・実績メダル解除・クラス昇格
                </Text>
                <Text style={styles.rowValue}>+2〜50 P</Text>
              </View>
            </View>

            {/* How to Spend */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🎯 ポイントの使い道（Spend）
              </Text>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  ・新機能のアンロック
                </Text>
                <Text style={[styles.rowValue, { color: colors.primary }]}>10 P〜</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  ・音声AIアシスタント利用
                </Text>
                <Text style={[styles.rowValue, { color: colors.primary }]}>
                  {POINT_COSTS.AI_VOICE_PER_USE} P / 回
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  ・AI Coach 相談・解析
                </Text>
                <Text style={[styles.rowValue, { color: colors.primary }]}>
                  {POINT_COSTS.AI_COACH_PER_USE} P / 回
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => {
                setModalVisible(false);
                router.push('/gamification' as any);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="trophy-outline" size={16} color="#ffd700" style={{ marginRight: 6 }} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                クラス＆実績メダルを見る
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
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
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeIcon: {
    marginRight: 4,
  },
  pointText: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pointUnit: {
    fontSize: 12,
    fontWeight: 'normal',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 12,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  secondaryBtn: {
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    marginBottom: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeBtn: {
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
