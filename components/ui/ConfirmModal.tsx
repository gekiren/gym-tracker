import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'primary';
  icon?: keyof typeof Ionicons.glyphMap;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText = 'キャンセル',
  type = 'danger',
  icon,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    if (icon) return icon;
    switch (type) {
      case 'danger':
        return 'trash-outline';
      case 'warning':
        return 'warning-outline';
      case 'info':
        return 'information-circle-outline';
      case 'primary':
      default:
        return 'checkmark-circle-outline';
    }
  };

  const getIconColor = (): string => {
    switch (type) {
      case 'danger':
        return '#ff453a';
      case 'warning':
        return '#ff9f0a';
      case 'info':
      case 'primary':
      default:
        return Theme.colors.primary || '#4facfe';
    }
  };

  const getIconBgStyle = () => {
    switch (type) {
      case 'danger':
        return styles.iconBgDanger;
      case 'warning':
        return styles.iconBgWarning;
      case 'info':
      case 'primary':
      default:
        return styles.iconBgPrimary;
    }
  };

  const getConfirmBtnStyle = () => {
    switch (type) {
      case 'danger':
        return styles.confirmBtnDanger;
      case 'warning':
        return styles.confirmBtnWarning;
      case 'info':
      case 'primary':
      default:
        return styles.confirmBtnPrimary;
    }
  };

  const defaultConfirmText = type === 'danger' ? '削除' : '実行';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={isLoading ? undefined : onCancel}>
        <Pressable style={styles.dialogContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            {/* アイコンバッジ */}
            <View style={[styles.iconContainer, getIconBgStyle()]}>
              <Ionicons name={getIconName()} size={30} color={getIconColor()} />
            </View>

            {/* タイトル ＆ メッセージ */}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* ボタン領域 */}
            <View style={styles.buttonStack}>
              <TouchableOpacity
                style={[styles.button, getConfirmBtnStyle(), isLoading && styles.buttonDisabled]}
                onPress={onConfirm}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {confirmText || defaultConfirmText}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton, isLoading && styles.buttonDisabled]}
                onPress={onCancel}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
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
    width: '90%',
    maxWidth: 340,
    backgroundColor: Theme.colors.card || '#1C1C1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  iconBgDanger: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  iconBgWarning: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
  },
  iconBgPrimary: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
  },
  title: {
    color: Theme.colors.text || '#ffffff',
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: Theme.colors.textMuted || '#8E8E93',
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
  confirmBtnDanger: {
    backgroundColor: '#ff453a',
    shadowColor: '#ff453a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnWarning: {
    backgroundColor: '#ff9f0a',
    shadowColor: '#ff9f0a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnPrimary: {
    backgroundColor: Theme.colors.primary || '#4facfe',
    shadowColor: Theme.colors.primary || '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    color: Theme.colors.text || '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
