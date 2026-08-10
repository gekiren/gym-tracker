import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NutritionGoals, AutophagyConfig } from '../../src/db/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  userGoals: NutritionGoals;
  autophagyConfig: AutophagyConfig;
  onSaveGoals: (goals: NutritionGoals) => Promise<void>;
  onSaveAutophagy: (config: AutophagyConfig) => Promise<void>;
}

export default function NutritionSettingsModal({
  visible,
  onClose,
  userGoals,
  autophagyConfig,
  onSaveGoals,
  onSaveAutophagy,
}: Props) {
  // 手動目標フォーム
  const [calories, setCalories] = useState(String(userGoals.calories || 2000));
  const [protein, setProtein] = useState(String(userGoals.protein || 60));
  const [fat, setFat] = useState(String(userGoals.fat || 55));
  const [carbs, setCarbs] = useState(String(userGoals.carbs || 250));
  const [sodium, setSodium] = useState(String(userGoals.sodium || 7.5));
  const [fiber, setFiber] = useState(String(userGoals.fiber || 20));

  // オートファジーフォーム
  const [targetHours, setTargetHours] = useState(String(autophagyConfig.target_hours || 16));
  const [autophagyEnabled, setAutophagyEnabled] = useState(!!autophagyConfig.enabled);

  // BMR / TDEE 計算用フォーム
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('30');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'>('moderate');
  const [goalType, setGoalType] = useState<'cut' | 'maintain' | 'bulk'>('maintain');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCalories(String(userGoals.calories || 2000));
      setProtein(String(userGoals.protein || 60));
      setFat(String(userGoals.fat || 55));
      setCarbs(String(userGoals.carbs || 250));
      setSodium(String(userGoals.sodium || 7.5));
      setFiber(String(userGoals.fiber || 20));

      setTargetHours(String(autophagyConfig.target_hours || 16));
      setAutophagyEnabled(!!autophagyConfig.enabled);
    }
  }, [visible, userGoals, autophagyConfig]);

  // Mifflin-St Jeor 式による BMR & TDEE 計算
  const calculatedGoals = useMemo(() => {
    const a = parseFloat(age) || 30;
    const h = parseFloat(height) || 170;
    const w = parseFloat(weight) || 65;

    // BMR計算
    let bmr = 10 * w + 6.25 * h - 5 * a + (gender === 'male' ? 5 : -161);
    bmr = Math.round(bmr);

    // 活動レベルマルチプライヤー
    const mults = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
    };
    const tdee = Math.round(bmr * mults[activityLevel]);

    // 目的別エネルギー計算
    let targetCal = tdee;
    if (goalType === 'cut') targetCal = Math.round(tdee * 0.85); // 15%カット
    if (goalType === 'bulk') targetCal = Math.round(tdee * 1.10); // 10%プラス

    // 推奨PFC (P: 2.0g/kg, F: カロリーの25%, C: 残り)
    const calcP = Math.round(w * 2.0);
    const calcF = Math.round((targetCal * 0.25) / 9);
    const remCalForC = targetCal - (calcP * 4 + calcF * 9);
    const calcC = Math.max(50, Math.round(remCalForC / 4));

    return {
      bmr,
      tdee,
      calories: targetCal,
      protein: calcP,
      fat: calcF,
      carbs: calcC,
      sodium: 7.0,
      fiber: 21,
    };
  }, [gender, age, height, weight, activityLevel, goalType]);

  const handleApplyCalculated = () => {
    setCalories(String(calculatedGoals.calories));
    setProtein(String(calculatedGoals.protein));
    setFat(String(calculatedGoals.fat));
    setCarbs(String(calculatedGoals.carbs));
    setSodium(String(calculatedGoals.sodium));
    setFiber(String(calculatedGoals.fiber));
    Alert.alert('✅ 反映完了', '電卓で計算された目標値（カロリー・PFC・塩分・食物繊維）をフォームに自動入力しました。');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveGoals({
        calories: parseFloat(calories) || 2000,
        protein: parseFloat(protein) || 60,
        fat: parseFloat(fat) || 55,
        carbs: parseFloat(carbs) || 250,
        sodium: parseFloat(sodium) || 7.5,
        fiber: parseFloat(fiber) || 20,
      });

      await onSaveAutophagy({
        ...autophagyConfig,
        enabled: autophagyEnabled,
        target_hours: parseFloat(targetHours) || 16,
      });

      onClose();
    } catch {
      Alert.alert('保存エラー', '設定の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>⚙️ 栄養目標 ＆ タイマー設定</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* BMR / TDEE 自動計算電卓 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🧮 BMR / TDEE 目標自動計算電卓</Text>
              <Text style={styles.hintText}>
                身体情報と運動強度から基礎代謝 (BMR) と総消費カロリー (TDEE) を算出し、最適なPFCバランスを自動計算します。
              </Text>

              <Text style={styles.label}>性別</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.chipBtn, gender === 'male' && styles.chipBtnActive]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.chipBtnText, gender === 'male' && styles.chipBtnTextActive]}>👨 男性</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chipBtn, gender === 'female' && styles.chipBtnActive]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.chipBtnText, gender === 'female' && styles.chipBtnTextActive]}>👩 女性</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.grid3}>
                <View style={styles.col3}>
                  <Text style={styles.label}>年齢</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} />
                </View>
                <View style={styles.col3}>
                  <Text style={styles.label}>身長(cm)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={height} onChangeText={setHeight} />
                </View>
                <View style={styles.col3}>
                  <Text style={styles.label}>体重(kg)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} />
                </View>
              </View>

              <Text style={styles.label}>日常生活の活動レベル</Text>
              <View style={styles.chipList}>
                {[
                  { key: 'sedentary', label: 'ほぼ運動しない (デスクワーク)' },
                  { key: 'light',     label: '軽い運動 / 立ち仕事 (週1-3日)' },
                  { key: 'moderate',  label: '適度な運動 (週3-5日)' },
                  { key: 'active',    label: '活発な運動 (週6-7日)' },
                ].map((act) => (
                  <TouchableOpacity
                    key={act.key}
                    style={[styles.longChip, activityLevel === act.key && styles.longChipActive]}
                    onPress={() => setActivityLevel(act.key as any)}
                  >
                    <Text style={[styles.longChipText, activityLevel === act.key && styles.longChipTextActive]}>
                      {act.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>目的・ターゲット</Text>
              <View style={styles.row}>
                {[
                  { key: 'cut',      label: '🔥 減量 (-15%)' },
                  { key: 'maintain', label: '⚖️ 維持 (0%)' },
                  { key: 'bulk',     label: '💪 増量 (+10%)' },
                ].map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.chipBtn, goalType === g.key && styles.chipBtnActive]}
                    onPress={() => setGoalType(g.key as any)}
                  >
                    <Text style={[styles.chipBtnText, goalType === g.key && styles.chipBtnTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 計算結果カード */}
              <View style={styles.calcResultBox}>
                <View style={styles.calcHeaderRow}>
                  <Text style={styles.calcStat}>BMR: <Text style={styles.calcVal}>{calculatedGoals.bmr}</Text> kcal</Text>
                  <Text style={styles.calcStat}>TDEE: <Text style={styles.calcVal}>{calculatedGoals.tdee}</Text> kcal</Text>
                </View>
                <Text style={styles.calcMainGoal}>
                  推奨目標: <Text style={styles.calcMainVal}>{calculatedGoals.calories}</Text> kcal/日
                </Text>
                <Text style={styles.calcSubText}>
                  P: {calculatedGoals.protein}g | F: {calculatedGoals.fat}g | C: {calculatedGoals.carbs}g
                </Text>
                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCalculated}>
                  <Text style={styles.applyBtnText}>✨ 計算結果を目標入力欄に反映する</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 1日の目標摂取量直接設定 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 1日の目標摂取量 (直接編集)</Text>
              <View style={styles.grid2}>
                {[
                  { label: '目標カロリー (kcal)', val: calories, setter: setCalories, color: '#10b981' },
                  { label: 'タンパク質 (g)',     val: protein,  setter: setProtein,  color: '#06b6d4' },
                  { label: '脂質 (g)',           val: fat,      setter: setFat,      color: '#f59e0b' },
                  { label: '炭水化物 (g)',       val: carbs,    setter: setCarbs,    color: '#a855f7' },
                  { label: '塩分相当量 (g)',     val: sodium,   setter: setSodium,   color: '#f43f5e' },
                  { label: '食物繊維 (g)',       val: fiber,    setter: setFiber,    color: '#84cc16' },
                ].map((item) => (
                  <View key={item.label} style={styles.col2}>
                    <Text style={[styles.inputLabel, { color: item.color }]}>{item.label}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={item.val}
                      onChangeText={item.setter}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* オートファジー目標時間・有効無効 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⏳ オートファジー絶食タイマー設定</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>オートファジー機能を有効化</Text>
                <Switch
                  value={autophagyEnabled}
                  onValueChange={setAutophagyEnabled}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={styles.label}>目標絶食時間 (時間)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targetHours}
                onChangeText={setTargetHours}
                placeholder="16"
                placeholderTextColor="#475569"
              />
            </View>

            {/* 保存ボタン */}
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveBtnText}>💾 設定を保存して更新</Text>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
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
  title: { fontSize: 17, fontWeight: '700', color: '#f8fafc' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },
  body: { padding: 14 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#f8fafc', marginBottom: 6 },
  hintText: { fontSize: 12, color: '#94a3b8', lineHeight: 18, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 8, marginBottom: 4 },
  inputLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chipBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  chipBtnActive: { backgroundColor: '#10b98122', borderColor: '#10b981' },
  chipBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  chipBtnTextActive: { color: '#10b981' },
  chipList: { gap: 6 },
  longChip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  longChipActive: { backgroundColor: '#4facfe22', borderColor: '#4facfe' },
  longChipText: { fontSize: 12, color: '#94a3b8' },
  longChipTextActive: { color: '#4facfe', fontWeight: '700' },
  grid3: { flexDirection: 'row', gap: 8 },
  col3: { flex: 1 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  col2: { width: '48%' },
  input: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  calcResultBox: { marginTop: 12, backgroundColor: '#0f172a', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#10b98144' },
  calcHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  calcStat: { fontSize: 12, color: '#94a3b8' },
  calcVal: { color: '#38bdf8', fontWeight: '700' },
  calcMainGoal: { fontSize: 14, fontWeight: '700', color: '#f8fafc', marginVertical: 2 },
  calcMainVal: { color: '#10b981', fontSize: 18 },
  calcSubText: { fontSize: 11, color: '#94a3b8', marginBottom: 10 },
  applyBtn: { backgroundColor: '#10b981', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#f8fafc' },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
