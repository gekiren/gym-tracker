import { format } from 'date-fns';

type SetData = {
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number;
  rest_seconds?: number;
  work_seconds?: number;
};

type WorkoutExerciseData = {
  exercise_name: string;
  notes?: string;
  sets: SetData[];
};

type WorkoutData = {
  title: string;
  start_time: string;
  notes?: string;
  exercises: WorkoutExerciseData[];
};

/**
 * ワークアウト内容をMarkdown形式に変換します。
 */
export const formatWorkoutToMarkdown = (workout: WorkoutData): string => {
  const dateStr = format(new Date(workout.start_time), 'yyyy-MM-dd HH:mm');
  let md = `# ${workout.title}\n`;
  md += `**日付**: ${dateStr}\n\n`;
  
  if (workout.notes) {
    md += `> ${workout.notes}\n\n`;
  }

  md += `## トレーニング内容\n`;
  workout.exercises.forEach((ex) => {
    md += `### ${ex.exercise_name}\n`;
    if (ex.notes) {
      md += `メモ: ${ex.notes}\n\n`;
    }
    md += `| Set | Weight | Reps | RPE | Time/Rest |\n`;
    md += `|---|---|---|---|---|\n`;
    ex.sets.forEach((set) => {
      const w = set.weight ? `${set.weight} kg` : '-';
      const r = set.reps ? `${set.reps}` : '-';
      const rpe = set.rpe ? `@${set.rpe}` : '-';
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
      md += `| ${set.set_number} | ${w} | ${r} | ${rpe} | ${timeStr} |\n`;
    });
    md += `\n`;
  });

  return md;
};

/**
 * 特定の種目のこれまでの履歴をMarkdown形式に変換します。
 */
export const formatExerciseHistoryToMarkdown = (exerciseName: string, history: { date: string, maxWeight: number, totalVolume: number }[]): string => {
  let md = `# ${exerciseName} の履歴\n\n`;
  md += `| 日付 | 最大重量 | ボリューム |\n`;
  md += `|---|---|---|\n`;
  history.forEach((h) => {
    const d = format(new Date(h.date), 'yyyy-MM-dd');
    md += `| ${d} | ${h.maxWeight} kg | ${h.totalVolume} kg |\n`;
  });
  return md;
};
