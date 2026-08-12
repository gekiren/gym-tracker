import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface WeightStepModalProps {
  visible: boolean;
  onClose: () => void;
  currentStep: number;
  onSelectStep: (step: number) => void;
  exerciseName?: string;
}

const PRESET_STEPS = [0.25, 0.5, 1.0, 2.5, 5.0, 10.0];

export function WeightStepModal({
  visible,
  onClose,
  currentStep,
  onSelectStep,
  exerciseName = '',
}: WeightStepModalProps) {
  const [customVal, setCustomVal] = useState('');

  useEffect(() => {
    if (visible) {
      if (!PRESET_STEPS.includes(currentStep)) {
        setCustomVal(String(currentStep));
      } else {
        setCustomVal('');
      }
    }
  }, [visible, currentStep]);

  const handleApplyCustom = () => {
    const parsed = parseFloat(customVal.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const rounded = Math.round(parsed * 1000) / 1000;
      onSelectStep(rounded);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalCard}>
              <View style={styles.header}>
                <Text style={styles.title}>重量増減ステップ設定 (kg)</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {exerciseName ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  対象種目: {exerciseName}
                </Text>
              ) : null}

              <Text style={styles.sectionLabel}>プリセットから選択</Text>
              <View style={styles.presetGrid}>
                {PRESET_STEPS.map((s) => {
                  const isSelected = currentStep === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                      onPress={() => {
                        onSelectStep(s);
                        onClose();
                      }}
                    >
                      <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                        ±{s} kg
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>カスタム自由入力</Text>
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  keyboardType="decimal-pad"
                  placeholder="例: 1.25"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={customVal}
                  onChangeText={setCustomVal}
                />
                <Text style={{ color: Theme.colors.text, marginHorizontal: 6, fontWeight: 'bold' }}>kg</Text>
                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCustom}>
                  <Text style={styles.applyBtnText}>設定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.primary,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '600',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    width: '30%',
    paddingVertical: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderColor: Theme.colors.primary,
  },
  presetBtnText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  presetBtnTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: Theme.colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  applyBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
