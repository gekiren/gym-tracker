import { withDBQueue } from '../connection';
import { BodyCompositionLog } from '../../types/bodyComposition';

/**
 * 指定された日付（YYYY-MM-DD）の体組成ログを取得
 */
export async function getBodyLogByDate(date: string): Promise<BodyCompositionLog | null> {
  return withDBQueue(async (db) => {
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM body_composition_logs WHERE date = ? ORDER BY created_at DESC, id DESC LIMIT 1',
      [date]
    );
    if (!row) return null;
    return {
      id: row.id,
      date: row.date,
      weight: row.weight !== null ? Number(row.weight) : null,
      body_fat_rate: row.body_fat_rate !== null ? Number(row.body_fat_rate) : null,
      muscle_mass: row.muscle_mass !== null ? Number(row.muscle_mass) : null,
      lbm: row.lbm !== null ? Number(row.lbm) : null,
      height: row.height !== null ? Number(row.height) : null,
      neck: row.neck !== null ? Number(row.neck) : null,
      waist: row.waist !== null ? Number(row.waist) : null,
      hip: row.hip !== null ? Number(row.hip) : null,
      wrist: row.wrist !== null ? Number(row.wrist) : null,
      ankle: row.ankle !== null ? Number(row.ankle) : null,
      gender: row.gender || 'male',
      source: row.source || 'manual',
      memo: row.memo,
      created_at: Number(row.created_at),
    };
  });
}

/**
 * 直近の最新体組成ログを取得（身長や手首・足首サイズなどのデフォルト値補完用）
 */
export async function getLatestBodyLog(): Promise<BodyCompositionLog | null> {
  return withDBQueue(async (db) => {
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM body_composition_logs ORDER BY date DESC, id DESC LIMIT 1'
    );
    if (!row) return null;
    return {
      id: row.id,
      date: row.date,
      weight: row.weight !== null ? Number(row.weight) : null,
      body_fat_rate: row.body_fat_rate !== null ? Number(row.body_fat_rate) : null,
      muscle_mass: row.muscle_mass !== null ? Number(row.muscle_mass) : null,
      lbm: row.lbm !== null ? Number(row.lbm) : null,
      height: row.height !== null ? Number(row.height) : null,
      neck: row.neck !== null ? Number(row.neck) : null,
      waist: row.waist !== null ? Number(row.waist) : null,
      hip: row.hip !== null ? Number(row.hip) : null,
      wrist: row.wrist !== null ? Number(row.wrist) : null,
      ankle: row.ankle !== null ? Number(row.ankle) : null,
      gender: row.gender || 'male',
      source: row.source || 'manual',
      memo: row.memo,
      created_at: Number(row.created_at),
    };
  });
}

/**
 * 体組成ログの全件（または指定件数）の履歴を取得（日付降順）
 */
export async function getAllBodyLogs(limit: number = 100): Promise<BodyCompositionLog[]> {
  return withDBQueue(async (db) => {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM body_composition_logs ORDER BY date DESC, id DESC LIMIT ?',
      [limit]
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      weight: row.weight !== null ? Number(row.weight) : null,
      body_fat_rate: row.body_fat_rate !== null ? Number(row.body_fat_rate) : null,
      muscle_mass: row.muscle_mass !== null ? Number(row.muscle_mass) : null,
      lbm: row.lbm !== null ? Number(row.lbm) : null,
      height: row.height !== null ? Number(row.height) : null,
      neck: row.neck !== null ? Number(row.neck) : null,
      waist: row.waist !== null ? Number(row.waist) : null,
      hip: row.hip !== null ? Number(row.hip) : null,
      wrist: row.wrist !== null ? Number(row.wrist) : null,
      ankle: row.ankle !== null ? Number(row.ankle) : null,
      gender: row.gender || 'male',
      source: row.source || 'manual',
      memo: row.memo,
      created_at: Number(row.created_at),
    }));
  });
}

/**
 * 体組成ログを新規登録
 */
