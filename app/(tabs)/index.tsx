import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert, PermissionsAndroid, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme, useAppTheme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { getRoutines, getPreviousWorkoutSets, getPersonalRecords, saveSetting } from '../../src/db/database';
import { translateExercise } from '../../src/i18n';
import { readCrashLog, deleteCrashLog, sendCrashReport, initializeSentry } from '../../src/services/crashReporterService';
import { saveWorkout } from '../../src/db/repositories/workoutRepository';
import { getExercises, addCustomExercise } from '../../src/db/repositories/exerciseRepository';
import { addWaterLog, addTimeLog } from '../../src/db/repositories/lifelogRepository';
import { addMealLog } from '../../src/db/repositories/nutritionRepository';
import { getBodyLogByDate, insertBodyLog, updateBodyLog } from '../../src/db/repositories/bodyRepository';

export default function WorkoutHomeScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const startWorkout = useWorkoutStore(state => state.startWorkout);
  const endWorkout = useWorkoutStore(state => state.endWorkout);
  const addExercise = useWorkoutStore(state => state.addExercise);
  const isActive = useWorkoutStore(state => state.isActive);
  const title = useWorkoutStore(state => state.title);
  const settings = useSettingsStore(state => state.settings);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const hasUnsentCrashLog = useWorkoutStore(state => state.hasUnsentCrashLog);
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(settings.needsStyleSelection);
  const [isSendingCrash, setIsSendingCrash] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  const handleOpenAssistant = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'マイクの権限',
            message: '音声AIアシスタントで会話するためにマイクの許可が必要です。',
            buttonPositive: '許可する',
            buttonNegative: 'キャンセル',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('マイク権限が必要です', 'マイクの権限が許可されていないため、音声対話を使用できません。設定画面からマイクを許可してください。');
          return;
        }
      } catch (err) {
        console.warn('Mic permission error', err);
      }
    }
    setShowAssistant(true);
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SYNC_DATA') {
        const payload = data.data;
        Alert.alert(
          'データ一括保存',
          'AIコンパニオンからデータを受信しました。保存しますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            { 
              text: '保存', 
              onPress: async () => {
                try {
                  let waterCount = 0;
                  let mealCount = 0;
                  let workoutCount = 0;
                  let noteCount = 0;

                  // 水分
                  for (const w of payload.waters || []) {
                    if (w.amount_ml) {
                      const dateStr = new Date(w.timestamp || Date.now()).toISOString().split("T")[0];
                      await addWaterLog(Number(w.amount_ml), w.timestamp || Date.now(), dateStr, w.has_caffeine ? 100 : 0);
                      waterCount++;
                    }
                  }
                  
                  // 食事
                  for (const m of payload.meals || []) {
                    if (m.meal_name) {
                      const dateStr = new Date(m.timestamp || Date.now()).toISOString().split("T")[0];
                      await addMealLog({
                        date: dateStr,
                        meal_type: m.meal_type || "snack",
                        meal_time: "12:00",
                        name: m.meal_name,
                        calories: Number(m.calories) || 0,
                        protein: Number(m.protein) || 0,
                        fat: 0,
                        carbs: 0,
                        sodium: 0,
                        fiber: 0,
                        created_at: m.timestamp || Date.now()
                      });
                      mealCount++;
                    }
                  }

                  // ワークアウト
                  if (payload.workouts && payload.workouts.length > 0) {
                    const existingExercises: any[] = (await getExercises()) || [];
                    const newExercises = [];
                    
                    for (const w of payload.workouts) {
                      let exId = null;
                      if (w.exercise_name) {
                        const matched = existingExercises.find((e: any) => e.name?.toLowerCase() === w.exercise_name.toLowerCase() || e.name_ja?.toLowerCase() === w.exercise_name.toLowerCase());
                        if (matched) exId = (matched as any).id;
                        else {
                          exId = await addCustomExercise(w.exercise_name, 'other', '自重');
                        }
                      }
                      
                      if (exId) {
                        const setsCount = Number(w.sets) || 1;
                        const setsArray = [];
                        for (let i = 1; i <= setsCount; i++) {
                          setsArray.push({
                            set_number: i,
                            weight: Number(w.weight_kg) || 0,
                            reps: Number(w.reps) || 0,
                            rpe: null,
                            is_completed: true,
                            rest_seconds: null,
                            work_seconds: null,
                            side: null,
                            variation: null,
                            stance: null
                          });
                        }
                        
                        newExercises.push({
                          exercise_id: exId,
                          sort_order: newExercises.length,
                          notes: w.notes || null,
                          sets: setsArray
                        });
                      }
                    }
                    
                    if (newExercises.length > 0) {
                      const nowTime = new Date().toISOString();
                      const pastTime = new Date(Date.now() - 3600000).toISOString();
                      await saveWorkout('AI記録ワークアウト', pastTime, nowTime, null, newExercises);
                      workoutCount++;
                    }
                  }

                  // メモ・体調
                  for (const n of payload.dailyNotes || []) {
                    if (n.summary || n.condition) {
                      const dateStr = new Date(n.timestamp || Date.now()).toISOString().split("T")[0];
                      const memoText = [n.condition ? `体調: ${n.condition}` : '', n.summary].filter(Boolean).join('\n');
                      
                      const existingBodyLog = await getBodyLogByDate(dateStr);
                      if (existingBodyLog) {
                        const updatedMemo = existingBodyLog.memo ? `${existingBodyLog.memo}\n\n[AI メモ]\n${memoText}` : `[AI メモ]\n${memoText}`;
                        await updateBodyLog({ ...existingBodyLog, memo: updatedMemo });
                      } else {
                        await insertBodyLog({
                          date: dateStr,
                          weight: null,
                          body_fat_rate: null,
                          muscle_mass: null,
                          lbm: null,
                          height: null,
                          neck: null,
                          waist: null,
                          hip: null,
                          wrist: null,
                          ankle: null,
                          gender: 'male',
                          source: 'manual',
                          memo: `[AI メモ]\n${memoText}`,
                          created_at: n.timestamp || Date.now()
                        });
                      }
                      noteCount++;
                    }
                  }
                  
                  const total = waterCount + mealCount + workoutCount + noteCount;
                  Alert.alert('完了', `データを保存しました！\n水: ${waterCount}件 / 食: ${mealCount}件 / 筋: ${workoutCount}件 / メモ: ${noteCount}件`, [
                    {
                      text: 'OK',
                      onPress: () => setShowAssistant(false)
                    }
                  ]);
                } catch (e) {
                  console.error('Save error:', e); 
                  Alert.alert('エラー', '保存中にエラーが発生しました。');
                }
              }
            }
          ]
        );
      }
    } catch (err) {
      console.error('WebView msg err', err);
    }
  };

  // Configure navigation header dynamics (Dashboard Back Button)
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.navigate('/');
            }
          }} 
          style={{ marginLeft: 16, padding: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors]);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    try {
      const data = await getRoutines();
      setRoutines(data);
    } catch (e) {
      console.error('Failed to fetch routines', e);
    }
  };

  const handleStartEmpty = () => {
    const proceedWithEmpty = () => {
      if (isActive) {
        endWorkout();
      }
      startWorkout(t('ui.home.free_workout_title'));
      router.push('/active-workout');
    };

    if (isActive) {
      Alert.alert(
        t('ui.routines.confirm_start_during_workout_title'),
        t('ui.routines.confirm_start_during_workout_message'),
        [
          { text: t('ui.common.cancel'), style: 'cancel' },
          {
            text: t('ui.common.ok'),
            style: 'destructive',
            onPress: proceedWithEmpty
          }
        ]
      );
    } else {
      proceedWithEmpty();
    }
  };

  const handleStartRoutine = async (routine: any) => {
    if (isLoading) return;

    const proceedWithRoutine = async () => {
      setIsLoading(true);
      try {
        if (isActive) {
          endWorkout();
        }
        startWorkout(routine.title);
        for (const ex of routine.exercises) {
          const prevSets = await getPreviousWorkoutSets(ex.id);
          const personalRecords = await getPersonalRecords(ex.id);
          addExercise({ 
            id: ex.id, 
            name: ex.name, 
            previousSets: prevSets, 
            personalRecords, 
            equipment: ex.equipment, 
            muscle_group: ex.muscle_group,
            routineSets: ex.sets
          });
        }
        router.push('/active-workout');
      } catch (e) {
        console.error('Failed to start routine', e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isActive) {
      Alert.alert(
        t('ui.routines.confirm_start_during_workout_title'),
        t('ui.routines.confirm_start_during_workout_message'),
        [
          { text: t('ui.common.cancel'), style: 'cancel' },
          {
            text: t('ui.common.ok'),
            style: 'destructive',
            onPress: proceedWithRoutine
          }
        ]
      );
    } else {
      await proceedWithRoutine();
    }
  };

  const handleSelectUnit = async (unit: 'kg' | 'lbs') => {
    await saveSetting('weight_unit', unit);
    loadSettings({
      defaultRest: settings.defaultRest,
      autoRest: settings.autoRest,
      timerVibrate: settings.timerVibrate,
      weightUnit: unit,
      needsUnitSelection: false,
      bodyWeight: settings.bodyWeight,
      needsStyleSelection: settings.needsStyleSelection
    });
  };

  const handleSelectStyle = async (style: 'simple' | 'advanced') => {
    await saveSetting('style_mode', style);
    const isAdvanced = style === 'advanced';

    await saveSetting('display_rpe', isAdvanced ? '1' : '0');
    await saveSetting('display_stance', isAdvanced ? '1' : '0');
    await saveSetting('display_1rm', isAdvanced ? '1' : '0');
    await saveSetting('display_volume', isAdvanced ? '1' : '0');

    useSettingsStore.getState().setDisplayFields({
      showRpe: isAdvanced,
      showStance: isAdvanced,
      show1RM: isAdvanced,
      showVolume: isAdvanced
    });

    loadSettings({
      defaultRest: settings.defaultRest,
      autoRest: settings.autoRest,
      timerVibrate: settings.timerVibrate,
      weightUnit: settings.weightUnit,
      needsUnitSelection: false,
      bodyWeight: settings.bodyWeight,
      needsStyleSelection: false,
      aiTokensBalance: settings.aiTokensBalance,
      crashConsent: settings.crashConsent
    });
  };

  const handleCrashConsent = async (consent: 'agreed' | 'declined') => {
    if (isSendingCrash) return;
    setIsSendingCrash(true);
    try {
      await saveSetting('crash_report_consent', consent);
      useSettingsStore.getState().setCrashConsent(consent);

      if (consent === 'agreed') {
        initializeSentry();
      }

      if (hasUnsentCrashLog) {
        if (consent === 'agreed') {
          const log = await readCrashLog();
          if (log) {
            await sendCrashReport(log);
          }
        }
        await deleteCrashLog();
        useWorkoutStore.getState().setHasUnsentCrashLog(false);
      }

      setIsNewUser(false);
    } catch (e) {
      console.error('Failed to save crash report consent:', e);
    } finally {
      setIsSendingCrash(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        {isActive ? (
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: Theme.colors.success || '#4caf50' }]} activeOpacity={0.8} onPress={() => router.push('/active-workout')}>
            <Ionicons name="play" size={24} color="#fff" style={{ marginRight: 8 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.primaryButtonText}>{t('ui.home.return_to_active')}</Text>
              {title && <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>{title}</Text>}
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={handleStartEmpty}>
            <Text style={styles.primaryButtonText}>{t('ui.home.start_free_workout')}</Text>
            <Ionicons name="play-circle" size={24} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}

        {/* 音声AIアシスタント */}
        <TouchableOpacity
          style={{ backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: 'rgba(100, 180, 255, 0.3)', flexDirection: 'row', alignItems: 'center' }}
          activeOpacity={0.8}
          onPress={handleOpenAssistant}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(100, 180, 255, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
            <Ionicons name="mic" size={24} color="#64b4ff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>音声AIアシスタント</Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 }}>話すだけでトレーニング・食事を記録</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* Assistant Modal */}
        <Modal
          visible={showAssistant}
          animationType="slide"
          onRequestClose={() => setShowAssistant(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#0d0d0d', borderBottomWidth: 1, borderBottomColor: '#222' }}>
              <TouchableOpacity onPress={() => setShowAssistant(false)} style={{ padding: 8, marginRight: 8 }}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, flex: 1 }}>音声AIアシスタント</Text>
            </View>
            <WebView
              source={{ uri: 'https://gym-tracker-ai-companion.toshi-diyil.workers.dev' }}
              style={{ flex: 1, backgroundColor: '#000' }}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mediaCapturePermissionGrantType="grant"
              onMessage={handleWebViewMessage}
              {...({ onPermissionRequest: (request: any) => {
                try {
                  request.grant(request.resources);
                } catch (e) {
                  console.warn('Permission grant error:', e);
                }
              } } as any)}
            />
          </View>
        </Modal>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('ui.home.my_routines')}</Text>
            <TouchableOpacity onPress={() => router.push('/routines')}>
              <Text style={styles.linkText}>{t('ui.home.view_all')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routineListContainer}>
            {routines.map(r => (
              <TouchableOpacity 
                key={r.id} 
                style={styles.routineRow} 
                activeOpacity={0.6} 
                onPress={() => handleStartRoutine(r)}
                disabled={isLoading}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routineTitle}>{r.title}</Text>
                    <Text style={styles.routineDesc} numberOfLines={2}>
                      {r.exercises?.map((e: any) => translateExercise(e.name)).join(', ') || t('ui.home.no_exercises')}
                    </Text>
                  </View>
                  <Ionicons name="play-circle" size={32} color={Theme.colors.primary} style={{ marginLeft: 16 }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {routines.length === 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: Theme.colors.textMuted }}>{t('ui.home.no_routines')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      )}

      {/* Onboarding Unit Selection Modal */}
      <Modal visible={settings.needsUnitSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Ionicons name="barbell" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.home.onboarding_unit_title')}</Text>
            <Text style={styles.modalDesc}>
              {t('ui.home.onboarding_unit_desc')}
            </Text>
            <View style={styles.modalBtnContainer}>
              <TouchableOpacity style={styles.unitBtn} onPress={() => handleSelectUnit('kg')}>
                <Text style={styles.unitBtnText}>{t('ui.home.unit_kg_desc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.unitBtn} onPress={() => handleSelectUnit('lbs')}>
                <Text style={styles.unitBtnText}>{t('ui.home.unit_lbs_desc')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Onboarding Style Selection Modal */}
      <Modal visible={!settings.needsUnitSelection && settings.needsStyleSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <Ionicons name="sparkles" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.home.onboarding_style_title') || '記録スタイルを選択'}</Text>
            <Text style={[styles.modalDesc, { marginBottom: 20 }]}>
              {t('ui.home.onboarding_style_desc') || 'ご自身のトレーニングレベルや好みに合わせて、画面に表示する記録項目を選んでください。'}
            </Text>

            {/* Simple Option Card */}
            <TouchableOpacity 
              style={styles.styleOptionCard} 
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('simple')}
            >
              <View style={styles.styleOptionIconBg}>
                <Ionicons name="document-text-outline" size={26} color={Theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.styleOptionTitle}>{t('ui.home.style_simple_title') || 'シンプル'}</Text>
                <Text style={styles.styleOptionDesc}>
                  {t('ui.home.style_simple_desc') || '表示項目を最小限に抑え、トレーニングの重量・回数記録だけに集中できるクリーンな表示です。'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Advanced Option Card */}
            <TouchableOpacity 
              style={[styles.styleOptionCard, { marginTop: 12 }]} 
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('advanced')}
            >
              <View style={[styles.styleOptionIconBg, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
                <Ionicons name="sparkles-outline" size={26} color={Theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.styleOptionTitle}>{t('ui.home.style_advanced_title') || 'こだわり'}</Text>
                <Text style={styles.styleOptionDesc}>
                  {t('ui.home.style_advanced_desc') || 'RPE(辛さ)やフォームのスタンス記録、自動1RM推定、合計ボリューム計算など、こだわりの機能をフル活用できます。'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.styleOnboardingHint}>
              {t('ui.home.style_onboarding_hint') || '※選択した内容は、後から設定（プロフィール）画面で個別にいつでもON/OFFを変更可能です。'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Onboarding & Startup Crash Consent Modal */}
      <Modal visible={!settings.needsUnitSelection && !settings.needsStyleSelection && settings.crashConsent === 'unset' && hasUnsentCrashLog} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <Ionicons name="bug-outline" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.crash_report.title') || 'アプリ改善へのご協力のお願い'}</Text>
            <Text style={[styles.modalDesc, { marginBottom: 24 }]}>
              {t('ui.crash_report.message_detected') || '前回の起動時にアプリが予期せず終了しました。品質向上のため、匿名のクラッシュレポートを送信してもよろしいですか？'}
            </Text>

            <View style={styles.modalBtnContainer}>
              <TouchableOpacity style={styles.crashConsentBtn} onPress={() => handleCrashConsent('agreed')} disabled={isSendingCrash}>
                {isSendingCrash ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.crashConsentBtnText}>{t('ui.crash_report.btn_consent') || '送信して協力する（同意）'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.crashDeclineBtn} onPress={() => handleCrashConsent('declined')} disabled={isSendingCrash}>
                <Text style={styles.crashDeclineBtnText}>{t('ui.crash_report.btn_decline') || '今回は送信しない（拒否）'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.md,
  },
  header: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Theme.colors.textMuted,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.sm,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginTop: Theme.spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  linkText: {
    color: Theme.colors.primary,
    fontSize: 16,
  },
  routineListContainer: {
    marginHorizontal: -Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  routineRow: {
    paddingVertical: 16,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  routineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  routineDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.colors.card, width: '100%', borderRadius: Theme.borderRadius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 12, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtnContainer: { width: '100%', gap: 12 },
  unitBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center' },
  unitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  styleOptionCard: { backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border, width: '100%' },
  styleOptionIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(79, 172, 254, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  styleOptionTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  styleOptionDesc: { fontSize: 12, color: Theme.colors.textMuted, lineHeight: 18 },
  styleOnboardingHint: { fontSize: 12, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 24, lineHeight: 18, paddingHorizontal: 12 },
  crashConsentBtn: { backgroundColor: '#007aff', paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center', width: '100%', justifyContent: 'center' },
  crashConsentBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  crashDeclineBtn: { backgroundColor: '#121212', paddingVertical: 12, borderRadius: Theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: '#262626', width: '100%', justifyContent: 'center' },
  crashDeclineBtnText: { color: '#555555', fontSize: 14, fontWeight: 'bold' }
});
