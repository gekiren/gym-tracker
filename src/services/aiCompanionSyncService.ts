import { addWaterLog } from '../db/repositories/lifelogRepository';
import { addMealLog } from '../db/repositories/nutritionRepository';
import { getExercises, addCustomExercise } from '../db/repositories/exerciseRepository';
import { saveWorkout } from '../db/repositories/workoutRepository';
import { getBodyLogByDate, insertBodyLog, updateBodyLog } from '../db/repositories/bodyRepository';
import { useSettingsStore } from '../store/settingsStore';
import { Alert } from 'react-native';

export interface SyncResult {
  waterCount: number;
  mealCount: number;
  workoutCount: number;
  noteCount: number;
  memoryCount: number;
  total: number;
}

export async function processAndSaveCompanionData(payload: any): Promise<SyncResult> {
  let waterCount = 0;
  let mealCount = 0;
  let workoutCount = 0;
  let noteCount = 0;

  // 1. 水分ログ保存
  for (const w of payload?.waters || []) {
    if (w && w.amount_ml) {
      const ts = Number(w.timestamp) || Date.now();
      const dateStr = new Date(ts).toISOString().split('T')[0];
      await addWaterLog(
        Number(w.amount_ml) || 0,
        ts,
        dateStr,
        w.has_caffeine ? 100 : 0
      );
      waterCount++;
    }
  }

  // 2. 食事ログ保存
  for (const m of payload?.meals || []) {
    const mealName = m?.meal_name || m?.name || m?.food_name;
    if (mealName) {
      const ts = Number(m.timestamp) || Date.now();
      const dateStr = new Date(ts).toISOString().split('T')[0];
      await addMealLog({
        date: dateStr,
        meal_type: m.meal_type || 'snack',
        meal_time: '12:00',
        name: mealName,
        calories: Number(m.calories) || 0,
        protein: Number(m.protein) || Number(m.protein_g) || 0,
        fat: Number(m.fat) || Number(m.fat_g) || 0,
        carbs: Number(m.carbs) || Number(m.carbs_g) || 0,
        sodium: 0,
        fiber: 0,
        created_at: ts,
      });
      mealCount++;
    }
  }

  // 3. ワークアウト保存
  if (payload?.workouts && payload.workouts.length > 0) {
    const existingExercises: any[] = (await getExercises()) || [];
    const newExercises = [];

    for (const w of payload.workouts) {
      const exName = w?.exercise_name || w?.name;
      let exId = null;
      if (exName) {
        const matched = existingExercises.find(
          (e: any) =>
            e.name?.toLowerCase() === exName.toLowerCase() ||
            e.name_ja?.toLowerCase() === exName.toLowerCase()
        );
        if (matched) {
          exId = (matched as any).id;
        } else {
          exId = await addCustomExercise(exName, 'other', '自重');
        }
      }

      if (exId) {
        const setsCount = Number(w.sets) || 1;
        const setsArray = [];
        for (let i = 1; i <= setsCount; i++) {
          setsArray.push({
            set_number: i,
            weight: Number(w.weight_kg) || Number(w.weight) || 0,
            reps: Number(w.reps) || 0,
            rpe: null,
            is_completed: true,
            rest_seconds: null,
            work_seconds: null,
            side: null,
            variation: null,
            stance: null,
          });
        }

        newExercises.push({
          exercise_id: exId,
          sort_order: newExercises.length,
          notes: w.notes || null,
          sets: setsArray,
        });
      }
    }

    if (newExercises.length > 0) {
      const firstTs = Number(payload.workouts[0]?.timestamp) || (Date.now() - 1800000);
      const endTs = Date.now();
      const startTime = new Date(firstTs).toISOString();
      const endTime = new Date(endTs).toISOString();
      await saveWorkout('AI記録ワークアウト', startTime, endTime, null, newExercises);
      workoutCount++;
    }
  }

  // 4. メモ・体調保存
  for (const n of payload?.dailyNotes || []) {
    const summary = typeof n === 'string' ? n : n?.summary;
    const condition = typeof n === 'object' ? n?.condition : '';
    if (summary || condition) {
      const ts = Number(n?.timestamp) || Date.now();
      const dateStr = new Date(ts).toISOString().split('T')[0];
      const memoText = [condition ? `体調: ${condition}` : '', summary]
        .filter(Boolean)
        .join('\n');

      const existingBodyLog = await getBodyLogByDate(dateStr);
      if (existingBodyLog) {
        const updatedMemo = existingBodyLog.memo
          ? `${existingBodyLog.memo}\n\n[AI メモ]\n${memoText}`
          : `[AI メモ]\n${memoText}`;
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
          created_at: ts,
        });
      }
      noteCount++;
    }
  }

  // 5. 記憶（パーソナライズメモリ）保存
  let memoryCount = 0;
  if (payload?.memoryUpdates && Array.isArray(payload.memoryUpdates) && payload.memoryUpdates.length > 0) {
    const currentMemory = useSettingsStore.getState().settings.aiCompanionMemory || '';
    const newItems = payload.memoryUpdates
      .map((item: any) => (typeof item === 'string' ? item.trim() : item?.memory_item?.trim()))
      .filter(Boolean);
    if (newItems.length > 0) {
      const MEMORY_MAX_CHARS = 5000;
      // 重複排除: 既存メモリに含まれている行は追記しない
      const existingLines = new Set(
        currentMemory.split('\n').map((l: string) => l.trim()).filter(Boolean)
      );
      const deduped = newItems.filter((item: string) => !existingLines.has(item.trim()));
      if (deduped.length > 0) {
        const combined = currentMemory
          ? `${currentMemory}\n${deduped.join('\n')}`
          : deduped.join('\n');
        // 5000字を超えた場合は古い記憶を先頭から切り捨て
        let finalMemory = combined;
        if (combined.length > MEMORY_MAX_CHARS) {
          const sliced = combined.slice(combined.length - MEMORY_MAX_CHARS);
          // 行の途中から始まらないよう、最初の改行以降から使用
          const firstNewline = sliced.indexOf('\n');
          finalMemory = firstNewline >= 0 ? sliced.slice(firstNewline + 1) : sliced;
        }
        useSettingsStore.getState().setAiCompanionMemory(finalMemory);
        memoryCount = deduped.length;
      }
    }
  }

  const total = waterCount + mealCount + workoutCount + noteCount + memoryCount;
  return {
    waterCount,
    mealCount,
    workoutCount,
    noteCount,
    memoryCount,
    total,
  };
}

export function handleCompanionWebViewMessage(
  event: any,
  onSuccess?: () => void
) {
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
                const res = await processAndSaveCompanionData(payload);
                const summaryParts = [
                  `水: ${res.waterCount}件`,
                  `食: ${res.mealCount}件`,
                  `筋: ${res.workoutCount}件`,
                  `メモ: ${res.noteCount}件`,
                ];
                if (res.memoryCount > 0) {
                  summaryParts.push(`記憶: ${res.memoryCount}件`);
                }
                Alert.alert(
                  '完了',
                  `データを保存しました！\n${summaryParts.join(' / ')}`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (onSuccess) onSuccess();
                      },
                    },
                  ]
                );
              } catch (e: any) {
                console.error('Save error:', e);
                Alert.alert('エラー', `保存中にエラーが発生しました。\n${e?.message || e}`);
              }
            },
          },
        ]
      );
    }
  } catch (err) {
    console.error('WebView msg parse error', err);
  }
}
