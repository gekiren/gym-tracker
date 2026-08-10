import { getDB } from '../connection';
import { RoutineExercise } from '../types';

export const getRoutines = async () => {
  const conn = getDB();
  const routines = await conn.getAllAsync<{ id: number; title: string; description: string; sort_order: number }>(
    'SELECT id, title, description, sort_order FROM routines ORDER BY sort_order ASC, id ASC'
  );

  if (routines.length === 0) return [];

  const rxRows = await conn.getAllAsync<{
    routine_id: number;
    routine_exercise_id: number;
    exercise_id: number;
    exercise_name: string;
  }>(`
    SELECT re.routine_id, re.id as routine_exercise_id, e.id as exercise_id, e.name as exercise_name
    FROM routine_exercises re
    JOIN exercises e ON re.exercise_id = e.id
    ORDER BY re.sort_order ASC, re.id ASC
  `);

  const rxIds = rxRows.map(rx => rx.routine_exercise_id);
  let setRows: {
    routine_exercise_id: number;
    set_number: number;
    reps: number | null;
    weight: number | null;
    rpe: number | null;
    side: string | null;
    variation: string | null;
    stance: string | null;
  }[] = [];

  if (rxIds.length > 0) {
    const placeholders = rxIds.map(() => '?').join(',');
    setRows = await conn.getAllAsync<typeof setRows[0]>(`
      SELECT routine_exercise_id, set_number, reps, weight, rpe, side, variation, stance
      FROM routine_sets
      WHERE routine_exercise_id IN (${placeholders})
      ORDER BY set_number ASC
    `, rxIds);
  }

  // Map sets to routine_exercise_id
  const setsByRxId = new Map<number, typeof setRows>();
  for (const s of setRows) {
    if (!setsByRxId.has(s.routine_exercise_id)) {
      setsByRxId.set(s.routine_exercise_id, []);
    }
    setsByRxId.get(s.routine_exercise_id)!.push(s);
  }

  // Map exercises to routine_id
  const rxByRoutineId = new Map<number, RoutineExercise[]>();
  for (const rx of rxRows) {
    if (!rxByRoutineId.has(rx.routine_id)) {
      rxByRoutineId.set(rx.routine_id, []);
    }
    const sets = (setsByRxId.get(rx.routine_exercise_id) || []).map(s => ({
      set_number: s.set_number,
      reps: s.reps,
      weight: s.weight,
      rpe: s.rpe,
      side: s.side || null,
      variation: s.variation || null,
      stance: s.stance || null
    }));
    rxByRoutineId.get(rx.routine_id)!.push({
      id: rx.exercise_id,
      name: rx.exercise_name,
      sets
    });
  }

  return routines.map(r => ({
    ...r,
    exercises: rxByRoutineId.get(r.id) || []
  }));
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
