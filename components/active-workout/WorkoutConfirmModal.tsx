import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface WorkoutConfirmModalProps {
  visible: boolean;
  type: 'pause' | 'finish';
  title: string;
  message: string;
  isSaving?: boolean;
  onCancel: () => void;
  // For 'pause' type
  onLeave?: () => void;
  onDiscard?: () => void;
  leaveText?: string;
  discardText?: string;
  // For 'finish' type
  onSave?: () => void;
  saveText?: string;
  cancelText?: string;
}

export const WorkoutConfirmModal: React.FC<WorkoutConfirmModalProps> = ({
  visible,
  type,
  title,
  message,
  isSaving = false,
  onCancel,
  onLeave,
  onDiscard,
  leaveText,
  discardText,
  onSave,
  saveText,
  cancelText = 'キャンセル',
}) => {
  if (!visible) return null;

  const isPause = type === 'pause';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialogContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            {/* Header Icon Badge */}
            <View style={[styles.iconContainer, isPause ? styles.iconContainerPause : styles.iconContainerFinish]}>
              <Ionicons
                name={isPause ? 'exit-outline' : 'checkmark-circle-outline'}
                size={32}
                color={isPause ? '#ff9f0a' : Theme.colors.primary}
              />
            </View>

            {/* Title & Message */}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Button Actions */}
            <View style={styles.buttonStack}>
              {isPause ? (
                <>
                  {/* Leave in background (Primary) */}
                  <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={onLeave}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back-circle-outline" size={20} color="#ffffff" style={styles.btnIcon} />
                    <Text style={styles.buttonPrimaryText}>{leaveText || '中止せずに離れる'}</Text>
                  </TouchableOpacity>

                  {/* Discard workout (Destructive) */}
                  <TouchableOpacity
                    style={[styles.button, styles.buttonDanger]}
                    onPress={onDiscard}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff453a" style={styles.btnIcon} />
                    <Text style={styles.buttonDangerText}>{discardText || '中止して終了する'}</Text>
                  </TouchableOpacity>

                  {/* Cancel button */}
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={onCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonSecondaryText}>{cancelText}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Save workout (Primary) */}
                  <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary, isSaving && styles.buttonDisabled]}
                    onPress={onSave}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="save-outline" size={18} color="#ffffff" style={styles.btnIcon} />
                    <Text style={styles.buttonPrimaryText}>
                      {isSaving ? '保存中...' : (saveText || '保存して終了')}
                    </Text>
                  </TouchableOpacity>

                  {/* Cancel button */}
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={onCancel}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonSecondaryText}>{cancelText}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
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
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerPause: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
  },
  iconContainerFinish: {
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
  },
  title: {
    color: Theme.colors.text,
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  buttonDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  buttonDangerText: {
    color: '#ff453a',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonSecondaryText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  btnIcon: {
    marginRight: 6,
  },
});
