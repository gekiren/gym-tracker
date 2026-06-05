import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { Theme } from '../src/theme';
import { useReviewStore } from '../src/store/reviewStore';
import {
  markReviewPromptShown,
  deferReviewPrompt,
  handlePositiveReview,
  handleNegativeFeedback,
} from '../src/services/reviewService';
import { Ionicons } from '@expo/vector-icons';

export const ReviewPromptModal = () => {
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
              <Ionicons name="sparkles" size={32} color={Theme.colors.primary} />
            </View>
            <Text style={styles.title}>TreNoteはいかがですか？</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonDark]}
                onPress={handleUnsatisfied}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.buttonText} numberOfLines={2}>改善してほしい</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonLight]}
                onPress={handleSatisfied}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.buttonText} numberOfLines={2}>満足している！</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.laterButton} onPress={handleLater} activeOpacity={0.7}>
              <Text style={styles.laterText}>また今度</Text>
            </TouchableOpacity>
          </View>
        );

      case 'positive':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="heart" size={36} color="#ff3b30" />
            </View>
            <Text style={styles.title}>ありがとうございます！</Text>
            <Text style={styles.subtitle}>励みになりますのでストアで応援してください！</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonDark]}
                onPress={hidePrompt}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>閉じる</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonLight]}
                onPress={handleReview}
                activeOpacity={0.8}
              >
                <Ionicons name="star" size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.buttonText}>レビューする</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'negative':
        return (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubble-ellipses" size={32} color={Theme.colors.primary} />
            </View>
            <Text style={styles.title}>ご意見をお聞かせください</Text>
            <Text style={styles.subtitle}>
              ご不便をおかけしてすみません。直接開発者へご意見をお寄せください。
            </Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonDark]}
                onPress={hidePrompt}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>閉じる</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonLight]}
                onPress={handleFeedback}
                activeOpacity={0.8}
              >
                <Ionicons name="mail" size={16} color="#fff" style={styles.btnIcon} />
                <Text style={styles.buttonText}>意見を送る</Text>
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
        <Pressable style={styles.dialogContainer} onPress={(e) => e.stopPropagation()}>
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
    maxWidth: 320,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
    height: 48,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  buttonLight: {
    backgroundColor: Theme.colors.primary,
  },
  buttonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  btnIcon: {
    marginRight: 4,
  },
  laterButton: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  laterText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
