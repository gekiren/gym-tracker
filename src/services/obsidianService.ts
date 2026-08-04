import * as FileSystem from 'expo-file-system/legacy';
import { format } from 'date-fns';
import { getDB, getSettings, saveSetting, loadFullWorkoutData, getWaterLogs } from '../db/database';
import i18n, { translateExercise, translateStance } from '../i18n';

export type ObsidianExportMode = 'dedicated' | 'append' | 'individual';

export interface ObsidianSettings {
  enabled: boolean;
  vaultUri: string;
  vaultFolderName: string;
  exportMode: ObsidianExportMode;
  syncOnLaunch: boolean;
  scheduleTime: string; // e.g. "22:00"
  exportWorkouts: boolean;
  exportExercises: boolean;
  exportWater: boolean;
  exportTime: boolean;
  exportHabits: boolean;
  exportRoutines: boolean;
  folderWorkouts: string;
  folderExercises: string;
  folderWater: string;
  folderTime: string;
  folderHabits: string;
  folderRoutines: string;
  folderDaily: string;
  lastSyncTimestamp: number;
}

const DEFAULT_SETTINGS: ObsidianSettings = {
  enabled: false,
  vaultUri: '',
  vaultFolderName: 'TreNote',
  exportMode: 'dedicated',
  syncOnLaunch: true,
  scheduleTime: '22:00',
  exportWorkouts: true,
  exportExercises: true,
  exportWater: true,
  exportTime: true,
  exportHabits: true,
  exportRoutines: true,
  folderWorkouts: 'Workouts',
  folderExercises: 'Exercises',
  folderWater: 'Water',
  folderTime: 'Time',
  folderHabits: 'Habits',
  folderRoutines: 'Routines',
  folderDaily: 'Daily',
  lastSyncTimestamp: 0,
};

/**
 * DBからObsidian連携設定を読み込む
 */
