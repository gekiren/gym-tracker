import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getDB, addCustomExercise } from '../db/database';

export interface ImportResult {
  success: boolean;
  workoutsCount: number;
  setsCount: number;
  exercisesCreated: number;
  error?: string;
}

// 簡易CSVパーサー (カンマ区切り、ダブルクォーテーション囲み、改行のエスケープに対応)
export const parseCSVText = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          // エスケープされたダブルクォーテーション
          currentVal += '"';
          i++; // 次のクォーテーションをスキップ
        } else {
          // 閉じダブルクォーテーション
          insideQuote = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        row.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\r' || char === '\n') {
        row.push(currentVal.trim());
        currentVal = '';
        if (row.some(val => val !== '')) {
          result.push(row);
        }
        row = [];
        // WindowsのCRLF対応
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentVal += char;
      }
    }
  }

  // 最終行の残り処理
  if (currentVal !== '' || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(val => val !== '')) {
      result.push(row);
    }
  }

  return result;
};

// ヘッダー行から必要なカラムのインデックスを特定する
interface ColumnMapping {
  dateIdx: number;
  exerciseIdx: number;
  weightIdx: number;
  repsIdx: number;
  setIdx: number;
  notesIdx: number;
  muscleIdx: number;
}

const findColumnMapping = (headers: string[]): ColumnMapping => {
  const cleanHeaders = headers.map(h => h.toLowerCase().trim());
  
  const findIndex = (keywords: string[]): number => {
    return cleanHeaders.findIndex(h => keywords.some(k => h.includes(k)));
  };

  return {
    dateIdx: findIndex(['日付', 'date']),
    exerciseIdx: findIndex(['種目', 'exercise', 'name', '項目']),
    weightIdx: findIndex(['重量', 'weight', 'kg', 'lbs']),
    repsIdx: findIndex(['回数', 'reps', 'rep', 'レップ']),
    setIdx: findIndex(['セット', 'set']),
    notesIdx: findIndex(['メモ', 'note', 'comment', '備考', '詳細']),
    muscleIdx: findIndex(['部位', 'muscle', 'category', 'グループ'])
  };
};

