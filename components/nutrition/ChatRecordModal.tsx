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
import { NutritionAIResult, analyzeMealText } from '../../src/services/aiCoachService';
import { copyAIDebugLogsToClipboard } from '../../src/utils/debugLogStore';
import { MealLog } from '../../src/db/types';
import { useAppTheme } from '../../src/theme';

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

export default function ChatRecordModal({ visible, onClose, onSave, selectedDate }: Props) {
  const { backgroundTheme } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';

  const [textInput, setTextInput] = useState('');
  const [mealType, setMealType] = useState<string>('dinner');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NutritionAIResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAnalyze = async () => {
    if (!textInput.trim()) {
      Alert.alert('入力エラー', '食事内容を入力してください。');
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const res = await analyzeMealText(textInput.trim(), 'gemini');
      setResult(res);
    } catch (err: any) {
      Alert.alert(
        '解析エラー',
        err.message || 'AI栄養解析に失敗しました。通信環境を確認してください。',
        [
          { text: 'OK', style: 'cancel' },
          { text: '📋 通信ログをコピー', onPress: () => copyAIDebugLogsToClipboard(true) }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const now = new Date();
      await onSave({
        date: selectedDate,
        meal_type: mealType,
        meal_time: now.toTimeString().slice(0, 5),
        name: result.mealName,
        calories: result.calories,
        protein: result.protein,
        fat: result.fat,
        carbs: result.carbs,
        sodium: result.sodium,
        fiber: result.fiber,
        memo: result.advice,
        created_at: now.getTime(),
      });
      setTextInput('');
      setResult(null);
      onClose();
    } catch (err) {
      Alert.alert('保存エラー', '食事ログの保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setTextInput('');
    setResult(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, isPureBlack && { backgroundColor: '#000000', borderWidth: 1, borderColor: '#1f1f1f' }]}>
          <View style={[styles.header, isPureBlack && { borderBottomColor: '#1f1f1f' }]}>
            <Text style={styles.title}>💬 チャット記録</Text>
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
                  style={[
                    styles.mealTypeBtn,
                    isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' },
                    mealType === t.key && styles.mealTypeBtnActive,
                  ]}
                  onPress={() => setMealType(t.key)}
                >
                  <Text style={[styles.mealTypeBtnText, mealType === t.key && styles.mealTypeBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* テキスト入力 */}
            <Text style={styles.label}>食事内容を入力</Text>
            <TextInput
              style={[styles.textArea, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="例: ラーメン大盛りと餃子3個、コーラ500ml"
              placeholderTextColor="#475569"
              multiline
              numberOfLines={4}
              editable={!isLoading}
            />

            {/* 解析ボタン */}
            <TouchableOpacity
              style={[styles.analyzeBtn, (isLoading || !textInput.trim()) && styles.analyzeBtnDisabled]}
              onPress={handleAnalyze}
              disabled={isLoading || !textInput.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.analyzeBtnText}>🤖 AI栄養解析</Text>
              )}
            </TouchableOpacity>

            {/* 解析結果 */}
            {result && (
              <View style={[styles.resultCard, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}>
                <Text style={styles.resultTitle}>✅ 解析結果: {result.mealName}</Text>
                <View style={styles.nutriGrid}>
                  {[
                    { label: 'カロリー', val: `${Math.round(result.calories)} kcal`, color: '#10b981' },
                    { label: 'タンパク質', val: `${result.protein.toFixed(1)} g`, color: '#06b6d4' },
                    { label: '脂質', val: `${result.fat.toFixed(1)} g`, color: '#f59e0b' },
                    { label: '炭水化物', val: `${result.carbs.toFixed(1)} g`, color: '#a855f7' },
                    { label: '塩分', val: `${result.sodium.toFixed(1)} g`, color: '#f43f5e' },
                    { label: '食物繊維', val: `${result.fiber.toFixed(1)} g`, color: '#84cc16' },
                  ].map((item) => (
                    <View key={item.label} style={[styles.nutriItem, isPureBlack && { backgroundColor: '#000000' }]}>
                      <Text style={styles.nutriLabel}>{item.label}</Text>
                      <Text style={[styles.nutriVal, { color: item.color }]}>{item.val}</Text>
                    </View>
                  ))}
                </View>
                {result.advice && (
                  <Text style={[styles.adviceText, isPureBlack && { backgroundColor: '#000000' }]}>💡 {result.advice}</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.saveBtn, { flex: 1 }, isSaving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>💾 この内容で保存</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mealTypeBtn, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 }]}
                    onPress={() => copyAIDebugLogsToClipboard(true)}
                  >
                    <Text style={{ fontSize: 12, color: '#4facfe', fontWeight: '600' }}>📋 ログコピー</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-start' },
  sheet: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    marginTop: Platform.OS === 'android' ? 40 : 50,
    marginHorizontal: 8,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, marginTop: 12 },
  mealTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  mealTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  mealTypeBtnActive: { backgroundColor: '#4facfe22', borderColor: '#4facfe' },
  mealTypeBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  mealTypeBtnTextActive: { color: '#4facfe' },
  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  analyzeBtn: { backgroundColor: '#4facfe', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  resultCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 24 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  nutriItem: { width: '48%', backgroundColor: '#0f172a', borderRadius: 8, padding: 10 },
  nutriLabel: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  nutriVal: { fontSize: 14, fontWeight: '700' },
  adviceText: { fontSize: 12, color: '#94a3b8', lineHeight: 18, marginBottom: 12, backgroundColor: '#0f172a', borderRadius: 8, padding: 10 },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