export const getObsidianSettings = async (): Promise<ObsidianSettings> => {
  try {
    const dbSettings = await getSettings();
    return {
      enabled: dbSettings['obsidian_export_enabled'] === '1',
      vaultUri: dbSettings['obsidian_vault_uri'] || '',
      vaultFolderName: dbSettings['obsidian_vault_folder'] || 'TreNote',
      exportMode: (dbSettings['obsidian_export_mode'] as ObsidianExportMode) || 'dedicated',
      syncOnLaunch: dbSettings['obsidian_sync_on_launch'] !== '0', // デフォルト true
      scheduleTime: dbSettings['obsidian_schedule_time'] || '22:00',
      exportWorkouts: dbSettings['obsidian_export_workouts'] !== '0',
      exportExercises: dbSettings['obsidian_export_exercises'] !== '0',
      exportWater: dbSettings['obsidian_export_water'] !== '0',
      exportTime: dbSettings['obsidian_export_time'] !== '0',
      exportHabits: dbSettings['obsidian_export_habits'] !== '0',
      exportRoutines: dbSettings['obsidian_export_routines'] !== '0',
      folderWorkouts: dbSettings['obsidian_folder_workouts'] ?? 'Workouts',
      folderExercises: dbSettings['obsidian_folder_exercises'] ?? 'Exercises',
      folderWater: dbSettings['obsidian_folder_water'] ?? 'Water',
      folderTime: dbSettings['obsidian_folder_time'] ?? 'Time',
      folderHabits: dbSettings['obsidian_folder_habits'] ?? 'Habits',
      folderRoutines: dbSettings['obsidian_folder_routines'] ?? 'Routines',
      folderDaily: dbSettings['obsidian_folder_daily'] ?? 'Daily',
      lastSyncTimestamp: parseInt(dbSettings['obsidian_last_sync_timestamp'] || '0', 10),
    };
  } catch (e) {
    console.warn('Failed to load obsidian settings:', e);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Obsidian連携設定を保存する
 */
export const saveObsidianSettings = async (settings: Partial<ObsidianSettings>): Promise<void> => {
  try {
    if (settings.enabled !== undefined) await saveSetting('obsidian_export_enabled', settings.enabled ? '1' : '0');
    if (settings.vaultUri !== undefined) await saveSetting('obsidian_vault_uri', settings.vaultUri);
    if (settings.vaultFolderName !== undefined) await saveSetting('obsidian_vault_folder', settings.vaultFolderName);
    if (settings.exportMode !== undefined) await saveSetting('obsidian_export_mode', settings.exportMode);
    if (settings.syncOnLaunch !== undefined) await saveSetting('obsidian_sync_on_launch', settings.syncOnLaunch ? '1' : '0');
    if (settings.scheduleTime !== undefined) await saveSetting('obsidian_schedule_time', settings.scheduleTime);
    if (settings.exportWorkouts !== undefined) await saveSetting('obsidian_export_workouts', settings.exportWorkouts ? '1' : '0');
    if (settings.exportExercises !== undefined) await saveSetting('obsidian_export_exercises', settings.exportExercises ? '1' : '0');
    if (settings.exportWater !== undefined) await saveSetting('obsidian_export_water', settings.exportWater ? '1' : '0');
    if (settings.exportTime !== undefined) await saveSetting('obsidian_export_time', settings.exportTime ? '1' : '0');
    if (settings.exportHabits !== undefined) await saveSetting('obsidian_export_habits', settings.exportHabits ? '1' : '0');
    if (settings.exportRoutines !== undefined) await saveSetting('obsidian_export_routines', settings.exportRoutines ? '1' : '0');
    if (settings.folderWorkouts !== undefined) await saveSetting('obsidian_folder_workouts', settings.folderWorkouts);
    if (settings.folderExercises !== undefined) await saveSetting('obsidian_folder_exercises', settings.folderExercises);
    if (settings.folderWater !== undefined) await saveSetting('obsidian_folder_water', settings.folderWater);
    if (settings.folderTime !== undefined) await saveSetting('obsidian_folder_time', settings.folderTime);
    if (settings.folderHabits !== undefined) await saveSetting('obsidian_folder_habits', settings.folderHabits);
    if (settings.folderRoutines !== undefined) await saveSetting('obsidian_folder_routines', settings.folderRoutines);
    if (settings.folderDaily !== undefined) await saveSetting('obsidian_folder_daily', settings.folderDaily);
    if (settings.lastSyncTimestamp !== undefined) await saveSetting('obsidian_last_sync_timestamp', settings.lastSyncTimestamp.toString());
  } catch (e) {
    console.error('Failed to save obsidian settings:', e);
  }
};

/**
 * Android StorageAccessFramework でフォルダ選択権限をリクエスト
 */
export const requestVaultDirectoryPermission = async (): Promise<string | null> => {
  try {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      const uri = permissions.directoryUri;
      await saveObsidianSettings({ vaultUri: uri, enabled: true });
      return uri;
    }
  } catch (e) {
    console.error('Failed to request directory permissions:', e);
  }
  return null;
};

/**
 * SAF URI からデコード済みの純粋なファイル名（basename）を取り出すヘルパー
 */
const getBasenameFromUri = (uri: string): string => {
  if (!uri) return '';
  try {
    const decoded = decodeURIComponent(uri);
    const clean = decoded.split('?')[0];
    const trimmed = clean.endsWith('/') ? clean.slice(0, -1) : clean;
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash !== -1) {
      return trimmed.substring(lastSlash + 1);
    }
    const lastColon = trimmed.lastIndexOf(':');
    if (lastColon !== -1) {
      return trimmed.substring(lastColon + 1);
    }
    return trimmed;
  } catch (_) {
    return uri;
  }
};

/**
 * Vaultルート内の指定サブフォルダURIを取得、無ければ自動作成してそのURIを返す
 */
