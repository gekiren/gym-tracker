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
export const formatWorkoutToObsidianMarkdown = (workoutData: any, dayData?: DayLifelogData): string => {
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
      const exTranslated = translateExercise(ex.exercise_name || ex.name);
      md += `### ${idx + 1}. [[${exTranslated}]]\n`;
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
          if (set.work_seconds != null && set.work_seconds > 0) timeStr += `${fmtTime(set.work_seconds)}`;
          if (set.rest_seconds != null && set.rest_seconds > 0) {
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

  // もし同日のライフログデータが渡されていれば末尾に追加出力
  if (dayData) {
    const { waterLogs, timeLogs, habitLogs } = dayData;
    if ((waterLogs && waterLogs.length > 0) || (timeLogs && timeLogs.length > 0) || (habitLogs && habitLogs.length > 0)) {
      md += `---\n\n## 📊 本日のライフログサマリー\n\n`;

      if (waterLogs && waterLogs.length > 0) {
        const totalWater = waterLogs.reduce((sum, item) => sum + (item.amount || 0), 0);
        const totalCaffeine = waterLogs.reduce((sum, item) => sum + (item.caffeine || 0), 0);
        md += `### 💧 水分補給 (${totalWater} ml${totalCaffeine > 0 ? `, カフェイン ${totalCaffeine}mg` : ''})\n`;
        waterLogs.forEach((item) => {
          const time = item.timestamp ? format(new Date(item.timestamp), 'HH:mm') : '';
          const cafStr = item.caffeine ? ` (カフェイン ${item.caffeine}mg)` : '';
          md += `- ${time ? time + ' - ' : ''}${item.amount} ml${cafStr}\n`;
        });
        md += `\n`;
      }

      if (timeLogs && timeLogs.length > 0) {
        const totalMins = timeLogs.reduce((sum, item) => sum + (item.duration_minutes != null ? item.duration_minutes : (item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 0)), 0);
        md += `### ⏱ 時間管理 (集中 ${totalMins}分)\n`;
        timeLogs.forEach((item) => {
          const mins = item.duration_minutes != null ? item.duration_minutes : (item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 0);
          const name = item.activity_name || item.category || item.name || '作業';
          const notesStr = item.notes ? ` (${item.notes})` : '';
          md += `- ${name}: ${mins}分${notesStr}\n`;
        });
        md += `\n`;
      }

      if (habitLogs && habitLogs.length > 0) {
        md += `### ✅ 習慣カウンター\n`;
        habitLogs.forEach((h) => {
          md += `- ✅ ${h.name}: ${h.count}回\n`;
        });
        md += `\n`;
      }
    }
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
  habitLogs: any[],
  routineLogs?: any[]
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
    const totalMins = timeLogs.reduce((sum, item) => sum + (item.duration_minutes != null ? item.duration_minutes : (item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 0)), 0);
    md += `### ⏱ 時間管理 (集中タイマー)\n`;
    md += `- **総集中時間**: ${totalMins} 分\n`;
    timeLogs.forEach((item) => {
      const mins = item.duration_minutes != null ? item.duration_minutes : (item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 0);
      const name = item.activity_name || item.category || item.name || '作業';
      const notesStr = item.notes ? ` (${item.notes})` : '';
      md += `  - ${name}: ${mins}分${notesStr}\n`;
    });
    md += `\n`;
  }

  // 4. 習慣カウンター
  if (habitLogs && habitLogs.length > 0) {
    md += `### ✅ 習慣カウンター\n`;
    habitLogs.forEach((h) => {
      md += `- ✅ ${h.name}: ${h.count}回\n`;
    });
    md += `\n`;
  }

  // 5. 達成ルーティン (ルーティン管理)
  if (routineLogs && routineLogs.length > 0) {
    md += `### 🔄 達成ルーティン (${routineLogs.length}件)\n`;
    routineLogs.forEach((r) => {
      const timeStr = r.timestamp ? format(new Date(r.timestamp), 'HH:mm') : '';
      const durationStr = formatSecondsToReadable(r.totalActualSeconds || 0);
      md += `- **${r.routineName}** (${timeStr ? timeStr + ' 完了, ' : ''}所要時間: ${durationStr})\n`;
      if (r.logs && r.logs.length > 0) {
        r.logs.forEach((log: any) => {
          const actStr = formatSecondsToReadable(log.actual_seconds || 0);
          md += `  - ${log.task_name}: ${actStr}\n`;
        });
      }
    });
    md += `\n`;
  }

  return md;
};

/**
 * 日付文字列やタイムスタンプを安全に標準 ISO 日付 (YYYY-MM-DD) に正規化するヘルパー
 */
export const normalizeToDateISO = (dateVal: string | number | null | undefined): string | null => {
  if (dateVal == null) return null;
  const strVal = String(dateVal).trim();
  if (!strVal) return null;

  // 純粋なミリ秒数値または数値文字列の場合
  if (typeof dateVal === 'number' || (!isNaN(Number(strVal)) && !strVal.includes('-') && !strVal.includes('/'))) {
    const num = Number(strVal);
    if (num > 0) {
      const d = new Date(num);
      if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
    }
  }

  // ISO8601 文字列（例: "2026-07-23T14:30:00.000Z"）や時刻を含む場合は Date パースしてローカル日付に変換
  if (strVal.includes('T') || strVal.includes(':') || strVal.includes('Z')) {
    const parsed = new Date(strVal);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  // "YYYY-MM-DD" または "YYYY/MM/DD" 単体の日付文字列の場合
  const match = strVal.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(strVal);
  if (!isNaN(parsed.getTime())) {
    return format(parsed, 'yyyy-MM-dd');
  }
  return null;
};

/**
 * 指定された日付 (YYYY-MM-DD) のライフログ（筋トレ・水分・時間・習慣）をDBから一括取得するヘルパー
 */
export interface DayLifelogData {
  workouts: any[];
  waterLogs: any[];
  timeLogs: any[];
  habitLogs: any[];
  routineLogs?: any[];
}

export const fetchDayLifelogData = async (
  targetDateStr: string,
  settings: ObsidianSettings
): Promise<DayLifelogData> => {
  const conn = getDB();
  const targetDateISO = normalizeToDateISO(targetDateStr) || targetDateStr;

  let waterLogs: any[] = [];
  if (settings.exportWater) {
    const allWater = await conn.getAllAsync<any>('SELECT * FROM water_logs ORDER BY timestamp ASC');
    waterLogs = allWater.filter((item) => {
      const itemDateISO = normalizeToDateISO(item.date) || normalizeToDateISO(item.timestamp);
      return itemDateISO === targetDateISO;
    });
  }

  let timeLogs: any[] = [];
  if (settings.exportTime) {
    const allTime = await conn.getAllAsync<any>('SELECT * FROM time_logs ORDER BY start_time ASC');
    timeLogs = allTime.filter((item) => {
      const itemDateISO = normalizeToDateISO(item.date) || normalizeToDateISO(item.start_time);
      return itemDateISO === targetDateISO;
    });
  }

  let habitLogs: any[] = [];
  if (settings.exportHabits) {
    // habit_logs スキーマ: { id, habit_item_id, timestamp, date } のみ
    // habit_items スキーマ: { id, name, color, created_at, sort_order } のみ
    const allHabitLogs = await conn.getAllAsync<{ habit_item_id: number; timestamp: number; date: string }>(
      'SELECT habit_item_id, timestamp, date FROM habit_logs'
    );
    const allHabitItems = await conn.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM habit_items ORDER BY sort_order ASC, created_at ASC'
    );
    const habitItemMap = new Map<number, string>(allHabitItems.map((h) => [h.id, h.name]));

    // 対象日のログを絞り込み
    const dayHabitLogs = allHabitLogs.filter((item) => {
      const itemDateISO = normalizeToDateISO(item.date) || normalizeToDateISO(item.timestamp);
      return itemDateISO === targetDateISO;
    });

    // habit_item_id ごとにタップ回数を集計
    const countMap = new Map<number, number>();
    dayHabitLogs.forEach((item) => {
      countMap.set(item.habit_item_id, (countMap.get(item.habit_item_id) || 0) + 1);
    });

    // 表示用の配列に変換 (名前 + タップ数)
    habitLogs = Array.from(countMap.entries()).map(([itemId, count]) => ({
      name: habitItemMap.get(itemId) || `習慣 ${itemId}`,
      count,
    }));
  }

  let routineLogs: any[] = [];
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
                const hDateISO = normalizeToDateISO(h.timestamp);
                if (hDateISO === targetDateISO) {
                  routineLogs.push({
                    routineName: r.name || 'ルーティン',
                    timestamp: h.timestamp,
                    totalActualSeconds: h.total_actual_seconds,
                    logs: h.logs || []
                  });
                }
              });
            }
          });
        }
      } catch (e) {
        console.warn('Failed to parse routine_tracker_data in fetchDayLifelogData:', e);
      }
    }
  }

  let workouts: any[] = [];
  if (settings.exportWorkouts) {
    const allWorkoutRows = await conn.getAllAsync<{ id: number; start_time: string }>('SELECT id, start_time FROM workouts');
    for (const w of allWorkoutRows) {
      const wDateISO = normalizeToDateISO(w.start_time);
      if (wDateISO === targetDateISO) {
        const fullData = await loadFullWorkoutData(w.id);
        if (fullData) workouts.push(fullData);
      }
    }
  }

  return { workouts, waterLogs, timeLogs, habitLogs, routineLogs };
};

