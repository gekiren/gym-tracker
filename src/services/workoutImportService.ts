import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { getExercises, addCustomExercise, saveWorkout } from '../db/database';
import { parseWorkoutMarkdown, ParsedWorkoutData } from '../utils/markdownWorkoutParser';

export interface ImportResult {
  success: boolean;
  workoutId?: number;
  title: string;
  date: string;
  exerciseCount: number;
  setCount: number;
  error?: string;
}

/**
 * ParsedWorkoutData を SQLite DB に登録・追加するコア関数
 */
export const importWorkoutDataToDB = async (parsedData: ParsedWorkoutData): Promise<ImportResult> => {
  try {
    if (!parsedData.exercises || parsedData.exercises.length === 0) {
      return {
        success: false,
        title: parsedData.title,
        date: parsedData.start_time,
        exerciseCount: 0,
        setCount: 0,
        error: 'MDファイル内に有効な種目・セットデータが見つかりませんでした。'
      };
    }

    // 1. 既存の種目リストを取得
    const existingExercises = await getExercises() as any[];
    const exerciseNameMap = new Map<string, number>();

    existingExercises.forEach(ex => {
      exerciseNameMap.set(ex.name.toLowerCase().trim(), ex.id);
    });

    // 2. 種目のID解決・未知種目の自動追加
    const dbExercisesForSave = [];
    let totalSetCount = 0;

    for (const ex of parsedData.exercises) {
      const cleanName = ex.exercise_name.trim();
      const lowerName = cleanName.toLowerCase();
      let exerciseId = exerciseNameMap.get(lowerName);

      if (!exerciseId) {
        // 部分一致の検索フォールバック
        for (const [existingName, id] of exerciseNameMap.entries()) {
          if (existingName.includes(lowerName) || lowerName.includes(existingName)) {
            exerciseId = id;
            break;
          }
        }
      }

      if (!exerciseId) {
        // 未知種目の場合は SQLite にカスタム種目として自動追加
        exerciseId = await addCustomExercise(cleanName, 'その他', 'その他');
        exerciseNameMap.set(lowerName, exerciseId);
      }

      const sets = ex.sets.map((s, idx) => ({
        id: `imported_${idx}_${Date.now()}`,
        set_number: s.set_number || (idx + 1),
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        stance: s.stance,
        variation: s.variation,
        work_seconds: s.work_seconds,
        rest_seconds: s.rest_seconds,
        is_completed: true
      }));

      totalSetCount += sets.length;

      dbExercisesForSave.push({
        id: `imported_ex_${exerciseId}_${Date.now()}`,
        exercise_id: exerciseId,
        name: cleanName,
        notes: ex.notes || undefined,
        sets
      });
    }

    // 3. SQLite DB へ保存
    const workoutId = await saveWorkout(
      parsedData.title,
      parsedData.start_time,
      parsedData.end_time || parsedData.start_time,
      parsedData.notes,
      dbExercisesForSave as any[],
      null
    );

    return {
      success: true,
      workoutId,
      title: parsedData.title,
      date: parsedData.start_time.split('T')[0],
      exerciseCount: dbExercisesForSave.length,
      setCount: totalSetCount
    };
  } catch (e: any) {
    console.error('Failed to import workout data to DB:', e);
    return {
      success: false,
      title: parsedData.title || 'Workout',
      date: parsedData.start_time || '',
      exerciseCount: 0,
      setCount: 0,
      error: e.message || 'SQLite DB への保存時にエラーが発生しました。'
    };
  }
};

/**
 * 生 Markdown テキストからインポートを実行
 */
export const importWorkoutFromMarkdownText = async (mdText: string): Promise<ImportResult> => {
  try {
    const parsedData = parseWorkoutMarkdown(mdText);
    return await importWorkoutDataToDB(parsedData);
  } catch (e: any) {
    return {
      success: false,
      title: 'Import',
      date: '',
      exerciseCount: 0,
      setCount: 0,
      error: e.message || 'Markdown のパースに失敗しました。'
    };
  }
};

/**
 * ドキュメントピッカーで MD ファイルを選択してインポート
 */
export const importWorkoutFromSelectedFile = async (): Promise<ImportResult> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/markdown', 'text/plain', '*/*'],
      copyToCacheDirectory: true
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return {
        success: false,
        title: '',
        date: '',
        exerciseCount: 0,
        setCount: 0,
        error: 'ファイル選択がキャンセルされました。'
      };
    }

    const fileUri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8
    });

    return await importWorkoutFromMarkdownText(content);
  } catch (e: any) {
    console.error('Failed to read and import file:', e);
    return {
      success: false,
      title: '',
      date: '',
      exerciseCount: 0,
      setCount: 0,
      error: e.message || 'ファイルの読み込みまたはインポート中にエラーが発生しました。'
    };
  }
};
