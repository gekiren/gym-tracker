import { getDB } from '../connection';
import { translateExercise } from '../../i18n';
import { WorkoutExercise, WorkoutRow, WorkoutExerciseRow, WorkoutSetRow, WorkoutSet, WorkoutWithStats, FullWorkoutData } from '../types';

export const saveWorkout = async (
  title: string,
  startTime: string,
  endTime: string,
  notes: string | null,
  exercises: WorkoutExercise[],
  calories: number | null = null,
  avgHeartRate: number | null = null,
  maxHeartRate: number | null = null,
  caloriesBurned: number | null = null
): Promise<number> => {
  const conn = getDB();
  let workoutId = 0;

  const sanitizeNum = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const safeCalories = sanitizeNum(calories ?? caloriesBurned);
  const safeAvgHR = sanitizeNum(avgHeartRate);
  const safeMaxHR = sanitizeNum(maxHeartRate);
  const safeCalBurned = sanitizeNum(caloriesBurned ?? calories);

  await conn.withTransactionAsync(async () => {
    const wResult = await conn.runAsync(
      'INSERT INTO workouts (title, start_time, end_time, notes, calories, avg_heart_rate, max_heart_rate, calories_burned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, startTime, endTime, notes, safeCalories, safeAvgHR, safeMaxHR, safeCalBurned]
    );
    
    workoutId = wResult.lastInsertRowId;
    let order = 0;

    for (const ex of exercises) {
      const waResult = await conn.runAsync(
        'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, notes) VALUES (?, ?, ?, ?)',
        [workoutId, ex.exercise_id, order++, ex.notes || null]
      );
      const weId = waResult.lastInsertRowId;

      for (const set of ex.sets) {
        const safeWeight = sanitizeNum(set.weight);
        const safeReps = sanitizeNum(set.reps);
        const safeRpe = sanitizeNum(set.rpe);
        const safeRestSecs = sanitizeNum(set.rest_seconds);
        const safeWorkSecs = sanitizeNum(set.work_seconds);

        const shouldSave = set.is_completed || safeWeight != null || safeReps != null || safeWorkSecs != null;

        if (shouldSave) {
          await conn.runAsync(
            'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, side, variation, stance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              weId, 
              set.set_number, 
              safeReps, 
              safeWeight, 
              safeRpe, 
              set.is_completed ? 1 : 0, 
              safeRestSecs, 
              safeWorkSecs, 
              set.side || null, 
              set.variation || null, 
              set.stance || null
            ]
          );
        }
      }
    }
  });

  return workoutId;
};

export const prefetchWorkoutCompletionData = async (exerciseIds: number[]) => {
  const conn = getDB();
  
  const workouts = await conn.getAllAsync<{ start_time: string }>(
    'SELECT start_time FROM workouts ORDER BY start_time DESC'
  );
  
  let pastSets: { workout_id: number; start_time: string; exercise_id: number; reps: number | null; weight: number | null; variation: string | null }[] = [];
  if (exerciseIds.length > 0) {
    const placeholders = exerciseIds.map(() => '?').join(',');
    pastSets = await conn.getAllAsync<typeof pastSets[0]>(
      `SELECT w.id as workout_id, w.start_time, we.exercise_id, ws.reps, ws.weight, ws.variation
       FROM workout_sets ws
       JOIN workout_exercises we ON ws.workout_exercise_id = we.id
       JOIN workouts w ON we.workout_id = w.id
       WHERE we.exercise_id IN (${placeholders}) AND ws.is_completed = 1 AND ws.reps IS NOT NULL AND ws.weight IS NOT NULL`,
      exerciseIds
    );
  }

  return {
    workouts,
    pastSets
  };
};