export interface ExerciseHistoryItem {
  date: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  stance?: string | null;
  work_seconds?: number | null;
  rest_seconds?: number | null;
}

export interface ExerciseNoteData {
  name: string;
  muscle_group?: string | null;
  equipment?: string | null;
  history: ExerciseHistoryItem[];
}

/**
 * 種目ノート用の Markdown を生成
 */
export const formatExerciseToObsidianMarkdown = (data: ExerciseNoteData): string => {
  const exName = translateExercise(data.name);
  let md = `---\n`;
  md += `title: "${exName}"\n`;
  md += `type: exercise\n`;
  md += `tags:\n  - trenote\n  - exercise\n`;
  if (data.muscle_group) md += `muscle_group: "${data.muscle_group}"\n`;
  if (data.equipment) md += `equipment: "${data.equipment}"\n`;
  md += `---\n\n`;

  md += `# 💪 ${exName}\n\n`;
  if (data.muscle_group) md += `- **対象部位**: ${data.muscle_group}\n`;
  if (data.equipment) md += `- **使用器具**: ${data.equipment}\n`;
  md += `\n---\n\n`;

  let maxWeight = 0;
  let maxRepsAtMaxWeight = 0;
  let maxVolumeSet = 0;

  if (data.history && data.history.length > 0) {
    data.history.forEach((s) => {
      const w = s.weight || 0;
      const r = s.reps || 0;
      if (w > maxWeight) {
        maxWeight = w;
        maxRepsAtMaxWeight = r;
      } else if (w === maxWeight && r > maxRepsAtMaxWeight) {
        maxRepsAtMaxWeight = r;
      }
      const vol = w * r;
      if (vol > maxVolumeSet) maxVolumeSet = vol;
    });

    md += `## 🏆 自己ベスト (Personal Records)\n\n`;
    if (maxWeight > 0) {
      md += `- **MAX重量**: ${maxWeight} kg (${maxRepsAtMaxWeight} reps)\n`;
    }
    if (maxVolumeSet > 0) {
      md += `- **MAX 1セットボリューム**: ${maxVolumeSet} kg\n`;
    }
    md += `\n---\n\n`;

    md += `## 📜 トレーニング履歴 (${data.history.length} sets)\n\n`;
    md += `| Date | Set | Weight | Reps | RPE | Time/Rest | Stance |\n`;
    md += `|---|---|---|---|---|---|---|\n`;

    data.history.forEach((s) => {
      const w = s.weight ? `${s.weight} kg` : '-';
      const r = s.reps ? `${s.reps}` : '-';
      const rpe = s.rpe ? `@${s.rpe}` : '-';
      const stance = s.stance ? translateStance(s.stance) : '-';
      let timeStr = '';
      const fmtTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
      };
      if (s.work_seconds != null && s.work_seconds > 0) timeStr += `${fmtTime(s.work_seconds)}`;
      if (s.rest_seconds != null && s.rest_seconds > 0) {
        if (timeStr) timeStr += ' / ';
        timeStr += `rest ${fmtTime(s.rest_seconds)}`;
      }
      if (!timeStr) timeStr = '-';
      md += `| ${s.date} | Set ${s.set_number} | ${w} | ${r} | ${rpe} | ${timeStr} | ${stance} |\n`;
    });
    md += `\n`;
  } else {
    md += `*まだトレーニング記録がありません。*\n`;
  }

  return md;
};

