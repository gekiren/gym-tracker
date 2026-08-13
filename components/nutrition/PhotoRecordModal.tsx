import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { isStagingOrDev, getLatestAIDebugLog, getAIDebugLogs } from '../../src/utils/debugLogStore';

// ネイティブモジュール取得（クラッシュ防止付き）
// expo-image-picker 内部の ExponentImagePicker.js が requireNativeModule('ExponentImagePicker') を
// トップレベルで実行するため、require('expo-image-picker') 自体がネイティブ不在時に致命例外をスローする。
// そのため、require を呼ぶ前に requireOptionalNativeModule で安全に存在チェックを行う。
const safeGetImagePicker = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireOptionalNativeModule } = require('expo-modules-core');
    const nativeMod =
      requireOptionalNativeModule('ExpoImagePicker') ||
      requireOptionalNativeModule('ExponentImagePicker');
    if (!nativeMod) {
      console.warn('[PhotoRecordModal] ExponentImagePicker / ExpoImagePicker native module not found');
      return null;
    }
    // ネイティブモジュール存在確認済み → 安全に require 可能
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-image-picker') as typeof import('expo-image-picker');
  } catch (err: any) {
    console.warn('[PhotoRecordModal] safeGetImagePicker failed:', err?.message || err);
    return null;
  }
};

const safeGetImageManipulator = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireOptionalNativeModule } = require('expo-modules-core');
    const nativeMod =
      requireOptionalNativeModule('ExpoImageManipulator') ||
      requireOptionalNativeModule('ExponentImageManipulator');
    if (!nativeMod) {
      console.warn('[PhotoRecordModal] ExponentImageManipulator / ExpoImageManipulator native module not found');
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-image-manipulator') as typeof import('expo-image-manipulator');
  } catch (err: any) {
    console.warn('[PhotoRecordModal] safeGetImageManipulator failed:', err?.message || err);
    return null;
  }
};

import { analyzeMealImage, analyzeMealText, NutritionAIResult } from '../../src/services/aiCoachService';
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