export const getOrCreateSubfolderUri = async (
  parentUri: string,
  folderName: string
): Promise<string> => {
  if (!parentUri) return '';
  const cleanName = (folderName || '').trim().replace(/[\/\\?%*:|"<>]/g, '');
  if (!cleanName) return parentUri;

  try {
    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
    for (const fUri of files) {
      const base = getBasenameFromUri(fUri);
      if (base === cleanName) {
        return fUri;
      }
    }
    // 存在しない場合は新規作成
    const newDirectoryUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(parentUri, cleanName);
    return newDirectoryUri;
  } catch (e) {
    console.error(`Failed to get or create subfolder '${folderName}':`, e);
    return parentUri;
  }
};

/**
 * ディレクトリ内にファイルを書き出し・追記する内部ヘルパー (失敗時のフォールバック保護機能付き)
 */
const writeOrAppendFileToVault = async (
  parentUri: string,
  fileName: string,
  content: string,
  appendMode: boolean = false,
  fallbackVaultUri?: string
): Promise<boolean> => {
  if (!parentUri) return false;

  const tryWrite = async (targetUri: string): Promise<boolean> => {
    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(targetUri);
      let targetFileUri: string | null = null;

      // 同名ファイルを完全一致で検索
      for (const fUri of files) {
        const base = getBasenameFromUri(fUri);
        if (base === fileName) {
          targetFileUri = fUri;
          break;
        }
      }

      if (targetFileUri) {
        if (appendMode) {
          const existingContent = await FileSystem.StorageAccessFramework.readAsStringAsync(targetFileUri);
          const sectionHeader = '## 🏋️ TreNote Log';
          if (existingContent.includes(sectionHeader)) {
            const parts = existingContent.split(sectionHeader);
            const newContent = parts[0].trimEnd() + '\n\n' + content;
            await FileSystem.StorageAccessFramework.writeAsStringAsync(targetFileUri, newContent);
          } else {
            const newContent = existingContent.trimEnd() + '\n\n' + content;
            await FileSystem.StorageAccessFramework.writeAsStringAsync(targetFileUri, newContent);
          }
        } else {
          await FileSystem.StorageAccessFramework.writeAsStringAsync(targetFileUri, content);
        }
      } else {
        targetFileUri = await FileSystem.StorageAccessFramework.createFileAsync(targetUri, fileName, 'text/markdown');
        await FileSystem.StorageAccessFramework.writeAsStringAsync(targetFileUri, content);
      }
      return true;
    } catch (e) {
      console.warn(`Write attempt failed for targetUri: ${targetUri}, file: ${fileName}:`, e);
      return false;
    }
  };

  // 1. 指定のターゲットフォルダで書き出しを試行
  let ok = await tryWrite(parentUri);
  if (ok) return true;

  // 2. 万が一失敗した場合、Vault ルート URI へフォールバック保存を再試行
  if (fallbackVaultUri && fallbackVaultUri !== parentUri) {
    console.warn(`Fallback writing file ${fileName} directly to Vault root: ${fallbackVaultUri}`);
    ok = await tryWrite(fallbackVaultUri);
    return ok;
  }

  return false;
};

/**
 * 筋トレ詳細ノート用の Markdown を生成 (オプションで同日のライフログも付与)
 */
export {
  DayLifelogData,
  ExerciseHistoryItem,
  ExerciseNoteData,
  formatSecondsToReadable,
  normalizeToDateISO,
  formatWorkoutToObsidianMarkdown,
  formatDailyLogToObsidianMarkdown,
  fetchDayLifelogData,
  formatExerciseToObsidianMarkdown,
  formatRoutineToObsidianMarkdown,
} from './obsidian/obsidianFormatter';
import {
  DayLifelogData,
  ExerciseHistoryItem,
  ExerciseNoteData,
  formatSecondsToReadable,
  normalizeToDateISO,
  formatWorkoutToObsidianMarkdown,
  formatDailyLogToObsidianMarkdown,
  fetchDayLifelogData,
  formatExerciseToObsidianMarkdown,
  formatRoutineToObsidianMarkdown,
} from './obsidian/obsidianFormatter';


/**
 * 特定種目のノートを生成・更新してVaultの種目フォルダに書き出す
 */
export const exportExerciseNoteToVault = async (
  exerciseId: number,
  exerciseName: string,
  exerciseFolderUri: string,
  vaultUri?: string
): Promise<boolean> => {
  try {
    const conn = getDB();
    const exInfo = await conn.getFirstAsync<{ name: string; muscle_group: string; equipment: string }>(
      'SELECT name, muscle_group, equipment FROM exercises WHERE id = ?',
      [exerciseId]
    );

    const rows = await conn.getAllAsync<{
      start_time: string;
      set_number: number;
      weight: number;
      reps: number;
      rpe: number;
      stance: string;
      work_seconds: number;
      rest_seconds: number;
    }>(
      `SELECT w.start_time, ws.set_number, ws.weight, ws.reps, ws.rpe, ws.stance, ws.work_seconds, ws.rest_seconds
       FROM workout_sets ws
       JOIN workout_exercises we ON ws.workout_exercise_id = we.id
       JOIN workouts w ON we.workout_id = w.id
       WHERE we.exercise_id = ?
       ORDER BY w.start_time DESC, ws.set_number ASC`,
      [exerciseId]
    );

    const history: ExerciseHistoryItem[] = rows.map((r) => ({
      date: normalizeToDateISO(r.start_time) || r.start_time,
      set_number: r.set_number,
      weight: r.weight,
      reps: r.reps,
      rpe: r.rpe,
      stance: r.stance,
      work_seconds: r.work_seconds,
      rest_seconds: r.rest_seconds,
    }));

    if (!history || history.length === 0) {
      // 記録が存在しない種目は出力スキップ
      return true;
    }

    const exData: ExerciseNoteData = {
      name: exInfo?.name || exerciseName,
      muscle_group: exInfo?.muscle_group,
      equipment: exInfo?.equipment,
      history,
    };

    const md = formatExerciseToObsidianMarkdown(exData);
    const cleanFileName = `${(translateExercise(exData.name)).replace(/[\/\\?%*:|"<>]/g, '_')}.md`;
    return await writeOrAppendFileToVault(exerciseFolderUri, cleanFileName, md, false, vaultUri);
  } catch (e) {
    console.error(`Failed to export exercise note for ${exerciseName}:`, e);
    return false;
  }
};

/**
 * 登録されている全ルーティン（ルーティン管理機能）を Vault のルーティンフォルダへ書き出す
 */
export const exportAllRoutinesToVault = async (routineFolderUri: string, vaultUri?: string): Promise<boolean> => {
  try {
    const conn = getDB();
    const row = await conn.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'routine_tracker_data'"
    );
    if (!row || !row.value) return true;

    let routines: any[] = [];
    try {
      routines = JSON.parse(row.value);
    } catch (e) {
      console.warn('Failed to parse routine_tracker_data in exportAllRoutinesToVault:', e);
      return true;
    }

    if (!Array.isArray(routines) || routines.length === 0) return true;

    for (const r of routines) {
      if (r.hidden) continue; // 非表示のルーティンは除外
      const md = formatRoutineToObsidianMarkdown(r);
      const fileName = `${(r.name || 'routine').replace(/[\/\\?%*:|"<>]/g, '_')}.md`;
      await writeOrAppendFileToVault(routineFolderUri, fileName, md, false, vaultUri);
    }
    return true;
  } catch (e) {
    console.error('Failed to export routines to Vault:', e);
    return false;
  }
};