/**
 * 時間（秒）を「X時間Y分Z秒」または「Y分Z秒」形式の文字列に変換
 */
const formatSecondsToReadable = (totalSeconds: number): string => {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0秒';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}時間${minutes.toString().padStart(2, '0')}分${seconds.toString().padStart(2, '0')}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
  }
  return `${seconds}秒`;
};

/**
 * ルーティン管理機能のルーティン詳細ノート用 Markdown を生成
 */
export const formatRoutineToObsidianMarkdown = (routine: {
  id?: string;
  name: string;
  description?: string;
  hidden?: boolean;
  auto_update_estimates?: boolean;
  tasks?: Array<{ id: string; name: string; estimated_seconds: number }>;
  history?: Array<{
    timestamp: number;
    total_actual_seconds: number;
    logs: Array<{ task_name: string; actual_seconds: number; estimated_seconds: number }>;
  }>;
}): string => {
  const routineName = routine.name || '無題のルーティン';
  let md = `---\n`;
  md += `title: "${routineName}"\n`;
  md += `type: routine\n`;
  md += `tags:\n  - trenote\n  - routine\n`;
  md += `---\n\n`;

  md += `# 🔄 ${routineName}\n\n`;
  if (routine.description) {
    md += `- **説明**: ${routine.description}\n`;
  }

  const tasks = routine.tasks || [];
  const totalEstimatedSeconds = tasks.reduce((sum, t) => sum + (t.estimated_seconds || 0), 0);
  md += `- **構成タスク数**: ${tasks.length} 件\n`;
  md += `- **想定合計時間**: ${formatSecondsToReadable(totalEstimatedSeconds)}\n\n`;
  md += `---\n\n`;

  // 1. 構成タスク一覧
  md += `## 📋 構成タスク (${tasks.length}件)\n\n`;
  if (tasks.length > 0) {
    tasks.forEach((t, idx) => {
      const estStr = formatSecondsToReadable(t.estimated_seconds || 0);
      md += `${idx + 1}. **${t.name || 'タスク'}** (想定: ${estStr})\n`;
    });
    md += `\n`;
  } else {
    md += `*タスクが登録されていません。*\n\n`;
  }

  // 2. 実行履歴 (直近10件)
  const history = routine.history || [];
  md += `## 📜 実行履歴 (${history.length}件)\n\n`;
  if (history.length > 0) {
    const recentHistory = history.slice(0, 10);
    recentHistory.forEach((h) => {
      const dateStr = h.timestamp ? format(new Date(h.timestamp), 'yyyy-MM-dd HH:mm') : '-';
      const totalActualStr = formatSecondsToReadable(h.total_actual_seconds || 0);
      md += `### 📅 ${dateStr} (合計実績: ${totalActualStr})\n\n`;
      if (h.logs && h.logs.length > 0) {
        md += `| タスク名 | 実績時間 | 想定時間 |\n`;
        md += `|---|---|---|\n`;
        h.logs.forEach((log) => {
          const actStr = formatSecondsToReadable(log.actual_seconds || 0);
          const estStr = formatSecondsToReadable(log.estimated_seconds || 0);
          md += `| ${log.task_name || '-'} | ${actStr} | ${estStr} |\n`;
        });
        md += `\n`;
      }
    });
  } else {
    md += `*まだ実行履歴がありません。*\n\n`;
  }

  return md;
};

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