export default function PhotoRecordModal({ visible, onClose, onSave, selectedDate }: Props) {
  const { backgroundTheme } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';
  const scrollViewRef = useRef<ScrollView>(null);

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
  const [showDebugModal, setShowDebugModal] = useState(false);

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

  // 画像圧縮＆Base64変換 (最大幅800pxにリサイズして軽量化)
  const processImage = async (uri: string) => {
    try {
      setSelectedImageUri(uri);
      let b64Str: string | null = null;

      const ImageManipulator = safeGetImageManipulator();
      if (ImageManipulator && ImageManipulator.manipulateAsync) {
        try {
          // カメラの超高画質写真を幅800px・圧縮率0.5にリサイズ（送信サイズを約80KBに軽量化）
          const manipFormat = (ImageManipulator.SaveFormat?.JPEG || 'jpeg') as any;
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.5, format: manipFormat, base64: true }
          );
          if (manipResult.uri) {
            setSelectedImageUri(manipResult.uri);
          }
          if (manipResult.base64) {
            b64Str = manipResult.base64;
          }
        } catch (manipErr) {
          console.warn('[PhotoRecordModal] ImageManipulator resize failed, attempting FileSystem fallback', manipErr);
        }
      }

      // フォールバック: FileSystem で Base64 取得
      if (!b64Str) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const FileSystem = require('expo-file-system');
          if (FileSystem && FileSystem.readAsStringAsync) {
            b64Str = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType ? FileSystem.EncodingType.Base64 : 'base64',
            });
          }
        } catch (fsErr) {
          console.warn('[PhotoRecordModal] FileSystem fallback failed:', fsErr);
        }
      }

      if (!b64Str) {
        Alert.alert('画像読込エラー', '画像のデータ変換に失敗しました。別の写真を試してください。');
        return;
      }

      // MIME Base64 特有の改行コード (\r, \n, 空白) を完全にサニタイズ除去
      const cleanB64Str = b64Str.replace(/[\r\n\s]/g, '');
      const formattedB64 = cleanB64Str.startsWith('data:') ? cleanB64Str : `data:image/jpeg;base64,${cleanB64Str}`;
      setBase64Data(formattedB64);
      await runAnalysis(formattedB64);
    } catch (err: any) {
      console.error('[PhotoRecordModal] processImage error:', err);
      Alert.alert('画像処理エラー', '画像の読み込みに失敗しました。');
    }
  };

  // カメラで撮影 (quality: 0.3 でメモリ消費を抑え Android OS によるメインアプリ強制終了・ダッシュボード戻りを防止)
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
      // quality: 0.3 & allowsEditing: true で軽量化し、OSによるアプリ再起動を防止
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.3,
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
        quality: 0.7,
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
        <View style={[styles.sheet, isPureBlack && { backgroundColor: '#000000', borderWidth: 1, borderColor: '#1f1f1f' }]}>
          <View style={[styles.header, isPureBlack && { borderBottomColor: '#1f1f1f' }]}>
            <Text style={styles.title}>📷 写真・AIから食事記録</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollViewRef} style={styles.body} contentContainerStyle={{ paddingBottom: 260 }} keyboardShouldPersistTaps="handled">
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

            {/* 補足メモ */}
            <Text style={styles.label}>食事内容メモ（例: カツカレー大盛り、スープ半分残した）</Text>
            <TextInput
              style={[styles.memoInput, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}
              value={userMemo}
              onChangeText={setUserMemo}
              placeholder="例: サラダチキン1個、おにぎり1個"
              placeholderTextColor="#475569"
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
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
              <TextInput style={[styles.input, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]} value={mealName} onChangeText={setMealName} placeholder="例: 鶏胸肉とブロッコリー" placeholderTextColor="#475569" />

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
                  <View key={item.label} style={[styles.nutriCell, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}>
                    <Text style={[styles.cellLabel, { color: item.color }]}>{item.label}</Text>
                    <TextInput
                      style={[styles.cellInput, isPureBlack && { backgroundColor: '#000000', borderColor: '#1f1f1f' }]}
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

              {/* ステージング環境（staging チャンネル / __DEV__）限定 バックデータ出力ボタン */}
              {isStagingOrDev() && (
                <TouchableOpacity
                  style={styles.debugBtn}
                  onPress={() => setShowDebugModal(true)}
                >
                  <Text style={styles.debugBtnText}>🔍 [Staging] AI通信バックデータログを確認</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ステージング限定 バックデータダイアログ */}
      {isStagingOrDev() && (
        <Modal visible={showDebugModal} animationType="slide" transparent={true} onRequestClose={() => setShowDebugModal(false)}>
          <View style={styles.debugModalOverlay}>
            <View style={styles.debugModalContent}>
              <View style={styles.debugModalHeader}>
                <Text style={styles.debugModalTitle}>🔍 AI通信 バックデータ（Raw Log）</Text>
                <TouchableOpacity onPress={() => setShowDebugModal(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.debugModalBody}>
                {getAIDebugLogs().length === 0 ? (
                  <Text style={styles.debugTextEmpty}>まだ通信ログがありません。AI解析を実行してください。</Text>
                ) : (
                  getAIDebugLogs().map((log) => (
                    <View key={log.id} style={styles.debugLogCard}>
                      <View style={styles.debugLogHeader}>
                        <Text style={styles.debugLogBadge}>
                          {log.type === 'image_analysis' ? '📷 画像解析' : log.type === 'text_analysis' ? '✍️ テキスト解析' : '💬 チャット'}
                        </Text>
                        <Text style={styles.debugLogTime}>{log.timestamp}</Text>
                        <Text style={[styles.debugLogStatus, { color: log.success ? '#10b981' : '#f43f5e' }]}>
                          {log.status ? `HTTP ${log.status}` : log.success ? '成功' : 'エラー'}
                        </Text>
                      </View>

                      {log.errorMessage && (
                        <Text style={styles.debugLogErrorText}>❌ エラー: {log.errorMessage}</Text>
                      )}

                      <Text style={styles.debugSubLabel}>リクエスト概要:</Text>
                      <TextInput
                        style={styles.debugCodeInput}
                        multiline
                        editable={false}
                        value={JSON.stringify(log.requestSummary, null, 2)}
                      />

                      <Text style={styles.debugSubLabel}>レスポンス (Raw JSON / Server Response):</Text>
                      <TextInput
                        style={styles.debugCodeInput}
                        multiline
                        editable={false}
                        value={log.responseRaw ? (typeof log.responseRaw === 'string' ? log.responseRaw : JSON.stringify(log.responseRaw, null, 2)) : 'なし'}
                      />
                    </View>
                  ))
                )}
              </ScrollView>

              <TouchableOpacity style={styles.debugCloseActionBtn} onPress={() => setShowDebugModal(false)}>
                <Text style={styles.debugCloseActionBtnText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  debugBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3b82f622',
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
  },
  debugBtnText: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },
  debugModalOverlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'center', padding: 16 },
  debugModalContent: { backgroundColor: '#0f172a', borderRadius: 16, maxHeight: '85%', borderWidth: 1, borderColor: '#334155', padding: 16 },
  debugModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingBottom: 8 },
  debugModalTitle: { color: '#60a5fa', fontSize: 15, fontWeight: '700' },
  debugModalBody: { flexGrow: 0 },
  debugTextEmpty: { color: '#64748b', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  debugLogCard: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  debugLogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  debugLogBadge: { color: '#f8fafc', fontSize: 12, fontWeight: '700', backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  debugLogTime: { color: '#94a3b8', fontSize: 11 },
  debugLogStatus: { fontSize: 12, fontWeight: '700' },
  debugLogErrorText: { color: '#f43f5e', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  debugSubLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginTop: 6, marginBottom: 2 },
  debugCodeInput: { backgroundColor: '#0f172a', color: '#38bdf8', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', padding: 8, borderRadius: 6, maxHeight: 150 },
  debugCloseActionBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  debugCloseActionBtnText: { color: '#f8fafc', fontWeight: '700', fontSize: 13 },
});
