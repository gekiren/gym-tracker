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

    if (settingMode === 'cal_pfc') {
      // モード1: 総カロリー + PFCバランス
      const targetCal = parseFloat(mode1Calories) || 0;
      const calcP = targetCal > 0 && pPct > 0 ? Math.round((targetCal * (pPct / 100)) / 4) : 0;
      const calcF = targetCal > 0 && fPct > 0 ? Math.round((targetCal * (fPct / 100)) / 9) : 0;
      const calcC = targetCal > 0 && cPct > 0 ? Math.round((targetCal * (cPct / 100)) / 4) : 0;
      return {
        calories: targetCal,
        protein: calcP,
        fat: calcF,
        carbs: calcC,
        ratioSum,
      };
    } else if (settingMode === 'pfc_p') {
      // モード2: PFCバランス + P(g)
      const pGram = parseFloat(mode2Protein) || 0;
      const pCal = pGram * 4;
      const calcCal = pPct > 0 ? Math.round(pCal / (pPct / 100)) : 0;
      const calcF = calcCal > 0 && fPct > 0 ? Math.round((calcCal * (fPct / 100)) / 9) : 0;
      const calcC = calcCal > 0 && cPct > 0 ? Math.round((calcCal * (cPct / 100)) / 4) : 0;
      return {
        calories: calcCal,
        protein: pGram,
        fat: calcF,
        carbs: calcC,
        ratioSum,
      };
    } else {
      // モード3: 完全手動
      return {
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbs: parseFloat(carbs) || 0,
        ratioSum: 100,
      };
    }
  }, [settingMode, ratioP, ratioF, ratioC, mode1Calories, mode2Protein, calories, protein, fat, carbs]);

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

            {/* 🎯 手動設定モード切替セクション */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 栄養目標の手動設定</Text>

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
                  <Text style={styles.hintText}>
                    総カロリーとPFCの割合(%)を指定して、各マクロ栄養素の目標(g)を自動計算します。（初期比率: P20% / F20% / C60%）
                  </Text>

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

                  <Text style={styles.label}>PFCバランス比率 (%)</Text>
                  <View style={styles.grid3}>
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#06b6d4' }]}>P (タンパク質 %)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={ratioP} onChangeText={setRatioP} />
                    </View>
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#f59e0b' }]}>F (脂質 %)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={ratioF} onChangeText={setRatioF} />
                    </View>
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#a855f7' }]}>C (炭水化物 %)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={ratioC} onChangeText={setRatioC} />
                    </View>
                  </View>
                  <Text style={[
                    styles.sumRatioText,
                    computedModeValues.ratioSum === 100 ? styles.sumRatioOk : styles.sumRatioWarn
                  ]}>
                    比率合計: {computedModeValues.ratioSum}% {computedModeValues.ratioSum === 100 ? '✅ 100%' : '⚠️ (100%になるよう調整してください)'}
                  </Text>
                </View>
              )}

              {/* ===== モード 2: PFCバランス ＋ P(g)目標量 ===== */}
              {settingMode === 'pfc_p' && (
                <View style={styles.modeSection}>
                  <Text style={styles.hintText}>
                    指定したPFC比率とタンパク質目標量 P(g) から、必要総カロリーおよび F(g), C(g) を自動設定します。（初期値: 体重×1.6g）
                  </Text>

                  <Text style={styles.label}>PFCバランス比率 (%)</Text>
                  <View style={styles.grid3}>
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#06b6d4' }]}>P (タンパク質 %)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={ratioP} onChangeText={setRatioP} />
                    </View>
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#f59e0b' }]}>F (脂質 %)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={ratioF} onChangeText={setRatioF} />
                    </View>
                    <View style={styles.col3}>
                      <Text style={[styles.inputLabel, { color: '#a855f7' }]}>C (炭水化物 %)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" value={ratioC} onChangeText={setRatioC} />
                    </View>
                  </View>
                  <Text style={[
                    styles.sumRatioText,
                    computedModeValues.ratioSum === 100 ? styles.sumRatioOk : styles.sumRatioWarn
                  ]}>
                    比率合計: {computedModeValues.ratioSum}% {computedModeValues.ratioSum === 100 ? '✅ 100%' : '⚠️ (100%になるよう調整してください)'}
                  </Text>

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
                      { label: 'タンパク質 (g)',     val: protein,  setter: setProtein,  color: '#06b6d4' },
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
                </View>
              )}

              {/* 💡 リアルタイム算出プレビュー（モード1・モード2用） */}
              {settingMode !== 'manual' && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>💡 算出される設定目標値</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewCal}>
                      総カロリー: <Text style={styles.previewCalVal}>{computedModeValues.calories}</Text> kcal
                    </Text>
                  </View>
                  <View style={styles.previewPfcRow}>
                    <Text style={[styles.previewPfcItem, { color: '#06b6d4' }]}>
                      P: {computedModeValues.protein}g
                    </Text>
                    <Text style={[styles.previewPfcItem, { color: '#f59e0b' }]}>
                      F: {computedModeValues.fat}g
                    </Text>
                    <Text style={[styles.previewPfcItem, { color: '#a855f7' }]}>
                      C: {computedModeValues.carbs}g
                    </Text>
                  </View>
                </View>
              )}

              {/* 塩分・食物繊維（全モード共通） */}
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
  grid3: { flexDirection: 'row', gap: 8 },
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
  modeTabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 10, padding: 3, marginBottom: 10 },
  modeTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  modeTabBtnActive: { backgroundColor: '#10b981' },
  modeTabBtnText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  modeTabBtnTextActive: { color: '#ffffff', fontWeight: '700' },

  modeSection: { marginTop: 4 },
  subActionBtn: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  subActionBtnText: { fontSize: 11, color: '#38bdf8', fontWeight: '600' },
  sumRatioText: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  sumRatioOk: { color: '#10b981' },
  sumRatioWarn: { color: '#f59e0b' },

  /* プレビューボックス */
  previewBox: { marginTop: 12, backgroundColor: '#0f172a', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#38bdf844' },
  previewTitle: { fontSize: 12, fontWeight: '700', color: '#38bdf8', marginBottom: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewCal: { fontSize: 13, color: '#f8fafc', fontWeight: '600' },
  previewCalVal: { color: '#10b981', fontSize: 16, fontWeight: '700' },
  previewPfcRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  previewPfcItem: { fontSize: 12, fontWeight: '700' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#f8fafc' },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
