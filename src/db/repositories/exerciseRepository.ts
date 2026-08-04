import { getDB } from '../connection';
import { PRESET_EXERCISES, PRESET_EXERCISE_NAMES, PRESET_ROUTINES } from '../constants';

export const getCustomExercisesCount = async (): Promise<number> => {
  try {
    const conn = getDB();
    const rows = await conn.getAllAsync<{ name: string }>('SELECT name FROM exercises');
    return rows.filter(r => !PRESET_EXERCISE_NAMES.has(r.name)).length;
  } catch (e) {
    console.warn('Failed to retrieve custom exercises count in getCustomExercisesCount', e);
    return 0;
  }
};

export const getExercises = async () => {
  const conn = getDB();
  return await conn.getAllAsync('SELECT * FROM exercises ORDER BY name');
};

export const getExerciseById = async (id: number) => {
  const conn = getDB();
  return await conn.getFirstAsync('SELECT * FROM exercises WHERE id = ?', [id]);
};

export const addCustomExercise = async (
  name: string,
  group: string,
  equip: string,
  isUnilateral: boolean = false,
  defaultVariation: string | null = null,
  defaultStance: string | null = null
) => {
  const conn = getDB();
  const res = await conn.runAsync(
    'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral, default_variation, default_stance) VALUES (?, ?, ?, ?, ?, ?)',
    [name, group, equip, isUnilateral ? 1 : 0, defaultVariation, defaultStance]
  );
  return res.lastInsertRowId;
};

export const getFavoriteIds = async (): Promise<Set<number>> => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{ exercise_id: number }>('SELECT exercise_id FROM favorite_exercises');
  return new Set(rows.map(r => r.exercise_id));
};

export const toggleFavorite = async (exerciseId: number, isFav: boolean): Promise<void> => {
  const conn = getDB();
  if (isFav) {
    await conn.runAsync('DELETE FROM favorite_exercises WHERE exercise_id = ?', [exerciseId]);
  } else {
    await conn.runAsync('INSERT OR IGNORE INTO favorite_exercises (exercise_id) VALUES (?)', [exerciseId]);
  }
};

export const deleteExercise = async (id: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
};

export const updateExerciseDefaultVariation = async (exerciseId: number, variation: string | null) => {
  const conn = getDB();
  await conn.runAsync('UPDATE exercises SET default_variation = ? WHERE id = ?', [variation, exerciseId]);
};

export const updateExerciseDefaultStance = async (exerciseId: number, stance: string | null) => {
  const conn = getDB();
  await conn.runAsync('UPDATE exercises SET default_stance = ? WHERE id = ?', [stance, exerciseId]);
};

export const getMissingPresets = async () => {
  const conn = getDB();
  
  // 1. Find missing exercises (by exact name matching)
  const allExercises = await conn.getAllAsync<{ name: string }>('SELECT name FROM exercises');
  const existingExerciseNames = new Set(allExercises.map(e => e.name));
  const missingExercises = PRESET_EXERCISES.filter(ex => !existingExerciseNames.has(ex.name));

  // 2. Find missing routines (by exact title matching)
  const allRoutines = await conn.getAllAsync<{ title: string }>('SELECT title FROM routines');
  const existingRoutineTitles = new Set(allRoutines.map(r => r.title));
  const missingRoutines = PRESET_ROUTINES.filter(r => !existingRoutineTitles.has(r.title));

  return {
    missingExercises,
    missingRoutines
  };
};

export const restorePresets = async (exerciseNames: string[], routineTitles: string[]) => {
  const conn = getDB();

  // Prefetch existing exercises beforehand to avoid async SELECT inside withTransactionAsync
  const allExistingExercises = await conn.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM exercises');
  const existingExerciseMap = new Map<string, number>(allExistingExercises.map(e => [e.name, e.id]));

  await conn.withTransactionAsync(async () => {
    // 1. Restore Selected Exercises
    const exercisesToRestore = PRESET_EXERCISES.filter(ex => exerciseNames.includes(ex.name));
    for (const ex of exercisesToRestore) {
      if (!existingExerciseMap.has(ex.name)) {
        const res = await conn.runAsync(
          'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral) VALUES (?, ?, ?, ?)',
          [ex.name, ex.group, ex.equip, ex.is_unilateral ? 1 : 0]
        );
        existingExerciseMap.set(ex.name, res.lastInsertRowId);
      }
    }

    // 2. Restore Selected Routines
    const routinesToRestore = PRESET_ROUTINES.filter(r => routineTitles.includes(r.title));
    if (routinesToRestore.length > 0) {
      for (const r of routinesToRestore) {
        // If a required exercise for this routine does not exist in the database, restore it automatically
        for (const ename of r.exerciseNames) {
          if (!existingExerciseMap.has(ename)) {
            const presetEx = PRESET_EXERCISES.find(ex => ex.name === ename);
            if (presetEx) {
              const insRes = await conn.runAsync(
                'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral) VALUES (?, ?, ?, ?)',
                [presetEx.name, presetEx.group, presetEx.equip, presetEx.is_unilateral ? 1 : 0]
              );
              existingExerciseMap.set(ename, insRes.lastInsertRowId);
            }
          }
        }

        const res = await conn.runAsync('INSERT INTO routines (title, description) VALUES (?, ?)', [r.title, r.description]);
        const rid = res.lastInsertRowId;
        let order = 0;

        for (const ename of r.exerciseNames) {
          const exerciseId = existingExerciseMap.get(ename);
          if (exerciseId !== undefined) {
            const rxRes = await conn.runAsync(
              'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES (?, ?, ?)',
              [rid, exerciseId, order++]
            );
            const routineExerciseId = rxRes.lastInsertRowId;

            // Seed beginner friendly sets
            const isPlank = ename === 'プランク';
            const isDumbbell = ename.includes('ダンベル');
            const isExtensionCurl = ename === 'レッグエクステンション' || ename === 'レッグカール' || ename === 'マシンアブダクター';
            const isSeatedRow = ename === 'シーテッドロウ';

            for (let setNum = 1; setNum <= 3; setNum++) {
              let reps = 10;
              let weight = 20;

              if (isPlank) {
                reps = 30;
                weight = 0;
              } else if (isDumbbell) {
                weight = 5;
              } else if (isExtensionCurl || isSeatedRow) {
                weight = 15;
              }

              await conn.runAsync(
                'INSERT INTO routine_sets (routine_exercise_id, set_number, reps, weight, rpe) VALUES (?, ?, ?, ?, ?)',
                [routineExerciseId, setNum, reps, weight, 7]
              );
            }
          }
        }
      }
    }
  });
};
