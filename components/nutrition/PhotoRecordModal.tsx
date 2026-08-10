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
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  NativeModules,
} from 'react-native';

// ネイティブモジュール不在による画面遷移クラッシュを防ぐため NativeModules チェックを厳格化
const safeGetImagePicker = () => {
  try {
    const hasNative = NativeModules.ExponentImagePicker || NativeModules.ExpoImagePicker;
    if (!hasNative) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-image-picker') as typeof import('expo-image-picker');
  } catch {
    return null;
  }
};

const safeGetImageManipulator = () => {
  try {
    const hasNative = NativeModules.ExponentImageManipulator || NativeModules.ExpoImageManipulator;
    if (!hasNative) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-image-manipulator') as typeof import('expo-image-manipulator');
  } catch {
    return null;
  }
};

import { analyzeMealImage, analyzeMealText, NutritionAIResult } from '../../src/services/aiCoachService';
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

export default function PhotoRecordModal({ visible, onClose, onSave, selectedDate }: Props) {
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [userMemo, setUserMemo] = useState('');
  const [mealType, setMealType] = useState<string>('dinner');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<NutritionAIResult | null>(null);

  // 編集用数値フィールド
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [sodium, setSodium] = useState('');
  const [fiber, setFiber] = useState('');
  const [multiplier, setMultiplier] = useState(1.0);
  const [isSaving, setIsSaving] = useState(false);

  const isImagePickerAvailable = safeGetImagePicker() !== null;

  const resetAll = () => {
    setSelectedImageUri(null);
    setBase64Data(null);
    setUserMemo('');
    setAiResult(null);
    setMealName('');
    setCalories('');
    setProtein('');
    setFat('');
    setCarbs('');
    setSodium('');
    setFiber('');
    setMultiplier(1.0);
    setMealType('dinner');
  };

  const handleClose = () => {
    if (isAnalyzing || isSaving) return;
    resetAll();
    onClose();
  };

  // 画像圧縮＆Base64変換
  const processImage = async (uri: string) => {
    const ImageManipulator = safeGetImageManipulator();
    if (!ImageManipulator) {
      Alert.alert('機能制限', '画像処理モジュールはこのビルドでは利用できません。');
      return;
    }
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      setSelectedImageUri(manipResult.uri);
      const b64 = manipResult.base64 ? `data:image/jpeg;base64,${manipResult.base64}` : null;
      setBase64Data(b64);
      if (b64) {
        await runAnalysis(b64);
      }
    } catch (err: any) {
      Alert.alert('画像処理エラー', '画像の読み込みに失敗しました。');
    }
  };

  // カメラで撮影
  const handleTakePhoto = async () => {
    const ImagePicker = safeGetImagePicker();
    if (!ImagePicker) {
      Alert.alert('機能制限', 'カメラ機能はこのビルドでは利用できません。最新のNative APKを更新してください。');
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('権限エラー', 'カメラの使用を許可してください。');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        await processImage(res.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('カメラエラー', err?.message || 'カメラの起動に失敗しました。');
    }
  };

  // ギャラリーから選択
  const handleSelectImage = async () => {
    const ImagePicker = safeGetImagePicker();
    if (!ImagePicker) {
      Alert.alert('機能制限', 'ギャラリー機能はこのビルドでは利用できません。最新のNative APKを更新してください。');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('権限エラー', '写真へのアクセスを許可してください。');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        await processImage(res.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('ギャラリーエラー', err?.message || 'ギャラリーの起動に失敗しました。');
    }
  };

  // AI解析の実行 (画像)
  const runAnalysis = async (b64: string) => {
    setIsAnalyzing(true);
    setAiResult(null);
    try {
      const res = await analyzeMealImage(b64, '', userMemo, 'gemini');
      setAiResult(res);
      setMealName(res.mealName);
      applyMultiplier(res, multiplier);
    } catch (err: any) {
      Alert.alert('AI解析エラー', err.message || '食事写真の解析に失敗しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI解析の実行 (テキストのみ)
  const runTextAnalysis = async () => {
    const textQuery = userMemo.trim() || mealName.trim();
    if (!textQuery) {
      Alert.alert('入力案内', '「料理名」または「メモ欄」に食事内容（例: 焼肉定食とウーロン茶）を入力してください。');
      return;
    }
    setIsAnalyzing(true);
    setAiResult(null);
    try {
      const res = await analyzeMealText(textQuery, 'gemini');
      setAiResult(res);
      setMealName(res.mealName);
      applyMultiplier(res, multiplier);
    } catch (err: any) {
      Alert.alert('AIテキスト解析エラー', err.message || 'テキストからの食事解析に失敗しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 倍率変更の反映
  const applyMultiplier = (res: NutritionAIResult, mult: number) => {
    setCalories(String(Math.round(res.calories * mult)));
    setProtein(String((res.protein * mult).toFixed(1)));
    setFat(String((res.fat * mult).toFixed(1)));
    setCarbs(String((res.carbs * mult).toFixed(1)));
    setSodium(String((res.sodium * mult).toFixed(1)));
    setFiber(String((res.fiber * mult).toFixed(1)));
  };

  const handleMultiplierChange = (m: number) => {
    setMultiplier(m);
    if (aiResult) {
      applyMultiplier(aiResult, m);
    }
  };

  const handleSave = async () => {
    if (!mealName.trim()) {
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
        name: mealName.trim(),
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbs: parseFloat(carbs) || 0,
        sodium: parseFloat(sodium) || 0,
        fiber: parseFloat(fiber) || 0,
        photo_url: selectedImageUri || undefined,
        memo: aiResult?.advice || userMemo || undefined,
        created_at: now.getTime(),
      });
      resetAll();
      onClose();
    } catch {
      Alert.alert('保存エラー', 'ログの保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView style={styles.sheetContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>📷 写真・AIから食事記録</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* モジュール不在時の案内バナー */}
            {!isImagePickerAvailable && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningBannerTitle}>⚠️ カメラ非対応ビルド環境</Text>
                <Text style={styles.warningBannerText}>
                  お使いのアプリはJSアップデートのみが適用された環境です。写真撮影には最新のNative APKの更新が必要です。
                  下記のメモ・料理名から「✍️ テキストでAI解析」または直接手動入力をご利用いただけます。
                </Text>
              </View>
            )}

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

            {/* 補足メモ */}
            <Text style={styles.label}>食事内容メモ（例: カツカレー大盛り、スープ半分残した）</Text>
            <TextInput
              style={styles.memoInput}
              value={userMemo}
              onChangeText={setUserMemo}
              placeholder="例: サラダチキン1個、おにぎり1個"
              placeholderTextColor="#475569"
            />

            {/* 写真選択/撮影ボタン & プレビュー */}
            {selectedImageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.rePickRow}>
                  <TouchableOpacity style={styles.rePickBtn} onPress={handleTakePhoto}>
                    <Text style={styles.rePickBtnText}>📸 再撮影</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rePickBtn} onPress={handleSelectImage}>
                    <Text style={styles.rePickBtnText}>🖼️ 別の写真</Text>
                  </TouchableOpacity>
                  {base64Data && (
                    <TouchableOpacity
                      style={[styles.rePickBtn, styles.reAnalyzeBtn]}
                      onPress={() => runAnalysis(base64Data)}
                      disabled={isAnalyzing}
                    >
                      <Text style={styles.reAnalyzeBtnText}>🔄 再解析</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.pickBox}>
                {isImagePickerAvailable && (
                  <>
                    <TouchableOpacity style={[styles.pickBtn, { backgroundColor: '#0284c7' }]} onPress={handleTakePhoto}>
                      <Text style={styles.pickBtnText}>📸 写真を撮影する</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.pickBtn, { backgroundColor: '#334155' }]} onPress={handleSelectImage}>
                      <Text style={styles.pickBtnText}>🖼️ ギャラリーから選択</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={[styles.pickBtn, { backgroundColor: '#0d9488' }]}
                  onPress={runTextAnalysis}
                  disabled={isAnalyzing}
                >
                  <Text style={styles.pickBtnText}>✍️ テキストメモからAI栄養解析</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 解析中表示 */}
            {isAnalyzing && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#4facfe" />
                <Text style={styles.loadingText}>🤖 AIが食事内容と栄養価を解析中...</Text>
              </View>
            )}

            {/* AIアドバイス */}
            {aiResult?.advice && (
              <View style={styles.adviceBox}>
                <Text style={styles.adviceTitle}>💡 AIワンポイントアドバイス</Text>
                <Text style={styles.adviceText}>{aiResult.advice}</Text>
              </View>
            )}

            {/* 倍率調整 */}
            {aiResult && (
              <View style={styles.portionBox}>
                <Text style={styles.label}>食べた量の倍率: {multiplier}倍</Text>
                <View style={styles.presetRow}>
                  {[0.5, 0.7, 1.0, 1.2, 1.5, 2.0].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.presetBtn, multiplier === m && styles.presetBtnActive]}
                      onPress={() => handleMultiplierChange(m)}
                    >
                      <Text style={[styles.presetBtnText, multiplier === m && styles.presetBtnTextActive]}>
                        {m}倍
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 栄養数値入力フォーム */}
            <View style={styles.formSection}>
              <Text style={styles.label}>料理名</Text>
              <TextInput style={styles.input} value={mealName} onChangeText={setMealName} placeholder="例: 鶏胸肉とブロッコリー" placeholderTextColor="#475569" />

              <Text style={styles.label}>栄養成分</Text>
              <View style={styles.nutriGrid}>
                {[
                  { label: 'カロリー', val: calories, setter: setCalories, unit: 'kcal', color: '#10b981' },
                  { label: 'タンパク質', val: protein, setter: setProtein, unit: 'g', color: '#06b6d4' },
                  { label: '脂質', val: fat, setter: setFat, unit: 'g', color: '#f59e0b' },
                  { label: '炭水化物', val: carbs, setter: setCarbs, unit: 'g', color: '#a855f7' },
                  { label: '塩分', val: sodium, setter: setSodium, unit: 'g', color: '#f43f5e' },
                  { label: '食物繊維', val: fiber, setter: setFiber, unit: 'g', color: '#84cc16' },
                ].map((item) => (
                  <View key={item.label} style={styles.nutriCell}>
                    <Text style={[styles.cellLabel, { color: item.color }]}>{item.label}</Text>
                    <TextInput
                      style={styles.cellInput}
                      value={item.val}
                      onChangeText={item.setter}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#475569"
                    />
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>💾 食事ログを保存する</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#00000088' },
  sheetContainer: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },
  body: { padding: 16 },
  warningBanner: { backgroundColor: '#f59e0b22', borderWidth: 1, borderColor: '#f59e0b', padding: 12, borderRadius: 10, marginBottom: 12 },
  warningBannerTitle: { fontSize: 13, fontWeight: '700', color: '#f59e0b', marginBottom: 4 },
  warningBannerText: { fontSize: 12, color: '#cbd5e1', lineHeight: 17 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, marginTop: 10 },
  mealTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  mealTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  mealTypeBtnActive: { backgroundColor: '#4facfe22', borderColor: '#4facfe' },
  mealTypeBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  mealTypeBtnTextActive: { color: '#4facfe' },
  memoInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickBox: { gap: 10, marginVertical: 12 },
  pickBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  pickBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  previewContainer: { marginVertical: 12 },
  previewImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#1e293b' },
  rePickRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  rePickBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#334155', alignItems: 'center' },
  rePickBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  reAnalyzeBtn: { backgroundColor: '#4facfe22', borderWidth: 1, borderColor: '#4facfe' },
  reAnalyzeBtnText: { fontSize: 12, color: '#4facfe', fontWeight: '700' },
  loadingBox: { padding: 20, alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, marginVertical: 10 },
  loadingText: { color: '#4facfe', marginTop: 10, fontSize: 13, fontWeight: '600' },
  adviceBox: { backgroundColor: '#10b98115', borderWidth: 1, borderColor: '#10b98144', padding: 12, borderRadius: 10, marginVertical: 8 },
  adviceTitle: { fontSize: 13, fontWeight: '700', color: '#10b981', marginBottom: 4 },
  adviceText: { fontSize: 12, color: '#e2e8f0', lineHeight: 18 },
  portionBox: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginVertical: 8 },
  presetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  presetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  presetBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  presetBtnText: { fontSize: 12, color: '#94a3b8' },
  presetBtnTextActive: { color: '#fff', fontWeight: '700' },
  formSection: { marginTop: 8 },
  input: { backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', fontSize: 14, padding: 10, marginBottom: 8 },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  nutriCell: { width: '48%', backgroundColor: '#1e293b', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155' },
  cellLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  cellInput: { backgroundColor: '#0f172a', borderRadius: 6, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', fontSize: 14, paddingHorizontal: 10, paddingVertical: 6, textAlign: 'right' },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