export const getExerciseHistory = async (exerciseId: number) => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{
    workout_id: number;
    start_time: string;
    set_number: number;
    reps: number | null;
    weight: number | null;
    rpe: number | null;
    rest_seconds: number | null;
    work_seconds: number | null;
    side: string | null;
    variation: string | null;
    stance: string | null;
  }>(`
    SELECT w.id as workout_id, w.start_time, ws.set_number, ws.reps, ws.weight, ws.rpe, ws.rest_seconds, ws.work_seconds, ws.side, ws.variation, ws.stance
    FROM workout_sets ws
    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.exercise_id = ? AND ws.is_completed = 1
    ORDER BY w.start_time DESC, ws.set_number ASC
  `, [exerciseId]);

  const historyMap = new Map<number, { workout_id: number; start_time: string; sets: Omit<WorkoutSet, 'id' | 'is_completed'>[] }>();
  
  for (const row of rows) {
    if (!historyMap.has(row.workout_id)) {
      historyMap.set(row.workout_id, {
        workout_id: row.workout_id,
        start_time: row.start_time,
        sets: []
      });
    }
    historyMap.get(row.workout_id)!.sets.push({
      set_number: row.set_number,
      reps: row.reps,
      weight: row.weight,
      rpe: row.rpe,
      rest_seconds: row.rest_seconds,
      work_seconds: row.work_seconds,
      side: row.side,
      variation: row.variation,
      stance: row.stance
    });
  }

  return Array.from(historyMap.values());
};

export const getPreviousWorkoutSets = async (exerciseId: number) => {
  const conn = getDB();
  const recentEx = await conn.getFirstAsync<{ id: number }>(`
    SELECT we.id 
    FROM workout_exercises we
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.exercise_id = ?
    ORDER BY w.start_time DESC
    LIMIT 1
  `, [exerciseId]);

  if (!recentEx) return [];

  const sets = await conn.getAllAsync<WorkoutSet>(`
    SELECT set_number, weight, reps, rpe, rest_seconds, work_seconds, side, variation, stance
    FROM workout_sets 
    WHERE workout_exercise_id = ?
    ORDER BY set_number ASC, id ASC
  `, [recentEx.id]);

  return sets;
};

export const getPersonalRecords = async (exerciseId: number) => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{ reps: number; max_weight: number; variation: string | null }>(`
    SELECT ws.reps, MAX(ws.weight) as max_weight, ws.variation
    FROM workout_sets ws
    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
    WHERE we.exercise_id = ? AND ws.is_completed = 1 AND ws.reps IS NOT NULL AND ws.weight IS NOT NULL
    GROUP BY ws.variation, ws.reps
    ORDER BY ws.variation ASC, ws.reps ASC
  `, [exerciseId]);
  
  const prMap: Record<string, Record<number, number>> = {};
  for (const row of rows) {
    if (row.reps > 0) {
      const varKey = row.variation || 'default';
      if (!prMap[varKey]) {
        prMap[varKey] = {};
      }
      prMap[varKey][row.reps] = row.max_weight;
    }
  }
  return prMap;
};

export const deleteWorkout = async (id: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
};

export const loadFullWorkoutData = async (workoutId: number): Promise<FullWorkoutData | null> => {
  const db = getDB();
  const workoutRow = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [workoutId]);
  if (!workoutRow) return null;

  const exercisesRows = await db.getAllAsync<WorkoutExerciseRow>(
    'SELECT we.id as workout_exercise_id, e.id as exercise_id, e.name as exercise_name, we.notes FROM workout_exercises we JOIN exercises e ON we.exercise_id = e.id WHERE we.workout_id = ? ORDER BY we.sort_order',
    [workoutId]
  );
  
  if (exercisesRows.length === 0) {
    return {
      id: workoutRow.id,
      title: workoutRow.title,
      start_time: workoutRow.start_time,
      end_time: workoutRow.end_time,
      notes: workoutRow.notes,
      calories: workoutRow.calories,
      exercises: []
    };
  }

  const weIds = exercisesRows.map(e => e.workout_exercise_id);
  const placeholders = weIds.map(() => '?').join(',');
  const allSetsRows = await db.getAllAsync<WorkoutSetRow & { workout_exercise_id: number }>(
    `SELECT id, workout_exercise_id, set_number, weight, reps, rpe, rest_seconds, work_seconds, side, variation, stance, is_completed 
     FROM workout_sets 
     WHERE workout_exercise_id IN (${placeholders}) 
     ORDER BY set_number ASC, id ASC`,
    weIds
  );

  const setsByWeId = new Map<number, WorkoutSetRow[]>();
  for (const s of allSetsRows) {
    if (!setsByWeId.has(s.workout_exercise_id)) {
      setsByWeId.set(s.workout_exercise_id, []);
    }
    setsByWeId.get(s.workout_exercise_id)!.push(s);
  }

  const exercisesData = exercisesRows.map(ex => {
    const setsRows = setsByWeId.get(ex.workout_exercise_id) || [];
    const sets = setsRows.map(s => ({
      ...s,
      is_completed: s.is_completed === 1 || s.is_completed === true
    }));
    return {
      workout_exercise_id: ex.workout_exercise_id,
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      notes: ex.notes,
      sets: sets
    };
  });

  return {
    id: workoutRow.id,
    title: workoutRow.title,
    start_time: workoutRow.start_time,
    end_time: workoutRow.end_time,
    notes: workoutRow.notes,
    calories: workoutRow.calories,
    exercises: exercisesData
  };
};

