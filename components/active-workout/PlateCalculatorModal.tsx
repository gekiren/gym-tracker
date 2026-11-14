import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { useTranslation } from 'react-i18next';

interface PlateCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  weightUnit: 'kg' | 'lbs' | string;
  onApply: (totalWeight: number) => void;
}

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  visible,
  onClose,
  weightUnit,
  onApply,
}) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [plateCalcBar, setPlateCalcBar] = useState(20);
  const [platesOnOneSide, setPlatesOnOneSide] = useState<number[]>([]);
  const [isCustomBar, setIsCustomBar] = useState(false);
  const [customBarText, setCustomBarText] = useState('20');

  // Initialize or reset when modal becomes visible or unit changes
  useEffect(() => {
    if (visible) {
      const defaultVal = weightUnit === 'lbs' ? 45 : 20;
      setPlateCalcBar(defaultVal);
      setCustomBarText(String(defaultVal));
      setIsCustomBar(false);
      setPlatesOnOneSide([]);
    }
  }, [visible, weightUnit]);

  const totalPlateWeight = plateCalcBar + (platesOnOneSide.reduce((a, b) => a + b, 0) * 2);

  const handleApply = () => {
    onApply(totalPlateWeight);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('ui.active_workout.plate_calc_title')}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.calcResultContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.calcResultText, { color: colors.primary }]}>{totalPlateWeight} {weightUnit}</Text>
            <Text style={[styles.calcFormulaText, { color: colors.textMuted }]}>
              {t('ui.active_workout.plate_calc_bar_weight')} {plateCalcBar}{weightUnit} + {t('ui.active_workout.plate_calc_add_plates')} {platesOnOneSide.reduce((a, b) => a + b, 0)}{weightUnit} × 2
            </Text>
          </View>

          {/* バーの選択 */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('ui.active_workout.plate_calc_bar_weight')}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            {(weightUnit === 'lbs' ? [45, 35] : [20, 10, 7]).map(w => {
              const isActive = !isCustomBar && plateCalcBar === w;
              return (
                <TouchableOpacity
                  key={w}
                  style={[
                    styles.barBtn,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    isActive && [styles.barBtnActive, { borderColor: colors.primary }],
                  ]}
                  onPress={() => {
                    setIsCustomBar(false);
                    setPlateCalcBar(w);
                  }}
                >
                  <Text style={[styles.barBtnText, { color: colors.textMuted }, isActive && { color: colors.primary }]}>
                    {w} {weightUnit}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                styles.barBtn,
                { backgroundColor: colors.background, borderColor: colors.border },
                isCustomBar && [styles.barBtnActive, { borderColor: colors.primary }],
              ]}
              onPress={() => {
                setIsCustomBar(true);
                setPlateCalcBar(parseFloat(customBarText) || 0);
              }}
            >
              <Text style={[styles.barBtnText, { color: colors.textMuted }, isCustomBar && { color: colors.primary }]}>
                {t('ui.active_workout.plate_calc_bar_custom')}
              </Text>
            </TouchableOpacity>
          </View>

          {isCustomBar && (
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              keyboardType="decimal-pad"
              placeholder={t('ui.active_workout.plate_calc_bar_custom_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={customBarText}
              onChangeText={(val) => {
                if (val === '' || /^\d{0,3}(\.\d{0,2})?$/.test(val)) {
                  setCustomBarText(val);
                  setPlateCalcBar(val !== '' && val !== '.' ? parseFloat(val) : 0);
                }
              }}
            />
          )}

          <View style={[styles.barVisualizer, { borderColor: colors.border }]}>
            <View style={{ width: 10, height: '100%', backgroundColor: '#666' }} />
            {/* 真ん中のバー部分 */}
            <View style={{ flex: 1, height: 16, backgroundColor: '#888', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
              {/* プレートの描画 (内側から外側へ) */}
              {platesOnOneSide.map((p, i) => {
                let h = 20, w = 8, color = colors.primary;
                if (weightUnit === 'lbs') {
                  switch (p) {
                    case 45: h = 56; w = 30; color = '#e53935'; break; // 赤
                    case 35: h = 56; w = 30; color = '#1e88e5'; break; // 青
                    case 25: h = 48; w = 30; color = '#43a047'; break; // 緑
                    case 10: h = 40; w = 30; color = '#eeeeee'; break; // 白
                    case 5: h = 30; w = 30; color = '#424242'; break; // 黒に近いグレー
                    case 2.5: h = 24; w = 30; color = '#ff9800'; break; // オレンジ
                  }
                } else {
                  switch (p) {
                    case 25: h = 56; w = 30; color = '#e53935'; break; // 赤
                    case 20: h = 56; w = 30; color = '#1e88e5'; break; // 青
                    case 15: h = 48; w = 30; color = '#fbc02d'; break; // 黄
                    case 10: h = 40; w = 30; color = '#43a047'; break; // 緑
                    case 5: h = 30; w = 30; color = '#eeeeee'; break; // 白
                    case 2.5: h = 24; w = 30; color = '#424242'; break; // 黒に近いグレー
                    case 1.25: h = 18; w = 30; color = '#ff9800'; break; // オレンジ
                  }
                }
                const slopY = Math.max(0, (56 - h) / 2);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setPlatesOnOneSide(prev => prev.filter((_, index) => index !== i))}
                    activeOpacity={0.7}
                    hitSlop={{ top: slopY, bottom: slopY, left: 4, right: 4 }}
                    style={[styles.plateVisual, { height: h, width: w, backgroundColor: color }]}
                  />
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>{t('ui.active_workout.plate_calc_add_plates')}</Text>
            <TouchableOpacity
              onPress={() => setPlatesOnOneSide(prev => prev.slice(0, -1))}
              disabled={platesOnOneSide.length === 0}
              style={styles.undoBtn}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
            >
              <Text style={{ color: platesOnOneSide.length > 0 ? colors.danger : colors.textMuted, fontWeight: '600' }}>
                {t('ui.active_workout.plate_calc_undo')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {(weightUnit === 'lbs' ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25]).map(w => (
              <TouchableOpacity
                key={w}
                style={[styles.plateBtn, { borderColor: colors.border }]}
                onPress={() => setPlatesOnOneSide(prev => [...prev, w])}
              >
                <Text style={[styles.plateBtnText, { color: colors.text }]}>+ {w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: colors.primary }]}
            onPress={handleApply}
          >
            <Text style={styles.applyBtnText}>{t('ui.active_workout.plate_calc_apply_btn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: 16, borderWidth: 1, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  closeBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalInput: { padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  calcResultContainer: { alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  calcResultText: { fontSize: 34, fontWeight: 'bold', marginBottom: 4 },
  calcFormulaText: { fontSize: 13 },
  sectionTitle: { fontSize: 14, marginBottom: 8, fontWeight: 'bold' },
  barBtn: { flex: 1, marginHorizontal: 4, minHeight: 44, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  barBtnActive: { backgroundColor: 'rgba(79, 172, 254, 0.12)' },
  barBtnText: { fontSize: 14, fontWeight: 'bold' },
  barVisualizer: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: '#000', borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  plateVisual: { marginHorizontal: 1, borderRadius: 2 },
  undoBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  plateBtn: { minHeight: 44, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 8, borderWidth: 1, minWidth: '22%', alignItems: 'center' },
  plateBtnText: { fontWeight: 'bold', fontSize: 14 },
  applyBtn: { minHeight: 48, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
