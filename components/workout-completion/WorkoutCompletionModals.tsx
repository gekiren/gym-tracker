import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface WorkoutCompletionModalsProps {
  patternModalVisible: boolean;
  setPatternModalVisible: (visible: boolean) => void;
  rewardModalVisible: boolean;
  setRewardModalVisible: (visible: boolean) => void;
  rewardResult: 'normal' | 'lucky' | null;
  showAdPreview: boolean;
  onShare: (pattern: 'A' | 'B' | 'C') => void;
  t: (key: string) => string;
}

export const WorkoutCompletionModals: React.FC<WorkoutCompletionModalsProps> = ({
  patternModalVisible,
  setPatternModalVisible,
  rewardModalVisible,
  setRewardModalVisible,
  rewardResult,
  showAdPreview,
  onShare,
  t,
}) => {
  return (
    <>
      {/* Pattern Selection Modal */}
      <Modal
        visible={patternModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPatternModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <Text style={styles.modalTitle}>シェア画像のデザインを選択</Text>
            
            <TouchableOpacity style={styles.patternOption} onPress={() => onShare('A')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="sparkles" size={24} color="#ffd700" />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>パターンA: エンタメ換算重視</Text>
                <Text style={styles.patternDesc}>総重量を軽自動車やゾウ、おにぎり等に面白換算！</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.patternOption} onPress={() => onShare('B')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="list" size={24} color={Theme.colors.primary} />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>パターンB: 詳細記録重視</Text>
                <Text style={styles.patternDesc}>全種目の重量・レップ・セット数をきれいに一覧化！</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.patternOption} onPress={() => onShare('C')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="stats-chart" size={24} color={Theme.colors.success} />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>パターンC: ハイブリッド</Text>
                <Text style={styles.patternDesc}>面白換算に加え、種目ごとのセット数と最大1RMを表示！</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setPatternModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reward Modal */}
      <Modal visible={rewardModalVisible} transparent={true} animationType="fade">
        <View style={styles.rewardModalOverlay}>
          <View style={styles.rewardModalContent}>
            <View style={styles.rewardModalIcon}>
              <Ionicons 
                name={rewardResult === 'lucky' ? "gift" : "checkmark-circle"} 
                size={54} 
                color={rewardResult === 'lucky' ? "#ffd700" : Theme.colors.success} 
              />
            </View>
            <Text style={styles.rewardModalTitle}>
              {rewardResult === 'lucky' 
                ? t('ui.workout_completion.reward_title_lucky') 
                : t('ui.workout_completion.reward_title')}
            </Text>
            <Text style={styles.rewardModalDesc}>
              {rewardResult === 'lucky' 
                ? t('ui.workout_completion.reward_desc_two') 
                : t('ui.workout_completion.reward_desc_one')}
            </Text>
            <TouchableOpacity 
              style={styles.rewardModalBtn} 
              onPress={() => setRewardModalVisible(false)}
            >
              <Text style={styles.rewardModalBtnText}>
                {t('ui.workout_completion.reward_close_btn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ad Preview Overlay */}
      {showAdPreview && (
        <View style={styles.adPreviewOverlay}>
          <View style={styles.adPreviewContent}>
            <View style={styles.adPreviewIconCircle}>
              <Ionicons name="gift" size={48} color="#ffd700" />
            </View>
            <Text style={styles.adPreviewTitle}>
              {t('ui.workout_completion.ad_preview_title')}
            </Text>
            <Text style={styles.adPreviewDesc}>
              {t('ui.workout_completion.ad_preview_desc')}
            </Text>
            <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginTop: 24 }} />
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: Theme.borderRadius.lg,
    borderTopRightRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
  },
  patternOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  patternIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  patternTextContainer: {
    flex: 1,
  },
  patternName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  patternDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  cancelButton: {
    marginTop: Theme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  rewardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rewardModalContent: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  rewardModalIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  rewardModalDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  rewardModalBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: Theme.borderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  rewardModalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  adPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
  },
  adPreviewContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  adPreviewIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  adPreviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  adPreviewDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
