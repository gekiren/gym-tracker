import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { useAppTheme } from '../src/theme';
import { useReviewStore } from '../src/store/reviewStore';
import {
  markReviewPromptShown,
  deferReviewPrompt,
  handlePositiveReview,
  handleNegativeFeedback,
} from '../src/services/reviewService';
import { Ionicons } from '@expo/vector-icons';

export const ReviewPromptModal = () => {
  const { colors } = useAppTheme();
  const { isVisible, step, currentWorkoutCount, hidePrompt, setStep } = useReviewStore();

  if (!isVisible) return null;

  const handleSatisfied = async () => {
    await markReviewPromptShown();
    setStep('positive');
  };

  const handleUnsatisfied = async () => {
    await markReviewPromptShown();
    setStep('negative');
  };

  const handleLater = async () => {
    await deferReviewPrompt(currentWorkoutCount);
    hidePrompt();
  };

  const handleReview = async () => {
    hidePrompt();
    await handlePositiveReview();
  };

  const handleFeedback = async () => {
    hidePrompt();
    await handleNegativeFeedback();
  };

  const renderContent = () => {
    switch (step) {
      case 'main':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>TreNoteはいかがですか？</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                onPress={handleUnsatisfied}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={16} color={colors.text} style={styles.btnIcon} />
                <Text style={[styles.buttonText, { color: colors.text }]} numberOfLines={2}>改善してほしい</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleSatisfied}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.buttonPrimaryText} numberOfLines={2}>満足している！</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.laterButton} onPress={handleLater} activeOpacity={0.7}>
              <Text style={[styles.laterText, { color: colors.textMuted }]}>また今度</Text>
            </TouchableOpacity>
          </View>
        );

      case 'positive':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="heart" size={36} color={colors.danger} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>ありがとうございます！</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              励みになりますのでストアで応援してください！
            </Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                onPress={hidePrompt}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>閉じる</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleReview}
                activeOpacity={0.8}
              >
                <Ionicons name="star" size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.buttonPrimaryText}>レビューする</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'negative':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>ご意見をお聞かせください</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              ご不便をおかけしてすみません。直接開発者へご意見をお寄せください。
            </Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                onPress={hidePrompt}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>閉じる</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleFeedback}
                activeOpacity={0.8}
              >
                <Ionicons name="mail" size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.buttonPrimaryText}>意見を送る</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={handleLater}
    >
      <Pressable style={styles.overlay} onPress={handleLater}>
        <Pressable
          style={[styles.dialogContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {renderContent()}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  btnIcon: {
    marginRight: 4,
  },
  laterButton: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
