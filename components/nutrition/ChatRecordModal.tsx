import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NutritionAIResult, analyzeMealText } from '../../src/services/nutritionAiService';
import { copyAIDebugLogsToClipboard } from '../../src/utils/debugLogStore';
import { MealLog } from '../../src/db/types';
import { useAppTheme } from '../../src/theme';
import { getDefaultMealType, getCurrentTimeStr } from '../../src/utils/nutritionUtils';
import TimeWheelPicker from './TimeWheelPicker';

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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [textInput, setTextInput] = useState('');
  const [mealType, setMealType] = useState<string>(getDefaultMealType());
  const [mealTime, setMealTime] = useState<string>(getCurrentTimeStr());
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NutritionAIResult | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);
  const [customMultiplierText, setCustomMultiplierText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setMealType(getDefaultMealType());
      setMealTime(getCurrentTimeStr());
    }
  }, [visible]);

  const handleAnalyze = async () => {
    if (!textInput.trim()) {
      Alert.alert('入力エラー', '食事内容を入力してください。');
      return;
    }
    setIsLoading(true);
    setResult(null);
    setMultiplier(1.0);
    setShowCustomMultiplierInput(false);
    setCustomMultiplierText('');
    try {
      const res = await analyzeMealText(textInput.trim());
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

  const handleMultiplierChange = (m: number) => {
    setMultiplier(m);
    setShowCustomMultiplierInput(false);
  };

  const handleApplyCustomMultiplier = () => {
    const normalized = customMultiplierText.replace(/[０-９．]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('入力エラー', '正しい倍率（0より大きい数値）を入力してください。');
      return;
    }
    const rounded = parseFloat(parsed.toFixed(2));
    setMultiplier(rounded);
    setShowCustomMultiplierInput(false);
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const now = new Date();
      await onSave({
        date: selectedDate,
        meal_type: mealType,
        meal_time: mealTime || getCurrentTimeStr(),
        name: result.mealName,
        calories: Math.round(result.calories * multiplier),
        protein: parseFloat((result.protein * multiplier).toFixed(1)),
        fat: parseFloat((result.fat * multiplier).toFixed(1)),
        carbs: parseFloat((result.carbs * multiplier).toFixed(1)),
        sodium: parseFloat((result.sodium * multiplier).toFixed(1)),
        fiber: parseFloat((result.fiber * multiplier).toFixed(1)),
        memo: result.advice,
        created_at: now.getTime(),
      });
      setTextInput('');
      setResult(null);
      setMultiplier(1.0);
      setShowCustomMultiplierInput(false);
      setCustomMultiplierText('');
      setMealType(getDefaultMealType());
      setMealTime(getCurrentTimeStr());
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
    setMultiplier(1.0);
    setShowCustomMultiplierInput(false);
    setCustomMultiplierText('');
    setMealType(getDefaultMealType());
    setMealTime(getCurrentTimeStr());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
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

            {/* 時間設定 (TimeWheelPicker) */}
            <TimeWheelPicker
              value={mealTime}
              onChange={setMealTime}
              label="食事時間"
            />

            {/* テキスト入力 */}
            <Text style={styles.label}>食事内容を入力</Text>
            <TextInput
              style={styles.textArea}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="例: ラーメン大盛りと餃子3個、コーラ500ml"
              placeholderTextColor={colors.textMuted}
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
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>✅ 解析結果: {result.mealName}</Text>
                <View style={styles.nutriGrid}>
                  {[
                    { label: 'カロリー', val: `${Math.round(result.calories * multiplier)} kcal`, color: '#10b981' },
                    { label: 'タンパク質', val: `${(result.protein * multiplier).toFixed(1)} g`, color: '#06b6d4' },
                    { label: '脂質', val: `${(result.fat * multiplier).toFixed(1)} g`, color: '#f59e0b' },
                    { label: '炭水化物', val: `${(result.carbs * multiplier).toFixed(1)} g`, color: '#a855f7' },
                    { label: '塩分', val: `${(result.sodium * multiplier).toFixed(1)} g`, color: '#f43f5e' },
                    { label: '食物繊維', val: `${(result.fiber * multiplier).toFixed(1)} g`, color: '#84cc16' },
                  ].map((item) => (
                    <View key={item.label} style={styles.nutriItem}>
                      <Text style={styles.nutriLabel}>{item.label}</Text>
                      <Text style={[styles.nutriVal, { color: item.color }]}>{item.val}</Text>
                    </View>
                  ))}
                </View>

                {/* 倍率調整 */}
                <View style={styles.portionBox}>
                  <Text style={styles.portionLabel}>食べた量の倍率: {multiplier}倍</Text>
                  <View style={styles.presetRow}>
                    {[0.5, 0.7, 1.0, 1.2, 1.5, 2.0].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.presetBtn, multiplier === m && !showCustomMultiplierInput && styles.presetBtnActive]}
                        onPress={() => handleMultiplierChange(m)}
                      >
                        <Text style={[styles.presetBtnText, multiplier === m && !showCustomMultiplierInput && styles.presetBtnTextActive]}>
                          {m}倍
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[
                        styles.presetBtn,
                        (showCustomMultiplierInput || (![0.5, 0.7, 1.0, 1.2, 1.5, 2.0].includes(multiplier))) && styles.presetBtnActive,
                      ]}
                      onPress={() => {
                        setCustomMultiplierText(String(multiplier));
                        setShowCustomMultiplierInput(!showCustomMultiplierInput);
                      }}
                    >
                      <Text
                        style={[
                          styles.presetBtnText,
                          (showCustomMultiplierInput || (![0.5, 0.7, 1.0, 1.2, 1.5, 2.0].includes(multiplier))) && styles.presetBtnTextActive,
                        ]}
                      >
                        ✏️ 自分で入力{!showCustomMultiplierInput && ![0.5, 0.7, 1.0, 1.2, 1.5, 2.0].includes(multiplier) ? ` (${multiplier}倍)` : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showCustomMultiplierInput && (
                    <View style={styles.customInputRow}>
                      <TextInput
                        style={styles.customInput}
                        value={customMultiplierText}
                        onChangeText={setCustomMultiplierText}
                        keyboardType="decimal-pad"
                        placeholder="例: 1.3"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={styles.customInputUnit}>倍</Text>
                      <TouchableOpacity style={styles.customApplyBtn} onPress={handleApplyCustomMultiplier}>
                        <Text style={styles.customApplyBtnText}>適用</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {result.advice && (
                  <Text style={styles.adviceText}>💡 {result.advice}</Text>
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
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>📋 ログコピー</Text>
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

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-start' },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: Platform.OS === 'android' ? 40 : 50,
    marginHorizontal: 8,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.textMuted },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 12 },
  mealTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  mealTypeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  mealTypeBtnActive: { backgroundColor: '#4facfe22', borderColor: '#4facfe' },
  mealTypeBtnText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  mealTypeBtnTextActive: { color: '#4facfe' },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  analyzeBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  resultCard: { backgroundColor: colors.background, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  nutriItem: { width: '48%', backgroundColor: colors.card, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.border },
  nutriLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  nutriVal: { fontSize: 14, fontWeight: '700' },
  adviceText: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 12, backgroundColor: colors.card, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.border },
  portionBox: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  portionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  presetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  presetBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  presetBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  presetBtnText: { fontSize: 12, color: colors.textMuted },
  presetBtnTextActive: { color: '#fff', fontWeight: '700' },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customInputUnit: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  customApplyBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  customApplyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
