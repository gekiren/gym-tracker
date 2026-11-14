import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../src/theme';
import { FeatureId } from '../src/store/settingsStore';
import { ALL_FEATURE_IDS, FEATURE_UNLOCK_METAS, POINT_REWARDS } from '../src/constants/featureUnlockConstants';

interface InitialFeatureSelectModalProps {
  visible: boolean;
  onComplete: (selected: [FeatureId, FeatureId]) => void;
}

export const InitialFeatureSelectModal: React.FC<InitialFeatureSelectModalProps> = ({
  visible,
  onComplete,
}) => {
  const { colors } = useAppTheme();
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
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>最初に使う機能を2つ選択</Text>
            <Text style={[styles.desc, { color: colors.textMuted }]}>
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
                  style={[
                    styles.featureItem,
                    { borderColor: colors.border },
                    isSelected && [styles.featureItemSelected, { borderColor: colors.primary }],
                  ]}
                  onPress={() => handleToggle(id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: meta.badgeColor }]}>
                    <Ionicons name={meta.icon} size={22} color={meta.iconColor} />
                  </View>

                  <View style={styles.featureInfo}>
                    <Text style={[styles.featureTitle, { color: colors.text }, isSelected && { color: colors.primary }]}>
                      {meta.title}
                    </Text>
                    <Text style={[styles.featureDesc, { color: colors.textMuted }]} numberOfLines={2}>
                      {meta.shortDesc}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkCircle,
                      { borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer CTA */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.selectedCounter, { color: colors.textMuted }]}>
              選択中: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{selected.length} / 2</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.primary },
                !isReady && styles.confirmBtnDisabled,
              ]}
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
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderWidth: 1,
    padding: 24,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
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
    marginTop: 12,
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
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  featureItemSelected: {
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
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  selectedCounter: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmBtn: {
    minHeight: 48,
    paddingVertical: 12,
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