export const updateWorkoutSet = async (setId: number, weight: number | null, reps: number | null, rpe: number | null, variation?: string | null, stance?: string | null) => {
  const conn = getDB();
  if (stance !== undefined && variation !== undefined) {
    await conn.runAsync('UPDATE workout_sets SET weight = ?, reps = ?, rpe = ?, variation = ?, stance = ? WHERE id = ?', [weight, reps, rpe, variation, stance, setId]);
  } else if (stance !== undefined) {
    await conn.runAsync('UPDATE workout_sets SET weight = ?, reps = ?, rpe = ?, stance = ? WHERE id = ?', [weight, reps, rpe, stance, setId]);
  } else if (variation !== undefined) {
    await conn.runAsync('UPDATE workout_sets SET weight = ?, reps = ?, rpe = ?, variation = ? WHERE id = ?', [weight, reps, rpe, variation, setId]);
  } else {
    await conn.runAsync('UPDATE workout_sets SET weight = ?, reps = ?, rpe = ? WHERE id = ?', [weight, reps, rpe, setId]);
  }
};

export const deleteWorkoutSet = async (setId: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM workout_sets WHERE id = ?', [setId]);
};

export const updateWorkoutTitle = async (workoutId: number, title: string) => {
  const conn = getDB();
  await conn.runAsync('UPDATE workouts SET title = ? WHERE id = ?', [title, workoutId]);
};

export const updateWorkoutOverallNotes = async (workoutId: number, notes: string | null) => {
  const conn = getDB();
  await conn.runAsync('UPDATE workouts SET notes = ? WHERE id = ?', [notes, workoutId]);
};

export const updateWorkoutExerciseNotes = async (weId: number, notes: string | null) => {
  const conn = getDB();
  await conn.runAsync('UPDATE workout_exercises SET notes = ? WHERE id = ?', [notes, weId]);
};

