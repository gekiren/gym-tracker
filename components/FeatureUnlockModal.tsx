import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '../src/theme';
import { FeatureId } from '../src/store/settingsStore';
import { FEATURE_UNLOCK_METAS } from '../src/constants/featureUnlockConstants';
import { Confetti } from './Confetti';

interface FeatureUnlockModalProps {
  featureId: FeatureId | null;
  onClose: () => void;
}

export const FeatureUnlockModal: React.FC<FeatureUnlockModalProps> = ({
  featureId,
  onClose,
}) => {
  const { colors } = useAppTheme();
  if (!featureId) return null;

  const meta = FEATURE_UNLOCK_METAS[featureId];
  if (!meta) return null;

  const handleGoToFeature = () => {
    onClose();
    if (meta.route) {
      router.push(meta.route as any);
    }
  };

  return (
    <Modal visible={!!featureId} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <Confetti />
        
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconCircle, { backgroundColor: meta.badgeColor }]}>
            <Ionicons name={meta.icon} size={40} color={meta.iconColor} />
          </View>

          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color="#ffd700" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>NEW FEATURE UNLOCKED!</Text>
          </View>

          <Text style={[styles.title, { color: colors.textMuted }]}>新機能が開放されました！</Text>
          <Text style={[styles.featureName, { color: colors.text }]}>{meta.title}</Text>

          <Text style={[styles.desc, { color: colors.text }]}>
            {meta.fullDesc}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleGoToFeature}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>今すぐ使ってみる</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeBtnText, { color: colors.text }]}>ダッシュボードに戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
