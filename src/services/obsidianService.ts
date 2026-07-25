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
  exportWater: boolean;
  exportTime: boolean;
  exportHabits: boolean;
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
  exportWater: true,
  exportTime: true,
  exportHabits: true,
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
      exportWater: dbSettings['obsidian_export_water'] !== '0',
      exportTime: dbSettings['obsidian_export_time'] !== '0',
      exportHabits: dbSettings['obsidian_export_habits'] !== '0',
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
    if (settings.exportWater !== undefined) await saveSetting('obsidian_export_water', settings.exportWater ? '1' : '0');
    if (settings.exportTime !== undefined) await saveSetting('obsidian_export_time', settings.exportTime ? '1' : '0');
    if (settings.exportHabits !== undefined) await saveSetting('obsidian_export_habits', settings.exportHabits ? '1' : '0');
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
 * ディレクトリ内にファイルを書き出し・追記する内部ヘルパー
 */
const writeOrAppendFileToVault = async (
  parentUri: string,
  fileName: string,
  content: string,
  appendMode: boolean = false
): Promise<boolean> => {
  try {
    if (!parentUri) return false;

    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
    let targetFileUri: string | null = null;

    // 同名ファイルを検索
    for (const fUri of files) {
      const decodedName = decodeURIComponent(fUri);
      if (decodedName.endsWith('/' + fileName) || decodedName.endsWith('%2F' + fileName) || decodedName.endsWith(fileName)) {
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
      targetFileUri = await FileSystem.StorageAccessFramework.createFileAsync(parentUri, fileName, 'text/markdown');
      await FileSystem.StorageAccessFramework.writeAsStringAsync(targetFileUri, content);
    }
    return true;
  } catch (e) {
    console.error(`Failed to write file ${fileName} to Vault:`, e);
    return false;
  }
};

/**
 * 筋トレ詳細ノート用の Markdown を生成
 */
export const formatWorkoutToObsidianMarkdown = (workoutData: any): string => {
  const dateStr = format(new Date(workoutData.start_time), 'yyyy-MM-dd HH:mm');
  const dateOnly = format(new Date(workoutData.start_time), 'yyyy-MM-dd');
  
  let md = `---\n`;
  md += `title: "${workoutData.title || 'Workout'}"\n`;
  md += `date: ${dateStr}\n`;
  md += `type: workout\n`;
  md += `tags:\n  - trenote\n  - workout\n`;
  md += `---\n\n`;

  md += `# 🏋️ ${workoutData.title || 'Workout'} (${dateOnly})\n\n`;
  md += `- **${i18n.t('ui.markdown.date_label') || '日付'}**: ${dateStr}\n`;
  if (workoutData.notes) {
    md += `- **メモ**: ${workoutData.notes}\n`;
  }
  md += `\n---\n\n`;

  if (workoutData.exercises && workoutData.exercises.length > 0) {
    workoutData.exercises.forEach((ex: any, idx: number) => {
      md += `### ${idx + 1}. ${translateExercise(ex.exercise_name || ex.name)}\n`;
      if (ex.notes) md += `*メモ: ${ex.notes}*\n\n`;

      md += `| Set | Stance | Weight | Reps | RPE | Time/Rest |\n`;
      md += `|---|---|---|---|---|---|\n`;

      if (ex.sets) {
        ex.sets.forEach((set: any) => {
          const w = set.weight ? `${set.weight} ${i18n.t('ui.common.weight_unit') || 'kg'}` : '-';
          const r = set.reps ? `${set.reps}` : '-';
          const rpe = set.rpe ? `@${set.rpe}` : '-';
          const stance = set.stance ? translateStance(set.stance) : '-';
          let timeStr = '';
          const fmtTime = (secs: number) => {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
          };
          if (set.work_seconds != null) timeStr += `${fmtTime(set.work_seconds)}`;
          if (set.rest_seconds != null) {
            if (timeStr) timeStr += ' / ';
            timeStr += `rest ${fmtTime(set.rest_seconds)}`;
          }
          if (!timeStr) timeStr = '-';
          md += `| ${set.set_number} | ${stance} | ${w} | ${r} | ${rpe} | ${timeStr} |\n`;
        });
      }
      md += `\n`;
    });
  }
  return md;
};

/**
 * 統合デイリーノート用の Markdown を生成
 */
export const formatDailyLogToObsidianMarkdown = (
  dateStr: string, // YYYY-MM-DD
  workouts: any[],
  waterLogs: any[],
  timeLogs: any[],
  habitLogs: any[]
): string => {
  let md = `## 🏋️ TreNote Log (${dateStr})\n\n`;

  // 1. 筋トレサマリー
  if (workouts && workouts.length > 0) {
    md += `### 🏋️ 本日のトレーニング (${workouts.length}件)\n`;
    workouts.forEach((w) => {
      md += `- **${w.title || 'Workout'}** (${format(new Date(w.start_time), 'HH:mm')})\n`;
      if (w.exercises && w.exercises.length > 0) {
        w.exercises.forEach((ex: any) => {
          const setCount = ex.sets ? ex.sets.length : 0;
          md += `  - ${translateExercise(ex.exercise_name || ex.name)}: ${setCount} sets\n`;
        });
      }
    });
    md += `\n`;
  }

  // 2. 水分補給
  if (waterLogs && waterLogs.length > 0) {
    const totalWater = waterLogs.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalCaffeine = waterLogs.reduce((sum, item) => sum + (item.caffeine || 0), 0);
    md += `### 💧 水分補給\n`;
    md += `- **本日合計**: ${totalWater} ml\n`;
    if (totalCaffeine > 0) md += `- **カフェイン**: ${totalCaffeine} mg\n`;
    md += `- **記録内訳**:\n`;
    waterLogs.forEach((item) => {
      const time = item.timestamp ? format(new Date(item.timestamp), 'HH:mm') : '';
      const cafStr = item.caffeine ? ` (カフェイン ${item.caffeine}mg)` : '';
      md += `  - ${time ? time + ' - ' : ''}${item.amount} ml${cafStr}\n`;
    });
    md += `\n`;
  }

  // 3. 時間管理 (Time Log)
  if (timeLogs && timeLogs.length > 0) {
    const totalSecs = timeLogs.reduce((sum, item) => sum + (item.duration_seconds || 0), 0);
    const totalMins = Math.floor(totalSecs / 60);
    md += `### ⏱ 時間管理 (集中タイマー)\n`;
    md += `- **総集中時間**: ${totalMins} 分\n`;
    timeLogs.forEach((item) => {
      const mins = Math.floor((item.duration_seconds || 0) / 60);
      md += `  - ${item.category || '作業'}: ${mins}分 (${item.notes || ''})\n`;
    });
    md += `\n`;
  }

  // 4. 習慣カウンター
  if (habitLogs && habitLogs.length > 0) {
    md += `### ✅ 習慣カウンター\n`;
    habitLogs.forEach((h) => {
      const isCompleted = h.completed || h.count >= (h.target_count || 1);
      const check = isCompleted ? '[x]' : '[ ]';
      const countStr = h.target_count && h.target_count > 1 ? ` (${h.count}/${h.target_count})` : '';
      md += `- ${check} ${h.name}${countStr}\n`;
    });
    md += `\n`;
  }

  return md;
};

/**
 * 指定された日付 (YYYY-MM-DD) のライフログ（筋トレ・水分・時間・習慣）をDBから一括取得するヘルパー
 */
export interface DayLifelogData {
  workouts: any[];
  waterLogs: any[];
  timeLogs: any[];
  habitLogs: any[];
}

export const fetchDayLifelogData = async (
  dateStr: string,
  settings: ObsidianSettings
): Promise<DayLifelogData> => {
  const conn = getDB();

  const waterLogs = settings.exportWater ? await getWaterLogs(dateStr) : [];

  const timeLogs = settings.exportTime ? await conn.getAllAsync<any>(
    'SELECT * FROM time_logs WHERE date = ? ORDER BY timestamp DESC',
    [dateStr]
  ) : [];

  const habitLogs = settings.exportHabits ? await conn.getAllAsync<any>(
    'SELECT h.name, h.target_count, hl.count, hl.completed FROM habit_items h LEFT JOIN habit_logs hl ON h.id = hl.item_id AND hl.date = ?',
    [dateStr]
  ) : [];

  let workouts: any[] = [];
  if (settings.exportWorkouts) {
    const workoutRows = await conn.getAllAsync<{ id: number }>(
      'SELECT id FROM workouts WHERE DATE(start_time) = ?',
      [dateStr]
    );
    for (const w of workoutRows) {
      const fullData = await loadFullWorkoutData(w.id);
      if (fullData) workouts.push(fullData);
    }
  }

  return { workouts, waterLogs, timeLogs, habitLogs };
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

    // 個別筋トレノートのエクスポート (exportWorkouts が true かつ append 以外)
    if (settings.exportWorkouts && settings.exportMode !== 'append') {
      const workoutMd = formatWorkoutToObsidianMarkdown(workoutData);
      const fileName = `${dateOnly}_${(workoutData.title || 'workout').replace(/[\/\\?%*:|"<>]/g, '_')}.md`;
      await writeOrAppendFileToVault(settings.vaultUri, fileName, workoutMd, false);
    }

    // 統合デイリーノートのエクスポート (筋トレ＋水分＋時間＋習慣)
    const dailyMd = formatDailyLogToObsidianMarkdown(
      dateOnly,
      dayData.workouts.length > 0 ? dayData.workouts : [workoutData],
      dayData.waterLogs,
      dayData.timeLogs,
      dayData.habitLogs
    );

    if (settings.exportMode === 'append') {
      const dailyFileName = `${dateOnly}.md`;
      success = await writeOrAppendFileToVault(settings.vaultUri, dailyFileName, dailyMd, true);
    } else {
      const dailyFileName = `TreNote_${dateOnly}.md`;
      success = await writeOrAppendFileToVault(settings.vaultUri, dailyFileName, dailyMd, false);
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

    if (
      dayData.waterLogs.length === 0 &&
      dayData.timeLogs.length === 0 &&
      dayData.habitLogs.length === 0 &&
      dayData.workouts.length === 0
    ) {
      return false;
    }

    const dailyMd = formatDailyLogToObsidianMarkdown(
      todayStr,
      dayData.workouts,
      dayData.waterLogs,
      dayData.timeLogs,
      dayData.habitLogs
    );
    let success = false;

    if (settings.exportMode === 'append') {
      const fileName = `${todayStr}.md`;
      success = await writeOrAppendFileToVault(settings.vaultUri, fileName, dailyMd, true);
    } else {
      const fileName = `TreNote_${todayStr}.md`;
      success = await writeOrAppendFileToVault(settings.vaultUri, fileName, dailyMd, false);
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
 * 全過去ログ（筋トレ・水分・時間・習慣）の一括エクスポート
 */
export const exportAllDataToObsidian = async (): Promise<{ successCount: number; failCount: number }> => {
  const settings = await getObsidianSettings();
  if (!settings.enabled || !settings.vaultUri) {
    throw new Error('Obsidian Vault が設定されていません。マイページでフォルダを選択してください。');
  }

  const conn = getDB();
  const datesSet = new Set<string>();

  if (settings.exportWorkouts) {
    const workoutDates = await conn.getAllAsync<{ d: string }>(
      "SELECT DISTINCT DATE(start_time) as d FROM workouts WHERE start_time IS NOT NULL"
    );
    workoutDates.forEach(r => { if (r.d) datesSet.add(r.d); });
  }

  if (settings.exportWater) {
    const waterDates = await conn.getAllAsync<{ d: string }>(
      "SELECT DISTINCT date as d FROM water_logs WHERE date IS NOT NULL"
    );
    waterDates.forEach(r => { if (r.d) datesSet.add(r.d); });
  }

  if (settings.exportTime) {
    const timeDates = await conn.getAllAsync<{ d: string }>(
      "SELECT DISTINCT date as d FROM time_logs WHERE date IS NOT NULL"
    );
    timeDates.forEach(r => { if (r.d) datesSet.add(r.d); });
  }

  if (settings.exportHabits) {
    const habitDates = await conn.getAllAsync<{ d: string }>(
      "SELECT DISTINCT date as d FROM habit_logs WHERE date IS NOT NULL"
    );
    habitDates.forEach(r => { if (r.d) datesSet.add(r.d); });
  }

  const sortedDates = Array.from(datesSet).sort();

  let successCount = 0;
  let failCount = 0;

  for (const dateStr of sortedDates) {
    try {
      const dayData = await fetchDayLifelogData(dateStr, settings);

      if (settings.exportWorkouts && settings.exportMode !== 'append') {
        for (const workoutData of dayData.workouts) {
          const workoutMd = formatWorkoutToObsidianMarkdown(workoutData);
          const fileName = `${dateStr}_${(workoutData.title || 'workout').replace(/[\/\\?%*:|"<>]/g, '_')}.md`;
          await writeOrAppendFileToVault(settings.vaultUri, fileName, workoutMd, false);
        }
      }

      const dailyMd = formatDailyLogToObsidianMarkdown(
        dateStr,
        dayData.workouts,
        dayData.waterLogs,
        dayData.timeLogs,
        dayData.habitLogs
      );

      let success = false;
      if (settings.exportMode === 'append') {
        const dailyFileName = `${dateStr}.md`;
        success = await writeOrAppendFileToVault(settings.vaultUri, dailyFileName, dailyMd, true);
      } else {
        const dailyFileName = `TreNote_${dateStr}.md`;
        success = await writeOrAppendFileToVault(settings.vaultUri, dailyFileName, dailyMd, false);
      }

      if (success) successCount++;
      else failCount++;
    } catch (e) {
      console.error(`Failed to export data for date ${dateStr}:`, e);
      failCount++;
    }
  }

  await saveObsidianSettings({ lastSyncTimestamp: Date.now() });

  return { successCount, failCount };
};