export const getRecentWorkoutSummaryForAI = async (limit: number = 3): Promise<string> => {
  const conn = getDB();
  
  interface FlatRow {
    workout_id: number;
    workout_title: string;
    workout_start_time: string;
    workout_end_time: string | null;
    workout_notes: string | null;
    workout_exercise_id: number | null;
    exercise_notes: string | null;
    exercise_name: string | null;
    set_number: number | null;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    side: string | null;
    variation: string | null;
    stance: string | null;
  }

  const rows = await conn.getAllAsync<FlatRow>(`
    SELECT 
      w.id AS workout_id,
      w.title AS workout_title,
      w.start_time AS workout_start_time,
      w.end_time AS workout_end_time,
      w.notes AS workout_notes,
      we.id AS workout_exercise_id,
      we.notes AS exercise_notes,
      e.name AS exercise_name,
      ws.set_number,
      ws.weight,
      ws.reps,
      ws.rpe,
      ws.side,
      ws.variation,
      ws.stance
    FROM (
      SELECT id, title, start_time, end_time, notes
      FROM workouts
      ORDER BY start_time DESC
      LIMIT ?
    ) w
    LEFT JOIN workout_exercises we ON we.workout_id = w.id
    LEFT JOIN exercises e ON we.exercise_id = e.id
    LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
    ORDER BY w.start_time DESC, we.sort_order ASC, ws.set_number ASC
  `, [limit]);

  if (rows.length === 0) {
    return "過去のワークアウト履歴はありません。";
  }

  interface SetData {
    set_number: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    side: string | null;
    variation: string | null;
    stance: string | null;
  }

  interface ExerciseData {
    workout_exercise_id: number;
    exercise_name: string;
    notes: string | null;
    sets: SetData[];
  }

  interface WorkoutData {
    id: number;
    title: string;
    start_time: string;
    end_time: string | null;
    notes: string | null;
    exercises: ExerciseData[];
  }

  const workoutsMap = new Map<number, WorkoutData>();
  const workoutOrder: number[] = [];

  for (const r of rows) {
    if (!workoutsMap.has(r.workout_id)) {
      workoutsMap.set(r.workout_id, {
        id: r.workout_id,
        title: r.workout_title,
        start_time: r.workout_start_time,
        end_time: r.workout_end_time,
        notes: r.workout_notes,
        exercises: []
      });
      workoutOrder.push(r.workout_id);
    }

    if (r.workout_exercise_id === null) {
      continue;
    }

    const workout = workoutsMap.get(r.workout_id)!;
    let exercise = workout.exercises.find(e => e.workout_exercise_id === r.workout_exercise_id);
    if (!exercise) {
      exercise = {
        workout_exercise_id: r.workout_exercise_id,
        exercise_name: r.exercise_name || '未定義の種目',
        notes: r.exercise_notes,
        sets: []
      };
      workout.exercises.push(exercise);
    }

    if (r.set_number === null) {
      continue;
    }

    exercise.sets.push({
      set_number: r.set_number,
      weight: r.weight,
      reps: r.reps,
      rpe: r.rpe,
      side: r.side,
      variation: r.variation,
      stance: r.stance
    });
  }

  let summary = "【重要指示: ワークアウトデータ参照ルール】\n以下の履歴データにはユーザーの実際のトレーニング記録が含まれています。\n質問された種目（例: ベンチプレス等）のデータが存在する場合、絶対に「データがない」「記録が見つからない」と回答しないでください。\n記録されている日付・重量(kg/lbs)・回数・セット数・RPEを具体的に引用して回答してください。\n";
  for (const wid of workoutOrder) {
    const w = workoutsMap.get(wid)!;
    const dateStr = w.start_time.split('T')[0];
    const duration = w.end_time 
      ? `${Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000)}分`
      : '時間未記録';
    
    summary += `\n■ 日時: ${dateStr} (${duration}) | タイトル: ${w.title}\n`;
    if (w.notes) {
      summary += `   全体メモ: "${w.notes}"\n`;
    }

    for (const ex of w.exercises) {
      const translatedName = translateExercise(ex.exercise_name);
      const nameStr = translatedName !== ex.exercise_name 
        ? `${translatedName} (${ex.exercise_name})` 
        : translatedName;
      summary += `   - ${nameStr}`;
      if (ex.notes) summary += ` (種目メモ: "${ex.notes}")`;
      summary += `: `;

      if (ex.sets.length === 0) {
        summary += "セット記録なし\n";
        continue;
      }

      interface SetGroup {
        weight: number;
        reps: number;
        rpe: number | null;
        side: string | null;
        variation: string | null;
        stance: string | null;
        count: number;
      }

      const groups: SetGroup[] = [];
      for (const s of ex.sets) {
        const weight = s.weight ?? 0;
        const reps = s.reps ?? 0;
        const rpe = s.rpe;
        const side = s.side;
        const variation = s.variation;
        const stance = s.stance || null;

        const lastGroup = groups[groups.length - 1];
        if (
          lastGroup &&
          lastGroup.weight === weight &&
          lastGroup.reps === reps &&
          lastGroup.rpe === rpe &&
          lastGroup.side === side &&
          lastGroup.variation === variation &&
          lastGroup.stance === stance
        ) {
          lastGroup.count += 1;
        } else {
          groups.push({
            weight,
            reps,
            rpe,
            side,
            variation,
            stance,
            count: 1
          });
        }
      }

      const setSummaries = groups.map(g => {
        let sDesc = `${g.weight}kg x ${g.reps}回`;
        if (g.count > 1) {
          sDesc += ` (${g.count}セット)`;
        }
        if (g.side) sDesc = `[${g.side === 'L' ? '左' : '右'}] ` + sDesc;
        if (g.variation) sDesc += ` (${g.variation})`;
        if (g.stance) sDesc += ` (スタンス: ${g.stance})`;
        if (g.rpe) sDesc += ` (RPE: ${g.rpe})`;
        return sDesc;
      });

      summary += setSummaries.join(', ') + '\n';
    }
  }

  return summary;
};

export const getWorkoutsWithStats = async (): Promise<WorkoutWithStats[]> => {
  const conn = getDB();
  const rows = await conn.getAllAsync<WorkoutWithStats>(`
    SELECT w.*, 
           (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id) as exercise_count,
           (SELECT SUM(weight * reps) FROM workout_sets ws JOIN workout_exercises we ON ws.workout_exercise_id = we.id WHERE we.workout_id = w.id) as volume
    FROM workouts w 
    ORDER BY start_time DESC
  `);
  return rows;
};