/**
 * 筋トレ完了時に即時エクスポート
 */
export const exportWorkoutToObsidian = async (workoutId: number): Promise<boolean> => {
  const settings = await getObsidianSettings();
  if (!settings.enabled || !settings.vaultUri) {
    return false;
  }

  try {
    const workoutData = await loadFullWorkoutData(workoutId);
    if (!workoutData) return false;

    const dateOnly = format(new Date(workoutData.start_time), 'yyyy-MM-dd');
    const dayData = await fetchDayLifelogData(dateOnly, settings);

    let success = false;

    // 保存先フォルダURIの解決
    const workoutsFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderWorkouts);
    const exercisesFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderExercises);
    const routinesFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderRoutines);
    const dailyFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderDaily);

    // 1. 個別筋トレノートのエクスポート (exportWorkouts が true かつ append 以外)
    if (settings.exportWorkouts && settings.exportMode !== 'append') {
      const workoutMd = formatWorkoutToObsidianMarkdown(workoutData, dayData);
      const timePrefix = workoutData.start_time ? format(new Date(workoutData.start_time), 'HHmm') : '';
      const fileName = `${dateOnly}_${timePrefix ? timePrefix + '_' : ''}${(workoutData.title || 'workout').replace(/[\/\\?%*:|"<>]/g, '_')}.md`;
      success = await writeOrAppendFileToVault(workoutsFolderUri, fileName, workoutMd, false, settings.vaultUri);
    }

    // 2. 種目ノートのエクスポート (exportExercises が true)
    if (settings.exportExercises && workoutData.exercises && workoutData.exercises.length > 0) {
      for (const ex of workoutData.exercises) {
        await exportExerciseNoteToVault(ex.exercise_id, ex.exercise_name || (ex as any).name, exercisesFolderUri, settings.vaultUri);
      }
    }

    // 3. ルーティンノートのエクスポート (exportRoutines が true)
    if (settings.exportRoutines) {
      await exportAllRoutinesToVault(routinesFolderUri, settings.vaultUri);
    }

    // 4. 統合デイリーノートのエクスポート (筋トレ＋水分＋時間＋習慣)
    const dailyMd = formatDailyLogToObsidianMarkdown(
      dateOnly,
      dayData.workouts.length > 0 ? dayData.workouts : [workoutData],
      dayData.waterLogs,
      dayData.timeLogs,
      dayData.habitLogs,
      dayData.routineLogs
    );

    if (settings.exportMode === 'append') {
      const dailyFileName = `${dateOnly}.md`;
      success = await writeOrAppendFileToVault(dailyFolderUri, dailyFileName, dailyMd, true, settings.vaultUri);
    } else {
      const dailyFileName = `TreNote_${dateOnly}.md`;
      success = await writeOrAppendFileToVault(dailyFolderUri, dailyFileName, dailyMd, false, settings.vaultUri);
    }

    return success;
  } catch (e) {
    console.error('Failed to export workout to Obsidian:', e);
    return false;
  }
};

