import { format } from 'date-fns';
import { getDB, loadFullWorkoutData } from '../../db/database';
import i18n, { translateExercise, translateStance } from '../../i18n';
import { ObsidianSettings } from '../obsidianService';

export interface DayLifelogData {
  workouts: any[];
  waterLogs: any[];
  timeLogs: any[];
  habitLogs: any[];
  routineLogs?: any[];
  bodyCompositionLog?: any;
}

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
 * 時間（秒）を「X時間Y分Z秒」または「Y分Z秒」形式の文字列に変換
 */
export const formatSecondsToReadable = (totalSeconds: number): string => {
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
 * 日付文字列やタイムスタンプを安全に標準 ISO 日付 (YYYY-MM-DD) に正規化するヘルパー
 */
export const normalizeToDateISO = (dateVal: string | number | null | undefined): string | null => {
  if (dateVal == null) return null;
  const strVal = String(dateVal).trim();
  if (!strVal) return null;

  if (typeof dateVal === 'number' || (!isNaN(Number(strVal)) && !strVal.includes('-') && !strVal.includes('/'))) {
    const num = Number(strVal);
    if (num > 0) {
      const d = new Date(num);
      if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
    }
  }

  if (strVal.includes('T') || strVal.includes(':') || strVal.includes('Z')) {
    const parsed = new Date(strVal);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

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
 * 個別ワークアウト用の Markdown を生成
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
  dateStr: string,
  workouts: any[],
  waterLogs: any[],
  timeLogs: any[],
  habitLogs: any[],
  routineLogs?: any[],
  bodyCompositionLog?: any
): string => {
  let md = `## 🏋️ TreNote Log (${dateStr})\n\n`;

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

  if (habitLogs && habitLogs.length > 0) {
    md += `### ✅ 習慣カウンター\n`;
    habitLogs.forEach((h) => {
      md += `- ✅ ${h.name}: ${h.count}回\n`;
    });
    md += `\n`;
  }

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

  if (bodyCompositionLog && bodyCompositionLog.memo) {
    md += `### 📝 雑記・体調メモ\n\n${bodyCompositionLog.memo}\n\n`;
  }

  return md;
};

/**
 * 指定された日付 (YYYY-MM-DD) のライフログ（筋トレ・水分・時間・習慣）をDBから一括取得するヘルパー
 */
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
    const allHabitLogs = await conn.getAllAsync<{ habit_item_id: number; timestamp: number; date: string }>(
      'SELECT habit_item_id, timestamp, date FROM habit_logs'
    );
    const allHabitItems = await conn.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM habit_items ORDER BY sort_order ASC, created_at ASC'
    );
    const habitItemMap = new Map<number, string>(allHabitItems.map((h) => [h.id, h.name]));

    const dayHabitLogs = allHabitLogs.filter((item) => {
      const itemDateISO = normalizeToDateISO(item.date) || normalizeToDateISO(item.timestamp);
      return itemDateISO === targetDateISO;
    });

    const countMap = new Map<number, number>();
    dayHabitLogs.forEach((item) => {
      countMap.set(item.habit_item_id, (countMap.get(item.habit_item_id) || 0) + 1);
    });

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

  let bodyCompositionLog: any = null;
  const bodyLogs = await conn.getAllAsync<any>('SELECT * FROM body_composition_logs');
  const matchedBodyLog = bodyLogs.find(b => {
    const bDateISO = normalizeToDateISO(b.date);
    return bDateISO === targetDateISO;
  });
  if (matchedBodyLog) {
    bodyCompositionLog = matchedBodyLog;
  }

  return { workouts, waterLogs, timeLogs, habitLogs, routineLogs, bodyCompositionLog };
};

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

  const history = routine.history || [];
  md += `## 📜 実行履歴 (直近10件)\n\n`;
  if (history.length > 0) {
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
    sorted.forEach((h) => {
      const dateStr = format(new Date(h.timestamp), 'yyyy-MM-dd HH:mm');
      const actStr = formatSecondsToReadable(h.total_actual_seconds || 0);
      md += `### 📅 ${dateStr} (所要時間: ${actStr})\n`;

      if (h.logs && h.logs.length > 0) {
        md += `| Task | Actual | Estimated |\n`;
        md += `|---|---|---|\n`;
        h.logs.forEach((log) => {
          const actual = formatSecondsToReadable(log.actual_seconds || 0);
          const estimated = formatSecondsToReadable(log.estimated_seconds || 0);
          md += `| ${log.task_name || 'タスク'} | ${actual} | ${estimated} |\n`;
        });
        md += `\n`;
      }
    });
  } else {
    md += `*まだ実行履歴がありません。*\n\n`;
  }

  return md;
};
