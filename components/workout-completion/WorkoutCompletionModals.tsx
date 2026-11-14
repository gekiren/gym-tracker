import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';

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
  const { colors } = useAppTheme();

  return (
    <>
      {/* Pattern Selection Modal */}
      <Modal
        visible={patternModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPatternModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPatternModalVisible(false)}>
          <Pressable
            style={[styles.bottomSheetContent, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('ui.share_modal.title')}</Text>
            
            <TouchableOpacity style={[styles.patternOption, { borderColor: colors.border }]} onPress={() => onShare('A')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="sparkles" size={24} color="#ffd700" />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={[styles.patternName, { color: colors.text }]}>{t('ui.share_modal.pattern_a_name')}</Text>
                <Text style={[styles.patternDesc, { color: colors.textMuted }]}>{t('ui.share_modal.pattern_a_desc')}</Text>
              </View>
            </TouchableOpacity>
 
            <TouchableOpacity style={[styles.patternOption, { borderColor: colors.border }]} onPress={() => onShare('B')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="list" size={24} color={colors.primary} />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={[styles.patternName, { color: colors.text }]}>{t('ui.share_modal.pattern_b_name')}</Text>
                <Text style={[styles.patternDesc, { color: colors.textMuted }]}>{t('ui.share_modal.pattern_b_desc')}</Text>
              </View>
            </TouchableOpacity>
 
            <TouchableOpacity style={[styles.patternOption, { borderColor: colors.border }]} onPress={() => onShare('C')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="stats-chart" size={24} color={colors.success} />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={[styles.patternName, { color: colors.text }]}>{t('ui.share_modal.pattern_c_name')}</Text>
                <Text style={[styles.patternDesc, { color: colors.textMuted }]}>{t('ui.share_modal.pattern_c_desc')}</Text>
              </View>
            </TouchableOpacity>
 
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: colors.border }]} 
              onPress={() => setPatternModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t('ui.common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reward Modal */}
      <Modal
        visible={rewardModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRewardModalVisible(false)}
      >
        <View style={styles.rewardModalOverlay}>
          <View style={[styles.rewardModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rewardModalIcon}>
              <Ionicons 
                name={rewardResult === 'lucky' ? "gift" : "checkmark-circle"} 
                size={54} 
                color={rewardResult === 'lucky' ? "#ffd700" : colors.success} 
              />
            </View>
            <Text style={[styles.rewardModalTitle, { color: colors.text }]}>
              {rewardResult === 'lucky' 
                ? t('ui.workout_completion.reward_title_lucky') 
                : t('ui.workout_completion.reward_title')}
            </Text>
            <Text style={[styles.rewardModalDesc, { color: colors.textMuted }]}>
              {rewardResult === 'lucky' 
                ? t('ui.workout_completion.reward_desc_two') 
                : t('ui.workout_completion.reward_desc_one')}
            </Text>
            <TouchableOpacity 
              style={[styles.rewardModalBtn, { backgroundColor: colors.primary }]} 
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
            <Text style={[styles.adPreviewTitle, { color: colors.text }]}>
              {t('ui.workout_completion.ad_preview_title')}
            </Text>
            <Text style={[styles.adPreviewDesc, { color: colors.textMuted }]}>
              {t('ui.workout_completion.ad_preview_desc')}
            </Text>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 32,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  patternOption: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 10,
  },
  patternIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  patternTextContainer: {
    flex: 1,
  },
  patternName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  patternDesc: {
    fontSize: 12,
  },
  cancelButton: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
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
    marginBottom: 12,
    textAlign: 'center',
  },
  rewardModalDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  rewardModalBtn: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardModalBtnText: {
    color: '#ffffff',
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
    marginBottom: 12,
    textAlign: 'center',
  },
  adPreviewDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
