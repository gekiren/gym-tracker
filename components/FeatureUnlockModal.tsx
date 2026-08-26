import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../src/theme';
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
    <Modal visible={!!featureId} animationType="fade" transparent={true}>
      <View style={styles.modalBg}>
        <Confetti />
        
        <View style={styles.modalCard}>
          <View style={[styles.iconCircle, { backgroundColor: meta.badgeColor }]}>
            <Ionicons name={meta.icon} size={42} color={meta.iconColor} />
          </View>

          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color="#ffd700" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>NEW FEATURE UNLOCKED!</Text>
          </View>

          <Text style={styles.title}>新機能が開放されました！</Text>
          <Text style={styles.featureName}>{meta.title}</Text>

          <Text style={styles.desc}>
            {meta.fullDesc}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGoToFeature} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>今すぐ使ってみる</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>ダッシュボードに戻る</Text>
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
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: Theme.colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