/**
 * アプリ起動時およびスケジュール時刻到達時のライフログ自動同期
 */
export const syncLifelogToObsidian = async (force: boolean = false): Promise<boolean> => {
  const settings = await getObsidianSettings();
  if (!settings.enabled || !settings.vaultUri) return false;

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  if (!force) {
    if (!settings.syncOnLaunch) {
      const [schedHours, schedMins] = settings.scheduleTime.split(':').map(Number);
      const schedTime = new Date(now);
      schedTime.setHours(schedHours || 22, schedMins || 0, 0, 0);

      if (settings.lastSyncTimestamp >= schedTime.getTime()) {
        return false;
      }
    }
  }

  try {
    const dayData = await fetchDayLifelogData(todayStr, settings);

    const waterFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderWater);
    const timeFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderTime);
    const habitsFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderHabits);
    const dailyFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderDaily);

    let hasAnyData = false;

    // 個別カテゴリフォルダへの保存 (水・時間・習慣)
    if (settings.exportWater && dayData.waterLogs.length > 0) {
      hasAnyData = true;
      const totalWater = dayData.waterLogs.reduce((sum, item) => sum + (item.amount || 0), 0);
      let waterMd = `# 💧 水分補給ログ (${todayStr})\n\n- **合計**: ${totalWater} ml\n\n| Time | Amount | Caffeine |\n|---|---|---|\n`;
      dayData.waterLogs.forEach((item) => {
        const time = item.timestamp ? format(new Date(item.timestamp), 'HH:mm') : '-';
        waterMd += `| ${time} | ${item.amount} ml | ${item.caffeine || 0} mg |\n`;
      });
      await writeOrAppendFileToVault(waterFolderUri, `${todayStr}_water.md`, waterMd, false, settings.vaultUri);
    }

    if (settings.exportTime && dayData.timeLogs.length > 0) {
      hasAnyData = true;
      const totalMins = dayData.timeLogs.reduce((sum, item) => sum + (item.duration_minutes != null ? item.duration_minutes : (item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 0)), 0);
      let timeMd = `# ⏱ 時間管理ログ (${todayStr})\n\n- **総集中時間**: ${totalMins} 分\n\n| Activity | Duration | Notes |\n|---|---|---|\n`;
      dayData.timeLogs.forEach((item) => {
        const mins = item.duration_minutes != null ? item.duration_minutes : (item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 0);
        const name = item.activity_name || item.category || item.name || '作業';
        timeMd += `| ${name} | ${mins} 分 | ${item.notes || '-'} |\n`;
      });
      await writeOrAppendFileToVault(timeFolderUri, `${todayStr}_time.md`, timeMd, false, settings.vaultUri);
    }

    if (settings.exportHabits && dayData.habitLogs.length > 0) {
      hasAnyData = true;
      let habitMd = `# ✅ 習慣カウンターログ (${todayStr})\n\n| Habit | Count |\n|---|---|\n`;
      dayData.habitLogs.forEach((h) => {
        habitMd += `| ${h.name} | ${h.count} 回 |\n`;
      });
      await writeOrAppendFileToVault(habitsFolderUri, `${todayStr}_habits.md`, habitMd, false, settings.vaultUri);
    }

    if (dayData.workouts.length > 0 || (dayData.routineLogs && dayData.routineLogs.length > 0)) {
      hasAnyData = true;
    }

    if (!hasAnyData) {
      return false;
    }

    const dailyMd = formatDailyLogToObsidianMarkdown(
      todayStr,
      dayData.workouts,
      dayData.waterLogs,
      dayData.timeLogs,
      dayData.habitLogs,
      dayData.routineLogs
    );
    let success = false;

    if (settings.exportMode === 'append') {
      const fileName = `${todayStr}.md`;
      success = await writeOrAppendFileToVault(dailyFolderUri, fileName, dailyMd, true, settings.vaultUri);
    } else {
      const fileName = `TreNote_${todayStr}.md`;
      success = await writeOrAppendFileToVault(dailyFolderUri, fileName, dailyMd, false, settings.vaultUri);
    }

    if (success) {
      await saveObsidianSettings({ lastSyncTimestamp: Date.now() });
    }
    return success;
  } catch (e) {
    console.error('Failed to sync lifelog to Obsidian:', e);
    return false;
  }
};