export const pickAndImportCSV = async (): Promise<ImportResult> => {
  try {
    // 1. ファイルピッカーでCSVを選択
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return { success: false, workoutsCount: 0, setsCount: 0, exercisesCreated: 0, error: 'CANCELED' };
    }

    const fileUri = pickerResult.assets[0].uri;

    // 2. ファイルの中身を読み込む
    const csvContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
    
    // 3. パース
    const rows = parseCSVText(csvContent);
    if (rows.length < 2) {
      return { success: false, workoutsCount: 0, setsCount: 0, exercisesCreated: 0, error: 'EMPTY_OR_NO_HEADER' };
    }

    // 4. ヘッダーマッピングの決定
    const headers = rows[0];
    const mapping = findColumnMapping(headers);

    if (mapping.dateIdx === -1 || mapping.exerciseIdx === -1) {
      return { success: false, workoutsCount: 0, setsCount: 0, exercisesCreated: 0, error: 'INVALID_HEADER_COLUMNS' };
    }

    const dataRows = rows.slice(1);
    
    // 5. 既存種目の読込 (Fuzzy一致用キャッシュ)
    const db = getDB();
    const existingExercisesRows = await db.getAllAsync<{ id: number; name: string; muscle_group: string; equipment: string }>('SELECT * FROM exercises');
    const exerciseMap = new Map<string, number>(); // name -> id
    
    existingExercisesRows.forEach(ex => {
      exerciseMap.set(ex.name.toLowerCase().trim(), ex.id);
    });

    // インポート対象のデータを一時的に日付ごとにグループ化する構造
    interface ParsedSet {
      exerciseName: string;
      muscleGroup: string;
      setNumber: number;
      weight: number | null;
      reps: number | null;
      notes: string | null;
    }
    
    const workoutsGroup: Record<string, ParsedSet[]> = {};
    let newExercisesCount = 0;

    // 行データの処理
    for (const r of dataRows) {
      // 必須カラムが不足している行はスキップ
      if (r.length <= Math.max(mapping.dateIdx, mapping.exerciseIdx)) continue;

      const rawDate = r[mapping.dateIdx];
      const rawExercise = r[mapping.exerciseIdx];
      
      if (!rawDate || !rawExercise) continue;

      // 日付の正規化 (YYYY-MM-DD 形式に揃える)
      let formattedDate = rawDate.replace(/\//g, '-').trim();
      // もし時間情報 (12:00:00) などが入っていれば、日付部分だけ取り出す
      if (formattedDate.includes(' ')) {
        formattedDate = formattedDate.split(' ')[0];
      }

      // 簡単な正規表現チェック
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) continue;

      // 種目のマッピングと追加
      const cleanExName = rawExercise.trim();
      const lowerExName = cleanExName.toLowerCase();
      let exerciseId = exerciseMap.get(lowerExName);

      if (!exerciseId) {
        // 部分一致 (Fuzzy) の試行
        let matched: typeof existingExercisesRows[number] | undefined = undefined;
        
        if (cleanExName.length > 2) {
          // 既存種目の中から、部分一致し、かつ文字数（長さ）の差が最も小さいものを選ぶ
          const candidates = existingExercisesRows
            .map(ex => {
              const exNameLower = ex.name.toLowerCase();
              const cleanExNameLower = cleanExName.toLowerCase();
              
              const isMatch = exNameLower.includes(cleanExNameLower) || cleanExNameLower.includes(exNameLower);
              if (!isMatch) return null;
              
              const lenDiff = Math.abs(exNameLower.length - cleanExNameLower.length);
              return { ex, lenDiff };
            })
            .filter((item): item is { ex: typeof existingExercisesRows[number]; lenDiff: number } => item !== null);

          if (candidates.length > 0) {
            candidates.sort((a, b) => a.lenDiff - b.lenDiff);
            matched = candidates[0].ex;
          }
        }

        if (matched) {
          exerciseId = matched.id;
          exerciseMap.set(lowerExName, exerciseId);
        } else {
          // 存在しない場合はカスタム種目として新規DB登録
          const rawMuscle = mapping.muscleIdx !== -1 ? r[mapping.muscleIdx] : 'その他';
          const muscle = rawMuscle ? rawMuscle.trim() : 'その他';
          
          exerciseId = await addCustomExercise(cleanExName, muscle, 'その他');
          exerciseMap.set(lowerExName, exerciseId);
          newExercisesCount++;
          // 既存リストに追加して次回以降高速一致
          existingExercisesRows.push({ id: exerciseId, name: cleanExName, muscle_group: muscle, equipment: 'その他' });
        }
      }

      // セット情報の抽出
      const rawSet = mapping.setIdx !== -1 ? parseInt(r[mapping.setIdx], 10) : 1;
      const setNumber = isNaN(rawSet) ? 1 : rawSet;

      // 重量のパース (自重は 0 または null として処理)
      const rawWeight = mapping.weightIdx !== -1 ? r[mapping.weightIdx] : '';
      let weight: number | null = null;
      if (rawWeight) {
        if (rawWeight.includes('自重') || rawWeight.toLowerCase().includes('body')) {
          weight = 0;
        } else {
          const parsedW = parseFloat(rawWeight.replace(',', '.'));
          weight = isNaN(parsedW) ? null : parsedW;
        }
      }

      // レップスのパース
      const rawReps = mapping.repsIdx !== -1 ? r[mapping.repsIdx] : '';
      let reps: number | null = null;
      if (rawReps) {
        const parsedR = parseInt(rawReps, 10);
        reps = isNaN(parsedR) ? null : parsedR;
      }

      const notes = mapping.notesIdx !== -1 && r[mapping.notesIdx] ? r[mapping.notesIdx].trim() : null;
      const rawMuscle = mapping.muscleIdx !== -1 ? r[mapping.muscleIdx] : 'その他';
      const muscleGroup = rawMuscle ? rawMuscle.trim() : 'その他';

      if (!workoutsGroup[formattedDate]) {
        workoutsGroup[formattedDate] = [];
      }

      workoutsGroup[formattedDate].push({
        exerciseName: cleanExName,
        muscleGroup,
        setNumber,
        weight,
        reps,
        notes
      });
    }

    const uniqueDates = Object.keys(workoutsGroup).sort();
    if (uniqueDates.length === 0) {
      return { success: false, workoutsCount: 0, setsCount: 0, exercisesCreated: 0, error: 'NO_VALID_DATA_FOUND' };
    }

    let workoutsImported = 0;
    let totalSetsImported = 0;

    // 6. データベースへの一括書き込みトランザクション
    await db.withTransactionAsync(async () => {
      for (const date of uniqueDates) {
        const setsList = workoutsGroup[date];
        if (setsList.length === 0) continue;

        // ワークアウトの作成
        const title = `インポート - ${date}`;
        const startTime = `${date}T12:00:00.000Z`;
        const endTime = `${date}T12:45:00.000Z`; // デフォルト45分間とする
        
        const wRes = await db.runAsync(
          'INSERT INTO workouts (title, start_time, end_time, notes, calories) VALUES (?, ?, ?, ?, ?)',
          [title, startTime, endTime, '筋トレMemoよりインポートされたログ', 0]
        );
        const workoutId = wRes.lastInsertRowId;

        // 種目ごとにセットを集約
        const exGroups: Record<string, ParsedSet[]> = {};
        setsList.forEach(s => {
          if (!exGroups[s.exerciseName]) {
            exGroups[s.exerciseName] = [];
          }
          exGroups[s.exerciseName].push(s);
        });

        let sortOrder = 0;
        for (const exName of Object.keys(exGroups)) {
          const exSets = exGroups[exName];
          const exId = exerciseMap.get(exName.toLowerCase().trim());
          if (!exId) continue;

          // workout_exercises の作成
          const weRes = await db.runAsync(
            'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, notes) VALUES (?, ?, ?, ?)',
            [workoutId, exId, sortOrder++, null]
          );
          const weId = weRes.lastInsertRowId;

          // workout_sets の作成
          // 重複したセット番号を防ぐための調整を行いつつ挿入
          let nextSetNum = 1;
          for (const s of exSets) {
            const finalSetNum = s.setNumber || nextSetNum++;
            await db.runAsync(
              'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, side, variation, stance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [weId, finalSetNum, s.reps, s.weight, null, 1, null, null, null, null, null]
            );
            totalSetsImported++;
          }
        }
        workoutsImported++;
      }
    });

    return {
      success: true,
      workoutsCount: workoutsImported,
      setsCount: totalSetsImported,
      exercisesCreated: newExercisesCount
    };

  } catch (error: any) {
    console.error('CSV Import critical error:', error);
    return {
      success: false,
      workoutsCount: 0,
      setsCount: 0,
      exercisesCreated: 0,
      error: error?.message || String(error)
    };
  }
};
