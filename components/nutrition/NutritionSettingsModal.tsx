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

export type SettingMode = 'cal_pfc' | 'pfc_p' | 'manual';

export default function NutritionSettingsModal({
  visible,
  onClose,
  userGoals,
  autophagyConfig,
  onSaveGoals,
  onSaveAutophagy,
}: Props) {
  // モード切替 ('cal_pfc' | 'pfc_p' | 'manual')
  const [settingMode, setSettingMode] = useState<SettingMode>('cal_pfc');

  // PFCバランス比率 (%)
  const [ratioP, setRatioP] = useState('20');
  const [ratioF, setRatioF] = useState('20');
  const [ratioC, setRatioC] = useState('60');

  // モード1用: 総カロリー
  const [mode1Calories, setMode1Calories] = useState('2000');

  // モード2用: P(g) 目標
  const [mode2Protein, setMode2Protein] = useState('104');

  // モード3用: 完全手動フォーム
  const [calories, setCalories] = useState(String(userGoals.calories || 2000));
  const [protein, setProtein] = useState(String(userGoals.protein || 60));
  const [fat, setFat] = useState(String(userGoals.fat || 55));
  const [carbs, setCarbs] = useState(String(userGoals.carbs || 250));

  // 共通
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

  useEffect(() => {
    if (visible) {
      setSettingMode(userGoals.setting_mode || 'cal_pfc');

      setRatioP(String(userGoals.pfc_ratio?.p ?? 20));
      setRatioF(String(userGoals.pfc_ratio?.f ?? 20));
      setRatioC(String(userGoals.pfc_ratio?.c ?? 60));

      const initialWeight = String(userGoals.weight ?? 65);
      const wVal = parseFloat(initialWeight) || 65;

      // モード2用P初期値: 体重 × 1.6
      setMode2Protein(String(Math.round(wVal * 1.6)));

      setCalories(String(userGoals.calories || 2000));
      setProtein(String(userGoals.protein || 60));
      setFat(String(userGoals.fat || 55));
      setCarbs(String(userGoals.carbs || 250));
      setSodium(String(userGoals.sodium || 7.5));
      setFiber(String(userGoals.fiber || 20));

      setGender(userGoals.gender || 'male');
      setAge(String(userGoals.age ?? 30));
      setHeight(String(userGoals.height ?? 170));
      setWeight(initialWeight);
      setActivityLevel(userGoals.activity_level || 'moderate');
      setGoalType((userGoals.goal_type as any) || 'maintain');

      // モード1用初期カロリー: BMR/TDEE電卓の推奨値または現状目標
      setMode1Calories(String(userGoals.calories || calculatedGoals.calories || 2000));

      setTargetHours(String(autophagyConfig.target_hours || 16));
      setAutophagyEnabled(!!autophagyConfig.enabled);
    }
  }, [visible, userGoals, autophagyConfig]);

  // モード1・モード2でのリアルタイムPFC/カロリー計算結果
  const computedModeValues = useMemo(() => {
    const pPct = parseFloat(ratioP) || 0;
    const fPct = parseFloat(ratioF) || 0;
    const cPct = parseFloat(ratioC) || 0;
    const ratioSum = pPct + fPct + cPct;

    let cal = 0;
    let pGramsRaw = 0;
    let fGramsRaw = 0;
    let cGramsRaw = 0;

    if (settingMode === 'cal_pfc') {
      // モード1: 総カロリー + PFCバランス
      cal = parseFloat(mode1Calories) || 0;
      pGramsRaw = cal > 0 && pPct > 0 ? (cal * (pPct / 100)) / 4 : 0;
      fGramsRaw = cal > 0 && fPct > 0 ? (cal * (fPct / 100)) / 9 : 0;
      cGramsRaw = cal > 0 && cPct > 0 ? (cal * (cPct / 100)) / 4 : 0;
    } else if (settingMode === 'pfc_p') {
      // モード2: PFCバランス + P(g)
      pGramsRaw = parseFloat(mode2Protein) || 0;
      const pCal = pGramsRaw * 4;
      cal = pPct > 0 ? Math.round(pCal / (pPct / 100)) : 0;
      fGramsRaw = cal > 0 && fPct > 0 ? (cal * (fPct / 100)) / 9 : 0;
      cGramsRaw = cal > 0 && cPct > 0 ? (cal * (cPct / 100)) / 4 : 0;
    } else {
      // モード3: 完全手動
      cal = parseFloat(calories) || 0;
      pGramsRaw = parseFloat(protein) || 0;
      fGramsRaw = parseFloat(fat) || 0;
      cGramsRaw = parseFloat(carbs) || 0;
    }

    // 各栄養素の配分カロリー
    const pCal = pGramsRaw * 4;
    const fCal = fGramsRaw * 9;
    const cCal = cGramsRaw * 4;

    // 表示用フォーマット (小数第1位または四捨五入整数)
    const formatDisplay = (val: number) => {
      if (val === 0) return '0';
      const rounded1 = Math.round(val * 10) / 10;
      return rounded1 % 1 === 0 ? rounded1.toFixed(0) : rounded1.toFixed(1);
    };

    return {
      calories: Math.round(cal),
      protein: Math.round(pGramsRaw),
      fat: Math.round(fGramsRaw),
      carbs: Math.round(cGramsRaw),
      proteinDisplay: formatDisplay(pGramsRaw),
      fatDisplay: formatDisplay(fGramsRaw),
      carbsDisplay: formatDisplay(cGramsRaw),
      proteinCalDisplay: formatDisplay(pCal),
      fatCalDisplay: formatDisplay(fCal),
      carbsCalDisplay: formatDisplay(cCal),
      ratioP: pPct,
      ratioF: fPct,
      ratioC: cPct,
      ratioSum: Math.round(ratioSum * 10) / 10,
    };
  }, [settingMode, ratioP, ratioF, ratioC, mode1Calories, mode2Protein, calories, protein, fat, carbs]);

  // 比率リセット (P20%, F20%, C60%)
  const handleResetRatio = () => {
    setRatioP('20');
    setRatioF('20');
    setRatioC('60');
  };

  // 比率調整 (+ / - ステップ)
  const adjustRatio = (setter: React.Dispatch<React.SetStateAction<string>>, currentVal: string, delta: number) => {
    const num = Math.max(0, (parseFloat(currentVal) || 0) + delta);
    setter(String(num));
  };

  // BMR/TDEE電卓からの反映ボタンを押した時
  const handleApplyCalculated = () => {
    setMode1Calories(String(calculatedGoals.calories));
    setCalories(String(calculatedGoals.calories));
    setProtein(String(calculatedGoals.protein));
    setFat(String(calculatedGoals.fat));
    setCarbs(String(calculatedGoals.carbs));
    setSodium(String(calculatedGoals.sodium));
    setFiber(String(calculatedGoals.fiber));

    // 体重からのP初期値も更新
    const w = parseFloat(weight) || 65;
    setMode2Protein(String(Math.round(w * 1.6)));

    Alert.alert('✅ 反映完了', '自動計算電卓で算出した目標値を各フォームに適用しました。');
  };

  const handleSave = async () => {
    // PFC比率合計の警告チェック (モード1, 2)
    if (settingMode !== 'manual' && Math.abs(computedModeValues.ratioSum - 100) > 0.1) {
      Alert.alert(
        '⚠️ 比率の確認',
        `PFCの合計比率が ${computedModeValues.ratioSum}% になっています。合計が100%になるように設定することを推奨します。このまま保存しますか？`,
        [
          { text: '修正する', style: 'cancel' },
          { text: 'このまま保存', onPress: () => executeSave() },
        ]
      );
      return;
    }

    await executeSave();
  };

  const executeSave = async () => {
    setIsSaving(true);
    try {
      const finalGoals: NutritionGoals = {
        calories: computedModeValues.calories,
        protein: computedModeValues.protein,
        fat: computedModeValues.fat,
        carbs: computedModeValues.carbs,
        sodium: parseFloat(sodium) || 7.5,
        fiber: parseFloat(fiber) || 20,
        gender,
        age: parseFloat(age) || 30,
        height: parseFloat(height) || 170,
        weight: parseFloat(weight) || 65,
        activity_level: activityLevel,
        goal_type: goalType,
        setting_mode: settingMode,
        pfc_ratio: {
          p: parseFloat(ratioP) || 20,
          f: parseFloat(ratioF) || 20,
          c: parseFloat(ratioC) || 60,
        },
      };

      await onSaveGoals(finalGoals);

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
                身体情報と運動強度から基礎代謝 (BMR) と総消費カロリー (TDEE) を算出し、最適な目標値を求めます。
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
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={(w) => {
                      setWeight(w);
                      const numW = parseFloat(w) || 65;
                      setMode2Protein(String(Math.round(numW * 1.6)));
                    }}
                  />
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
                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCalculated}>
                  <Text style={styles.applyBtnText}>✨ 計算結果を目標入力欄にセットする</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 🎯 PFCバランス設定・手動設定モード */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 PFCバランス設定</Text>

              {/* モード切替タブ */}
              <View style={styles.modeTabContainer}>
                {[
                  { key: 'cal_pfc', label: '① 総カロリー+PFC比' },
                  { key: 'pfc_p',   label: '② PFC比+P(g)量' },
                  { key: 'manual',  label: '③ 完全手動' },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.modeTabBtn, settingMode === tab.key && styles.modeTabBtnActive]}
                    onPress={() => setSettingMode(tab.key as SettingMode)}
                  >
                    <Text style={[styles.modeTabBtnText, settingMode === tab.key && styles.modeTabBtnTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ===== モード 1: 総カロリー ＋ PFCバランス ===== */}
              {settingMode === 'cal_pfc' && (
                <View style={styles.modeSection}>
                  <Text style={styles.inputLabelCol}>目標総カロリー (kcal)</Text>
                  <View style={styles.rowAlign}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      keyboardType="numeric"
                      value={mode1Calories}
                      onChangeText={setMode1Calories}
                      placeholder="2000"
                      placeholderTextColor="#475569"
                    />
                    <TouchableOpacity
                      style={styles.subActionBtn}
                      onPress={() => setMode1Calories(String(calculatedGoals.calories))}
                    >
                      <Text style={styles.subActionBtnText}>電卓値をセット</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 比率コントロール */}
                  <Text style={styles.label}>PFCバランス比率 (%)</Text>
                  <View style={styles.grid3}>
                    {/* P */}
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#38bdf8' }]}>P (タンパク質 %)</Text>
                      <View style={styles.adjustInputRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioP, ratioP, -1)}>
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput style={styles.inputStep} keyboardType="numeric" value={ratioP} onChangeText={setRatioP} />
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioP, ratioP, 1)}>
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* F */}
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#f59e0b' }]}>F (脂質 %)</Text>
                      <View style={styles.adjustInputRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioF, ratioF, -1)}>
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput style={styles.inputStep} keyboardType="numeric" value={ratioF} onChangeText={setRatioF} />
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioF, ratioF, 1)}>
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* C */}
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#a855f7' }]}>C (炭水化物 %)</Text>
                      <View style={styles.adjustInputRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioC, ratioC, -1)}>
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput style={styles.inputStep} keyboardType="numeric" value={ratioC} onChangeText={setRatioC} />
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioC, ratioC, 1)}>
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* 塩分・食物繊維 */}
                  <View style={[styles.grid2, { marginTop: 12 }]}>
                    <View style={styles.col2}>
                      <Text style={[styles.inputLabel, { color: '#f43f5e' }]}>塩分相当量 (g)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={sodium} onChangeText={setSodium} />
                    </View>
                    <View style={styles.col2}>
                      <Text style={[styles.inputLabel, { color: '#84cc16' }]}>食物繊維 (g)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={fiber} onChangeText={setFiber} />
                    </View>
                  </View>
                </View>
              )}

              {/* ===== モード 2: PFCバランス ＋ P(g)目標量 ===== */}
              {settingMode === 'pfc_p' && (
                <View style={styles.modeSection}>
                  <Text style={styles.inputLabelCol}>タンパク質目標量 P (g)</Text>
                  <View style={styles.rowAlign}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      keyboardType="numeric"
                      value={mode2Protein}
                      onChangeText={setMode2Protein}
                      placeholder="104"
                      placeholderTextColor="#475569"
                    />
                    <TouchableOpacity
                      style={styles.subActionBtn}
                      onPress={() => {
                        const w = parseFloat(weight) || 65;
                        setMode2Protein(String(Math.round(w * 1.6)));
                      }}
                    >
                      <Text style={styles.subActionBtnText}>体重×1.6gをセット</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 比率コントロール */}
                  <Text style={styles.label}>PFCバランス比率 (%)</Text>
                  <View style={styles.grid3}>
                    {/* P */}
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#38bdf8' }]}>P (タンパク質 %)</Text>
                      <View style={styles.adjustInputRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioP, ratioP, -1)}>
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput style={styles.inputStep} keyboardType="numeric" value={ratioP} onChangeText={setRatioP} />
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioP, ratioP, 1)}>
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* F */}
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#f59e0b' }]}>F (脂質 %)</Text>
                      <View style={styles.adjustInputRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioF, ratioF, -1)}>
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput style={styles.inputStep} keyboardType="numeric" value={ratioF} onChangeText={setRatioF} />
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioF, ratioF, 1)}>
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* C */}
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#a855f7' }]}>C (炭水化物 %)</Text>
                      <View style={styles.adjustInputRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioC, ratioC, -1)}>
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput style={styles.inputStep} keyboardType="numeric" value={ratioC} onChangeText={setRatioC} />
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustRatio(setRatioC, ratioC, 1)}>
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* 塩分・食物繊維 */}
                  <View style={[styles.grid2, { marginTop: 12 }]}>
                    <View style={styles.col2}>
                      <Text style={[styles.inputLabel, { color: '#f43f5e' }]}>塩分相当量 (g)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={sodium} onChangeText={setSodium} />
                    </View>
                    <View style={styles.col2}>
                      <Text style={[styles.inputLabel, { color: '#84cc16' }]}>食物繊維 (g)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={fiber} onChangeText={setFiber} />
                    </View>
                  </View>
                </View>
              )}

              {/* ===== モード 3: 完全手動 ===== */}
              {settingMode === 'manual' && (
                <View style={styles.modeSection}>
                  <Text style={styles.hintText}>
                    目標カロリーおよび各PFC数値をそれぞれ直接編集して個別に設定します。
                  </Text>
                  <View style={styles.grid2}>
                    {[
                      { label: '目標カロリー (kcal)', val: calories, setter: setCalories, color: '#10b981' },
                      { label: 'タンパク質 (g)',     val: protein,  setter: setProtein,  color: '#38bdf8' },
                      { label: '脂質 (g)',           val: fat,      setter: setFat,      color: '#f59e0b' },
                      { label: '炭水化物 (g)',       val: carbs,    setter: setCarbs,    color: '#a855f7' },
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

                  {/* 塩分・食物繊維 */}
                  <View style={[styles.grid2, { marginTop: 12 }]}>
                    <View style={styles.col2}>
                      <Text style={[styles.inputLabel, { color: '#f43f5e' }]}>塩分相当量 (g)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={sodium} onChangeText={setSodium} />
                    </View>
                    <View style={styles.col2}>
                      <Text style={[styles.inputLabel, { color: '#84cc16' }]}>食物繊維 (g)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={fiber} onChangeText={setFiber} />
                    </View>
                  </View>
                </View>
              )}

              {/* 🌟 1. 中部：合計比率 ＆ リセットボタン ＆ アナウンス */}
              {settingMode !== 'manual' && (
                <View style={[styles.pfcFooterCard, { marginTop: 12 }]}>
                  <View style={styles.pfcFooterTopRow}>
                    <Text style={styles.pfcTotalLabel}>
                      合計 <Text style={[
                        styles.pfcTotalVal,
                        computedModeValues.ratioSum === 100 ? styles.pfcTotalOk : styles.pfcTotalWarn
                      ]}>{computedModeValues.ratioSum}%</Text>
                    </Text>

                    <TouchableOpacity style={styles.resetRatioBtn} onPress={handleResetRatio}>
                      <Text style={styles.resetRatioBtnText}>リセット</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.pfcNoticeText}>
                    {computedModeValues.ratioSum === 100
                      ? '✅ PFC比率の合計が100%になっています。'
                      : '⚠️ PFC比率の合計は100%にしてください。'}
                  </Text>
                  <Text style={styles.pfcSubNoticeText}>
                    💡 厚生労働省の「日本人の食事摂取基準」に沿ったバランス（P13-20% / F20-30% / C50-65%）を推奨します。
                  </Text>
                </View>
              )}

              {/* 🌟 2. 下部：リアルタイムグラム数 ＆ 配分カロリー内訳カード（計算結果カード） */}
              <View style={[styles.pfcDisplayHeroCard, { marginTop: 12 }]}>
                <Text style={styles.heroCalText}>
                  目標総カロリー: <Text style={styles.heroCalVal}>{computedModeValues.calories}</Text> kcal
                </Text>

                <View style={styles.heroGramGrid}>
                  {/* P */}
                  <View style={styles.heroGramCol}>
                    <Text style={styles.heroGramLabel}>たんぱく質(P)</Text>
                    <Text style={[styles.heroGramVal, { color: '#38bdf8' }]}>
                      {computedModeValues.proteinDisplay}<Text style={styles.heroGramUnit}>g</Text>
                    </Text>
                    <Text style={styles.heroCalSubText}>
                      ({computedModeValues.proteinCalDisplay} kcal)
                    </Text>
                  </View>

                  {/* F */}
                  <View style={styles.heroGramCol}>
                    <Text style={styles.heroGramLabel}>脂質(F)</Text>
                    <Text style={[styles.heroGramVal, { color: '#f59e0b' }]}>
                      {computedModeValues.fatDisplay}<Text style={styles.heroGramUnit}>g</Text>
                    </Text>
                    <Text style={styles.heroCalSubText}>
                      ({computedModeValues.fatCalDisplay} kcal)
                    </Text>
                  </View>

                  {/* C */}
                  <View style={styles.heroGramCol}>
                    <Text style={styles.heroGramLabel}>炭水化物(C)</Text>
                    <Text style={[styles.heroGramVal, { color: '#a855f7' }]}>
                      {computedModeValues.carbsDisplay}<Text style={styles.heroGramUnit}>g</Text>
                    </Text>
                    <Text style={styles.heroCalSubText}>
                      ({computedModeValues.carbsCalDisplay} kcal)
                    </Text>
                  </View>
                </View>

                {/* 💡 カロリー密度補足注記 */}
                <View style={styles.calExplanationBox}>
                  <Text style={styles.calExplanationText}>
                    💡 <Text style={{ fontWeight: '700', color: '#f8fafc' }}>カロリー比率のポイント:</Text> P・Cは <Text style={{ color: '#38bdf8', fontWeight: '700' }}>1g=4kcal</Text>、Fは <Text style={{ color: '#f59e0b', fontWeight: '700' }}>1g=9kcal</Text> で計算されます。
                  </Text>
                </View>
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
  inputLabelCol: { fontSize: 12, fontWeight: '600', color: '#10b981', marginTop: 10, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rowAlign: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chipBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  chipBtnActive: { backgroundColor: '#10b98122', borderColor: '#10b981' },
  chipBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  chipBtnTextActive: { color: '#10b981' },
  chipList: { gap: 6 },
  longChip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  longChipActive: { backgroundColor: '#4facfe22', borderColor: '#4facfe' },
  longChipText: { fontSize: 12, color: '#94a3b8' },
  longChipTextActive: { color: '#4facfe', fontWeight: '700' },
  grid3: { flexDirection: 'row', gap: 6 },
  col3: { flex: 1 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  col2: { width: '48%' },
  input: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  calcResultBox: { marginTop: 12, backgroundColor: '#0f172a', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#10b98144' },
  calcHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  calcStat: { fontSize: 12, color: '#94a3b8' },
  calcVal: { color: '#38bdf8', fontWeight: '700' },
  calcMainGoal: { fontSize: 14, fontWeight: '700', color: '#f8fafc', marginVertical: 2, marginBottom: 8 },
  calcMainVal: { color: '#10b981', fontSize: 18 },
  applyBtn: { backgroundColor: '#10b981', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* モード切替タブスタイル */
  modeTabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 10, padding: 3, marginBottom: 12 },
  modeTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  modeTabBtnActive: { backgroundColor: '#10b981' },
  modeTabBtnText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  modeTabBtnTextActive: { color: '#ffffff', fontWeight: '700' },

  /* 🌟 大型リアルタイム表示カード（カロリー内訳＆バッジ追加版） */
  pfcDisplayHeroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10b98144',
    alignItems: 'center',
  },
  heroCalText: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 8 },
  heroCalVal: { color: '#10b981', fontSize: 16, fontWeight: '700' },
  heroGramGrid: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingTop: 4 },
  heroGramCol: { alignItems: 'center', flex: 1 },
  heroGramLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 2 },
  heroGramVal: { fontSize: 19, fontWeight: '800' },
  heroGramUnit: { fontSize: 12, fontWeight: '600' },
  heroCalSubText: { fontSize: 10, color: '#94a3b8', marginTop: 1, fontWeight: '600' },
  pctBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  pctBadgeText: { fontSize: 10, fontWeight: '700' },

  calExplanationBox: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1e293b', width: '100%' },
  calExplanationText: { fontSize: 10.5, color: '#94a3b8', lineHeight: 15 },

  modeSection: { marginTop: 4 },
  subActionBtn: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  subActionBtnText: { fontSize: 11, color: '#38bdf8', fontWeight: '600' },

  /* 比率ステップ調整付き入力ボックス */
  adjustInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  stepBtn: { width: 28, height: 36, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  stepBtnText: { fontSize: 16, fontWeight: '700', color: '#38bdf8' },
  inputStep: { flex: 1, textAlign: 'center', color: '#f8fafc', fontSize: 14, fontWeight: '600', paddingVertical: 6 },

  /* 下部合計・リセットカード */
  pfcFooterCard: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  pfcFooterTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pfcTotalLabel: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
  pfcTotalVal: { fontSize: 18, fontWeight: '800' },
  pfcTotalOk: { color: '#10b981' },
  pfcTotalWarn: { color: '#f59e0b' },
  resetRatioBtn: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#38bdf8', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  resetRatioBtnText: { fontSize: 12, fontWeight: '700', color: '#38bdf8' },
  pfcNoticeText: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 4 },
  pfcSubNoticeText: { fontSize: 11, color: '#64748b', lineHeight: 16 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#f8fafc' },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