/**
 * 全過去ログ（筋トレ・種目・水分・時間・習慣・ルーティン）の一括エクスポート
 */
export interface ObsidianExportResult {
  successCount: number;
  failCount: number;
  details: {
    dailyCount: number;
    workoutsCount: number;
    exercisesCount: number;
    waterCount: number;
    timeCount: number;
    habitsCount: number;
    routinesCount: number;
  };
}

/**
 * 全過去ログ（筋トレ・種目・水分・時間・習慣・ルーティン）の一括エクスポート
 */
export const exportAllDataToObsidian = async (): Promise<ObsidianExportResult> => {
  const settings = await getObsidianSettings();
  if (!settings.enabled || !settings.vaultUri) {
    throw new Error('Obsidian Vault が設定されていません。マイページでフォルダを選択してください。');
  }

  const conn = getDB();
  const datesSet = new Set<string>();

  const workoutsFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderWorkouts);
  const exercisesFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderExercises);
  const waterFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderWater);
  const timeFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderTime);
  const habitsFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderHabits);
  const routinesFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderRoutines);
  const dailyFolderUri = await getOrCreateSubfolderUri(settings.vaultUri, settings.folderDaily);

  if (settings.exportWorkouts) {
    const rows = await conn.getAllAsync<{ start_time: string }>('SELECT start_time FROM workouts WHERE start_time IS NOT NULL');
    rows.forEach((r) => {
      const dISO = normalizeToDateISO(r.start_time);
      if (dISO) datesSet.add(dISO);
    });
  }

  if (settings.exportWater) {
    const rows = await conn.getAllAsync<{ date: string; timestamp: number }>('SELECT date, timestamp FROM water_logs');
    rows.forEach((r) => {
      const dISO = normalizeToDateISO(r.date) || normalizeToDateISO(r.timestamp);
      if (dISO) datesSet.add(dISO);
    });
  }

  if (settings.exportTime) {
    const rows = await conn.getAllAsync<{ date: string; start_time: string }>('SELECT date, start_time FROM time_logs');
    rows.forEach((r) => {
      const dISO = normalizeToDateISO(r.date) || normalizeToDateISO(r.start_time);
      if (dISO) datesSet.add(dISO);
    });
  }

  if (settings.exportHabits) {
    const rows = await conn.getAllAsync<{ date: string; timestamp: number }>('SELECT date, timestamp FROM habit_logs');
    rows.forEach((r) => {
      const dISO = normalizeToDateISO(r.date) || normalizeToDateISO(r.timestamp);
      if (dISO) datesSet.add(dISO);
    });
  }

  if (settings.exportRoutines) {
    const row = await conn.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'routine_tracker_data'"
    );
    if (row && row.value) {
      try {
        const routines = JSON.parse(row.value);
        if (Array.isArray(routines)) {
          routines.forEach((r: any) => {
            if (r.history && Array.isArray(r.history)) {
              r.history.forEach((h: any) => {
                const dISO = normalizeToDateISO(h.timestamp);
                if (dISO) datesSet.add(dISO);
              });
            }
          });
        }
      } catch (e) {
        console.warn('Failed to parse routine_tracker_data in exportAllDataToObsidian:', e);
      }
    }
  }

  let dailyCount = 0;
  let workoutsCount = 0;
  let exercisesCount = 0;
  let waterCount = 0;
  let timeCount = 0;
  let habitsCount = 0;
  let routinesCount = 0;
  let failCount = 0;

  // 1. トレーニング記録が存在する種目ノートのみ一括出力
  if (settings.exportExercises) {
    try {
      const activeExercises = await conn.getAllAsync<{ id: number; name: string }>(
        `SELECT DISTINCT e.id, e.name
         FROM exercises e
         JOIN workout_exercises we ON e.id = we.exercise_id
         JOIN workout_sets ws ON we.id = ws.workout_exercise_id`
      );
      for (const ex of activeExercises) {
        const ok = await exportExerciseNoteToVault(ex.id, ex.name, exercisesFolderUri, settings.vaultUri);
        if (ok) exercisesCount++;
        else failCount++;
      }
    } catch (e) {
      console.error('Failed to export all exercises:', e);
      failCount++;
    }
  }

  // 2. ルーティンノートを一括出力
  if (settings.exportRoutines) {
    try {
      const ok = await exportAllRoutinesToVault(routinesFolderUri, settings.vaultUri);
      if (ok) routinesCount++;
      else failCount++;
    } catch (e) {
      console.error('Failed to export all routines:', e);
      failCount++;
    }
  }

  // 3. 日付ごとのログを出力
  const sortedDates = Array.from(datesSet).sort();

  for (const dateStr of sortedDates) {
    try {
      const dayData = await fetchDayLifelogData(dateStr, settings);

      if (settings.exportWorkouts && settings.exportMode !== 'append') {
        for (const workoutData of dayData.workouts) {
          const workoutMd = formatWorkoutToObsidianMarkdown(workoutData, dayData);
          const timePrefix = workoutData.start_time ? format(new Date(workoutData.start_time), 'HHmm') : '';
          const fileName = `${dateStr}_${timePrefix ? timePrefix + '_' : ''}${(workoutData.title || 'workout').replace(/[\/\\?%*:|"<>]/g, '_')}.md`;
          const ok = await writeOrAppendFileToVault(workoutsFolderUri, fileName, workoutMd, false, settings.vaultUri);
          if (ok) workoutsCount++;
          else failCount++;
        }
      }

      if (settings.exportWater && dayData.waterLogs.length > 0) {
        const totalWater = dayData.waterLogs.reduce((sum, item) => sum + (item.amount || 0), 0);
        let waterMd = `# 💧 水分補給ログ (${dateStr})\n\n- **合計**: ${totalWater} ml\n\n| Time | Amount | Caffeine |\n|---|---|---|\n`;
        dayData.waterLogs.forEach((item) => {
          const time = item.timestamp ? format(new Date(item.timestamp), 'HH:mm') : '-';
          waterMd += `| ${time} | ${item.amount} ml | ${item.caffeine || 0} mg |\n`;
        });
        const ok = await writeOrAppendFileToVault(waterFolderUri, `${dateStr}_water.md`, waterMd, false, settings.vaultUri);
        if (ok) waterCount++;
        else failCount++;
      }

      if (settings.exportTime && dayData.timeLogs.length > 0) {
        const totalMins = dayData.timeLogs.reduce((sum, item) => sum + (item.duration_minutes != null ? item.duration_minutes : (item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 0)), 0);
        let timeMd = `# ⏱ 時間管理ログ (${dateStr})\n\n- **総集中時間**: ${totalMins} 分\n\n| Activity | Duration | Notes |\n|---|---|---|\n`;
        dayData.timeLogs.forEach((item) => {
          const mins = item.duration_minutes != null ? item.duration_minutes : (item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 0);
          const name = item.activity_name || item.category || item.name || '作業';
          timeMd += `| ${name} | ${mins} 分 | ${item.notes || '-'} |\n`;
        });
        const ok = await writeOrAppendFileToVault(timeFolderUri, `${dateStr}_time.md`, timeMd, false, settings.vaultUri);
        if (ok) timeCount++;
        else failCount++;
      }

      if (settings.exportHabits && dayData.habitLogs.length > 0) {
        let habitMd = `# ✅ 習慣カウンターログ (${dateStr})\n\n| Habit | Count |\n|---|---|\n`;
        dayData.habitLogs.forEach((h) => {
          habitMd += `| ${h.name} | ${h.count} 回 |\n`;
        });
        const ok = await writeOrAppendFileToVault(habitsFolderUri, `${dateStr}_habits.md`, habitMd, false);
        if (ok) habitsCount++;
        else failCount++;
      }

      const dailyMd = formatDailyLogToObsidianMarkdown(
        dateStr,
        dayData.workouts,
        dayData.waterLogs,
        dayData.timeLogs,
        dayData.habitLogs,
        dayData.routineLogs
      );

      let success = false;
      if (settings.exportMode === 'append') {
        const dailyFileName = `${dateStr}.md`;
        success = await writeOrAppendFileToVault(dailyFolderUri, dailyFileName, dailyMd, true);
      } else {
        const dailyFileName = `TreNote_${dateStr}.md`;
        success = await writeOrAppendFileToVault(dailyFolderUri, dailyFileName, dailyMd, false);
      }

      if (success) dailyCount++;
      else failCount++;
    } catch (e) {
      console.error(`Failed to export data for date ${dateStr}:`, e);
      failCount++;
    }
  }

  const successCount = dailyCount + workoutsCount + exercisesCount + waterCount + timeCount + habitsCount + routinesCount;

  await saveObsidianSettings({ lastSyncTimestamp: Date.now() });

  return {
    successCount,
    failCount,
    details: {
      dailyCount,
      workoutsCount,
      exercisesCount,
      waterCount,
      timeCount,
      habitsCount,
      routinesCount,
    },
  };
};


