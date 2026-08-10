import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MealLog } from '../../src/db/types';

const MEAL_TYPES = [
  { key: 'breakfast', label: '🌅 朝食' },
  { key: 'lunch',     label: '☀️ 昼食' },
  { key: 'dinner',   label: '🌙 夕食' },
  { key: 'snack',    label: '☕ 間食' },
] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (log: Omit<MealLog, 'id'>) => Promise<void>;
  selectedDate: string;
}

export default function ManualEntryModal({ visible, onClose, onSave, selectedDate }: Props) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<string>('dinner');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [sodium, setSodium] = useState('');
  const [fiber, setFiber] = useState('');
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setName(''); setCalories(''); setProtein(''); setFat('');
    setCarbs(''); setSodium(''); setFiber(''); setMemo('');
    setMealType('dinner');
  };

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('入力エラー', '料理名を入力してください。');
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date();
      await onSave({
        date: selectedDate,
        meal_type: mealType,
        meal_time: now.toTimeString().slice(0, 5),
        name: name.trim(),
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbs: parseFloat(carbs) || 0,
        sodium: parseFloat(sodium) || 0,
        fiber: parseFloat(fiber) || 0,
        memo: memo.trim() || undefined,
        created_at: now.getTime(),
      });
      reset();
      onClose();
    } catch {
      Alert.alert('保存エラー', '食事ログの保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>✏️ 手動入力</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* 食事タイプ選択 */}
            <Text style={styles.label}>食事タイプ</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.mealTypeBtn, mealType === t.key && styles.mealTypeBtnActive]}
                  onPress={() => setMealType(t.key)}
                >
                  <Text style={[styles.mealTypeBtnText, mealType === t.key && styles.mealTypeBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 料理名 */}
            <Text style={styles.label}>料理名 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例: チキンサラダ"
              placeholderTextColor="#475569"
            />

            {/* 栄養値入力グリッド */}
            <Text style={styles.label}>栄養素</Text>
            <View style={styles.nutriGrid}>
              {[
                { label: 'カロリー (kcal)', value: calories, setter: setCalories, color: '#10b981' },
                { label: 'タンパク質 (g)', value: protein, setter: setProtein, color: '#06b6d4' },
                { label: '脂質 (g)',       value: fat,     setter: setFat,     color: '#f59e0b' },
                { label: '炭水化物 (g)',   value: carbs,   setter: setCarbs,   color: '#a855f7' },
                { label: '塩分 (g)',       value: sodium,  setter: setSodium,  color: '#f43f5e' },
                { label: '食物繊維 (g)',   value: fiber,   setter: setFiber,   color: '#84cc16' },
              ].map((item) => (
                <View key={item.label} style={styles.nutriItem}>
                  <Text style={[styles.nutriLabel, { color: item.color }]}>{item.label}</Text>
                  <TextInput
                    style={styles.nutriInput}
                    value={item.value}
                    onChangeText={item.setter}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#475569"
                  />
                </View>
              ))}
            </View>

            {/* メモ */}
            <Text style={styles.label}>メモ（任意）</Text>
            <TextInput
              style={styles.textArea}
              value={memo}
              onChangeText={setMemo}
              placeholder="食材・調理法・感想など"
              placeholderTextColor="#475569"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>💾 保存する</Text>
              )}
            </TouchableOpacity>

            <View style={styles.bottomPad} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, marginTop: 12 },
  required: { color: '#ef4444' },
  mealTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  mealTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  mealTypeBtnActive: { backgroundColor: '#4facfe22', borderColor: '#4facfe' },
  mealTypeBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  mealTypeBtnTextActive: { color: '#4facfe' },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  nutriItem: { width: '48%', backgroundColor: '#1e293b', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155' },
  nutriLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  nutriInput: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'right',
  },
  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 24 },
});
