import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { BodyCompositionLog, Gender } from '../../src/types/bodyComposition';

import { useBodyStore } from '../../src/store/bodyStore';

interface BodyMeasurementModalProps {
  visible: boolean;
  date: string;
  currentLog: BodyCompositionLog | null;
  latestLog: BodyCompositionLog | null;
  onClose: () => void;
  onSave: (log: Partial<BodyCompositionLog> & { date: string }) => Promise<void>;
}

export default function BodyMeasurementModal({
  visible,
  date,
  currentLog,
  latestLog,
  onClose,
  onSave,
}: BodyMeasurementModalProps) {
  const savedMeasurements = useBodyStore((state) => state.savedMeasurements);

  const [weight, setWeight] = useState('');
  const [bodyFatRate, setBodyFatRate] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [height, setHeight] = useState('');
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [wrist, setWrist] = useState('');
  const [ankle, setAnkle] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setWeight(currentLog?.weight !== null && currentLog?.weight !== undefined ? String(currentLog.weight) : '');
      setBodyFatRate(
        currentLog?.body_fat_rate !== null && currentLog?.body_fat_rate !== undefined
          ? String(currentLog.body_fat_rate)
          : ''
      );
      setMuscleMass(
        currentLog?.muscle_mass !== null && currentLog?.muscle_mass !== undefined
          ? String(currentLog.muscle_mass)
          : ''
      );
      setHeight(
        currentLog?.height !== null && currentLog?.height !== undefined
          ? String(currentLog.height)
          : savedMeasurements.height !== null && savedMeasurements.height !== undefined
          ? String(savedMeasurements.height)
          : latestLog?.height !== null && latestLog?.height !== undefined
          ? String(latestLog.height)
          : ''
      );
      setNeck(
        currentLog?.neck !== null && currentLog?.neck !== undefined
          ? String(currentLog.neck)
          : savedMeasurements.neck !== null && savedMeasurements.neck !== undefined
          ? String(savedMeasurements.neck)
          : latestLog?.neck !== null && latestLog?.neck !== undefined
          ? String(latestLog.neck)
          : ''
      );
      setWaist(
        currentLog?.waist !== null && currentLog?.waist !== undefined
          ? String(currentLog.waist)
          : savedMeasurements.waist !== null && savedMeasurements.waist !== undefined
          ? String(savedMeasurements.waist)
          : latestLog?.waist !== null && latestLog?.waist !== undefined
          ? String(latestLog.waist)
          : ''
      );
      setHip(
        currentLog?.hip !== null && currentLog?.hip !== undefined
          ? String(currentLog.hip)
          : savedMeasurements.hip !== null && savedMeasurements.hip !== undefined
          ? String(savedMeasurements.hip)
          : latestLog?.hip !== null && latestLog?.hip !== undefined
          ? String(latestLog.hip)
          : ''
      );
      setWrist(
        currentLog?.wrist !== null && currentLog?.wrist !== undefined
          ? String(currentLog.wrist)
          : savedMeasurements.wrist !== null && savedMeasurements.wrist !== undefined
          ? String(savedMeasurements.wrist)
          : latestLog?.wrist !== null && latestLog?.wrist !== undefined
          ? String(latestLog.wrist)
          : ''
      );
      setAnkle(
        currentLog?.ankle !== null && currentLog?.ankle !== undefined
          ? String(currentLog.ankle)
          : savedMeasurements.ankle !== null && savedMeasurements.ankle !== undefined
          ? String(savedMeasurements.ankle)
          : latestLog?.ankle !== null && latestLog?.ankle !== undefined
          ? String(latestLog.ankle)
          : ''
      );
      setGender(currentLog?.gender || latestLog?.gender || 'male');
      setMemo(currentLog?.memo || '');
    }
  }, [visible, currentLog, savedMeasurements, latestLog]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const parsedWeight = weight ? parseFloat(weight) : null;
      const parsedFat = bodyFatRate ? parseFloat(bodyFatRate) : null;
      const parsedMuscle = muscleMass ? parseFloat(muscleMass) : null;
      const parsedHeight = height ? parseFloat(height) : null;
      const parsedNeck = neck ? parseFloat(neck) : null;
      const parsedWaist = waist ? parseFloat(waist) : null;
      const parsedHip = hip ? parseFloat(hip) : null;
      const parsedWrist = wrist ? parseFloat(wrist) : null;
      const parsedAnkle = ankle ? parseFloat(ankle) : null;

      const lbm =
        parsedWeight !== null && parsedFat !== null
          ? Number((parsedWeight * (1 - parsedFat / 100)).toFixed(1))
          : null;

      await onSave({
        date,
        weight: parsedWeight,
        body_fat_rate: parsedFat,
        muscle_mass: parsedMuscle,
        lbm,
        height: parsedHeight,
        neck: parsedNeck,
        waist: parsedWaist,
        hip: parsedHip,
        wrist: parsedWrist,
        ankle: parsedAnkle,
        gender,
        memo: memo.trim() || null,
        source: 'manual',
      });
      onClose();
    } catch (e) {
      console.error('Failed to save body measurements:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBg}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>体組成・身体サイズの記録</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 性別セレクター */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>性別</Text>
              <View style={styles.genderToggleWrap}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setGender('male')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="male"
                    size={16}
                    color={gender === 'male' ? '#fff' : Theme.colors.textMuted}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.genderBtnText, gender === 'male' && styles.genderBtnTextActive]}>
                    男性
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActiveFemale]}
                  onPress={() => setGender('female')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="female"
                    size={16}
                    color={gender === 'female' ? '#fff' : Theme.colors.textMuted}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.genderBtnText, gender === 'female' && styles.genderBtnTextActive]}>
                    女性
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 基本体組成 */}
            <Text style={styles.groupTitle}>📊 基本体組成</Text>
            <View style={styles.inputsGrid}>
              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>体重</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="70.5"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={weight}
                    onChangeText={(val) => setWeight(val.replace(',', '.'))}
                  />
                  <Text style={styles.inputUnit}>kg</Text>
                </View>
              </View>

              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>体脂肪率</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="15.0"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={bodyFatRate}
                    onChangeText={(val) => setBodyFatRate(val.replace(',', '.'))}
                  />
                  <Text style={styles.inputUnit}>%</Text>
                </View>
              </View>

              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>骨格筋量 / 筋肉量</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="32.0"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={muscleMass}
                    onChangeText={(val) => setMuscleMass(val.replace(',', '.'))}
                  />
                  <Text style={styles.inputUnit}>kg</Text>
                </View>
              </View>

              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>身長</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="175.0"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={height}
                    onChangeText={(val) => setHeight(val.replace(',', '.'))}
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              </View>
            </View>

            {/* 各部位サイズ（米海軍式・骨格限界用） */}
            <Text style={styles.groupTitle}>📐 各部位サイズ（周囲長）</Text>
            <View style={styles.inputsGrid}>
              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>首回り (Neck)</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="38.0"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={neck}
                    onChangeText={(val) => setNeck(val.replace(',', '.'))}
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              </View>

              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>ウエスト (Waist)</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="80.0"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={waist}
                    onChangeText={(val) => setWaist(val.replace(',', '.'))}
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              </View>

              {gender === 'female' && (
                <View style={styles.inputItem}>
                  <Text style={styles.inputLabel}>ヒップ (Hip)</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="decimal-pad"
                      placeholder="90.0"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={hip}
                      onChangeText={(val) => setHip(val.replace(',', '.'))}
                    />
                    <Text style={styles.inputUnit}>cm</Text>
                  </View>
                </View>
              )}

              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>手首最小囲 (Wrist)</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="17.0"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={wrist}
                    onChangeText={(val) => setWrist(val.replace(',', '.'))}
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              </View>

              <View style={styles.inputItem}>
                <Text style={styles.inputLabel}>足首最小囲 (Ankle)</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    placeholder="22.0"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={ankle}
                    onChangeText={(val) => setAnkle(val.replace(',', '.'))}
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              </View>
            </View>

            {/* メモ */}
            <Text style={styles.groupTitle}>📝 メモ</Text>
            <View style={styles.memoWrap}>
              <TextInput
                style={styles.memoInput}
                placeholder="朝一番の測定、大会前など..."
                placeholderTextColor={Theme.colors.textMuted}
                value={memo}
                onChangeText={setMemo}
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>キャンセル</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.saveBtnText}>{isSaving ? '保存中...' : '保存する'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  genderToggleWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 3,
  },
  genderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  genderBtnActive: {
    backgroundColor: '#3b82f6',
  },
  genderBtnActiveFemale: {
    backgroundColor: '#ec4899',
  },
  genderBtnText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: '#fff',
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 10,
    marginBottom: 10,
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  inputItem: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 8,
  },
  inputUnit: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginLeft: 4,
  },
  memoWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Theme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  memoInput: {
    color: Theme.colors.text,
    fontSize: 14,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnText: {
    color: Theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.primary,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
