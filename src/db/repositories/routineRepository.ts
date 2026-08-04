import { getDB } from '../connection';
import { RoutineExercise } from '../types';

export const getRoutines = async () => {
  const conn = getDB();
  const routines = await conn.getAllAsync<{ id: number; title: string; description: string; sort_order: number }>(
    'SELECT * FROM routines ORDER BY sort_order ASC, id ASC'
  );
  
  const result = [];
  for (const r of routines) {
    const rxRows = await conn.getAllAsync<{ routine_exercise_id: number; exercise_id: number; exercise_name: string }>(`
      SELECT re.id as routine_exercise_id, e.id as exercise_id, e.name as exercise_name
      FROM routine_exercises re
      JOIN exercises e ON re.exercise_id = e.id
      WHERE re.routine_id = ?
      ORDER BY re.sort_order ASC, re.id ASC
    `, [r.id]);

    const exercises: RoutineExercise[] = [];
    for (const rx of rxRows) {
      const setRows = await conn.getAllAsync<{
        set_number: number;
        reps: number | null;
        weight: number | null;
        rpe: number | null;
        side: string | null;
        variation: string | null;
        stance: string | null;
      }>(`
        SELECT set_number, reps, weight, rpe, side, variation, stance
        FROM routine_sets
        WHERE routine_exercise_id = ?
        ORDER BY set_number ASC
      `, [rx.routine_exercise_id]);

      exercises.push({
        id: rx.exercise_id,
        name: rx.exercise_name,
        sets: setRows.map(s => ({
          set_number: s.set_number,
          reps: s.reps,
          weight: s.weight,
          rpe: s.rpe,
          side: s.side || null,
          variation: s.variation || null,
          stance: s.stance || null
        }))
      });
    }

    result.push({
      ...r,
      exercises
    });
  }

  return result;
};

export const addRoutine = async (title: string, description: string, exercises: RoutineExercise[]) => {
  const conn = getDB();
  
  await conn.withTransactionAsync(async () => {
    const res = await conn.runAsync('INSERT INTO routines (title, description) VALUES (?, ?)', [title, description]);
    const routineId = res.lastInsertRowId;
    
    let order = 0;
    for (const ex of exercises) {
      const rxRes = await conn.runAsync(
        'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES (?, ?, ?)', 
        [routineId, ex.id, order++]
      );
      const routineExerciseId = rxRes.lastInsertRowId;
      
      for (const s of ex.sets) {
        await conn.runAsync(
          'INSERT INTO routine_sets (routine_exercise_id, set_number, reps, weight, rpe, side, variation, stance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [routineExerciseId, s.set_number, s.reps, s.weight, s.rpe, s.side || null, s.variation || null, s.stance || null]
        );
      }
    }
  });
};

export const updateRoutine = async (id: number, title: string, description: string, exercises: RoutineExercise[]) => {
  const conn = getDB();
  
  await conn.withTransactionAsync(async () => {
    await conn.runAsync('UPDATE routines SET title = ?, description = ? WHERE id = ?', [title, description, id]);
    await conn.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', [id]);
    
    let order = 0;
    for (const ex of exercises) {
      const rxRes = await conn.runAsync(
        'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES (?, ?, ?)', 
        [id, ex.id, order++]
      );
      const routineExerciseId = rxRes.lastInsertRowId;
      
      for (const s of ex.sets) {
        await conn.runAsync(
          'INSERT INTO routine_sets (routine_exercise_id, set_number, reps, weight, rpe, side, variation, stance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [routineExerciseId, s.set_number, s.reps, s.weight, s.rpe, s.side || null, s.variation || null, s.stance || null]
        );
      }
    }
  });
};

export const deleteRoutine = async (id: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM routines WHERE id = ?', [id]);
};

export const updateRoutineOrders = async (orders: { id: number, sort_order: number }[]) => {
  const conn = getDB();
  await conn.withTransactionAsync(async () => {
    for (const item of orders) {
      await conn.runAsync('UPDATE routines SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
    }
  });
};
