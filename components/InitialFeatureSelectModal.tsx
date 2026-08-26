import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { FeatureId } from '../src/store/settingsStore';
import { ALL_FEATURE_IDS, FEATURE_UNLOCK_METAS, POINT_REWARDS } from '../src/constants/featureUnlockConstants';
import { useFeatureUnlockStore } from '../src/store/featureUnlockStore';

interface InitialFeatureSelectModalProps {
  visible: boolean;
  onComplete: (selected: [FeatureId, FeatureId]) => void;
}

export const InitialFeatureSelectModal: React.FC<InitialFeatureSelectModalProps> = ({
  visible,
  onComplete,
}) => {
  const [selected, setSelected] = useState<FeatureId[]>(['workout', 'water']);

  const handleToggle = (id: FeatureId) => {
    if (selected.includes(id)) {
      if (selected.length > 1) {
        setSelected(selected.filter(item => item !== id));
      }
    } else {
      if (selected.length < 2) {
        setSelected([...selected, id]);
      } else {
        // すでに2つ選ばれている場合は、古い方を置き換える
        setSelected([selected[1], id]);
      }
    }
  };

  const handleConfirm = () => {
    if (selected.length === 2) {
      onComplete([selected[0], selected[1]]);
    }
  };

  const isReady = selected.length === 2;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={28} color={Theme.colors.primary} />
            </View>
            <Text style={styles.title}>最初に使う機能を2つ選択</Text>
            <Text style={styles.desc}>
              最初はシンプルな機能からスタート！{'\n'}
              記録をつけると<Text style={{ color: '#ffd700', fontWeight: 'bold' }}>Pポイント</Text>が貯まり、後からいつでも好きな機能を開放できます。
            </Text>
            <View style={styles.bonusBadge}>
              <Ionicons name="gift-outline" size={16} color="#ffd700" style={{ marginRight: 4 }} />
              <Text style={styles.bonusText}>初期ボーナス: +{POINT_REWARDS.INITIAL_BONUS} P プレゼント！</Text>
            </View>
          </View>

          {/* Grid Selection */}
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.listContent}>
            {ALL_FEATURE_IDS.map((id) => {
              const meta = FEATURE_UNLOCK_METAS[id];
              const isSelected = selected.includes(id);

              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.featureItem, isSelected && styles.featureItemSelected]}
                  onPress={() => handleToggle(id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: meta.badgeColor }]}>
                    <Ionicons name={meta.icon} size={22} color={meta.iconColor} />
                  </View>

                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, isSelected && styles.textSelected]}>
                      {meta.title}
                    </Text>
                    <Text style={styles.featureDesc} numberOfLines={2}>
                      {meta.shortDesc}
                    </Text>
                  </View>

                  <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer CTA */}
          <View style={styles.footer}>
            <Text style={styles.selectedCounter}>
              選択中: <Text style={{ color: Theme.colors.primary, fontWeight: 'bold' }}>{selected.length} / 2</Text>
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, !isReady && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!isReady}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>
                {isReady ? 'この2つでスタートする' : 'あと ' + (2 - selected.length) + ' つ選択してください'}
              </Text>
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
    padding: 16,
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  bonusText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollList: {
    maxHeight: 320,
  },
  listContent: {
    gap: 8,
    paddingVertical: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  featureItemSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(79, 172, 254, 0.08)',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
    marginRight: 8,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  textSelected: {
    color: Theme.colors.primary,
  },
  featureDesc: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    lineHeight: 15,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  selectedCounter: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