export async function insertBodyLog(log: Omit<BodyCompositionLog, 'id'>): Promise<number> {
  return withDBQueue(async (db) => {
    const now = log.created_at || Date.now();
    const res = await db.runAsync(
      `INSERT INTO body_composition_logs (
        date, weight, body_fat_rate, muscle_mass, lbm, height,
        neck, waist, hip, wrist, ankle, gender, source, memo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.date,
        log.weight ?? null,
        log.body_fat_rate ?? null,
        log.muscle_mass ?? null,
        log.lbm ?? null,
        log.height ?? null,
        log.neck ?? null,
        log.waist ?? null,
        log.hip ?? null,
        log.wrist ?? null,
        log.ankle ?? null,
        log.gender || 'male',
        log.source || 'manual',
        log.memo ?? null,
        now,
      ]
    );
    return res.lastInsertRowId;
  });
}

/**
 * 体組成ログを更新
 */
export async function updateBodyLog(log: BodyCompositionLog): Promise<void> {
  if (!log.id) return;
  return withDBQueue(async (db) => {
    await db.runAsync(
      `UPDATE body_composition_logs SET
        weight = ?,
        body_fat_rate = ?,
        muscle_mass = ?,
        lbm = ?,
        height = ?,
        neck = ?,
        waist = ?,
        hip = ?,
        wrist = ?,
        ankle = ?,
        gender = ?,
        source = ?,
        memo = ?
      WHERE id = ?`,
      [
        log.weight ?? null,
        log.body_fat_rate ?? null,
        log.muscle_mass ?? null,
        log.lbm ?? null,
        log.height ?? null,
        log.neck ?? null,
        log.waist ?? null,
        log.hip ?? null,
        log.wrist ?? null,
        log.ankle ?? null,
        log.gender || 'male',
        log.source || 'manual',
        log.memo ?? null,
        log.id!,
      ]
    );
  });
}

/**
 * 指定日付の体組成ログをUpsert（既存ログがあればマージ更新、なければ新規作成）
 * ※デッドロック防止のため、SELECTはトランザクション外で実行
 */
export async function upsertBodyLog(
  log: Partial<BodyCompositionLog> & { date: string }
): Promise<number> {
  // 1. 既存レコードを事前取得（トランザクション外）
  const existing = await getBodyLogByDate(log.date);

  if (existing && existing.id) {
    const merged: BodyCompositionLog = {
      id: existing.id,
      date: log.date,
      weight: log.weight !== undefined ? log.weight : existing.weight,
      body_fat_rate: log.body_fat_rate !== undefined ? log.body_fat_rate : existing.body_fat_rate,
      muscle_mass: log.muscle_mass !== undefined ? log.muscle_mass : existing.muscle_mass,
      lbm: log.lbm !== undefined ? log.lbm : existing.lbm,
      height: log.height !== undefined ? log.height : existing.height,
      neck: log.neck !== undefined ? log.neck : existing.neck,
      waist: log.waist !== undefined ? log.waist : existing.waist,
      hip: log.hip !== undefined ? log.hip : existing.hip,
      wrist: log.wrist !== undefined ? log.wrist : existing.wrist,
      ankle: log.ankle !== undefined ? log.ankle : existing.ankle,
      gender: log.gender || existing.gender || 'male',
      source: log.source || existing.source || 'manual',
      memo: log.memo !== undefined ? log.memo : existing.memo,
      created_at: existing.created_at,
    };
    await updateBodyLog(merged);
    return existing.id;
  } else {
    // 過去の最新ログから身長・手首囲・足首囲などを引き継ぐ
    const latest = await getLatestBodyLog();
    const newLog: Omit<BodyCompositionLog, 'id'> = {
      date: log.date,
      weight: log.weight ?? null,
      body_fat_rate: log.body_fat_rate ?? null,
      muscle_mass: log.muscle_mass ?? null,
      lbm: log.lbm ?? null,
      height: log.height !== undefined ? log.height : (latest?.height ?? null),
      neck: log.neck ?? null,
      waist: log.waist ?? null,
      hip: log.hip ?? null,
      wrist: log.wrist !== undefined ? log.wrist : (latest?.wrist ?? null),
      ankle: log.ankle !== undefined ? log.ankle : (latest?.ankle ?? null),
      gender: log.gender || latest?.gender || 'male',
      source: log.source || 'manual',
      memo: log.memo ?? null,
      created_at: Date.now(),
    };
    return await insertBodyLog(newLog);
  }
}

/**
 * 体組成ログを削除
 */
export async function deleteBodyLog(id: number): Promise<void> {
  return withDBQueue(async (db) => {
    await db.runAsync('DELETE FROM body_composition_logs WHERE id = ?', [id]);
  });
}
