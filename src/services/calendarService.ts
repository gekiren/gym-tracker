import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { getDB } from '../db/database';

export const CALENDAR_BG_SYNC_TASK = 'TRENOTE_CALENDAR_BG_SYNC';

export interface CalendarSyncSettings {
  enabled: boolean;                 // 全体の有効/無効
  importEnabled: boolean;           // 予定取り込みの有効/無効
  selectedCalendarIds: string[];    // 取り込み対象カレンダーID（空ならすべて/プライマリ）
  importOnScreenFocus: boolean;     // 24時間管理画面表示時に自動取り込み
  importBgDaily: boolean;           // 毎朝定時バックグラウンド自動取り込み
  importBgTime: string;             // 定時取り込み時刻 (例: "07:00")
  excludeAllDay: boolean;           // 終日イベントを除外（円グラフ圧迫防止）
  importHolidays?: boolean;         // 祝日の取り込み有効/無効 (デフォルト: true)
  treatHolidaysAsSunday?: boolean;  // 祝日を日曜日（休日スケジュール）として扱う (デフォルト: true)
  exportEnabled: boolean;           // 実績書き出しの有効/無効
  exportCalendarId: string;         // 書き出し先カレンダーID（空ならTreNote専用サブカレンダー）
  exportOnSave: boolean;            // 実績保存時にリアルタイム書き出し
  exportBgDaily: boolean;           // 毎晩定時バックグラウンド自動書き出し
  exportBgTime: string;             // 定時書き出し時刻 (例: "23:00")
  lastSyncTimestamp?: number;       // 最終同期日時
}

export const DEFAULT_CALENDAR_SYNC_SETTINGS: CalendarSyncSettings = {
  enabled: false,
  importEnabled: true,
  selectedCalendarIds: [],
  importOnScreenFocus: true,
  importBgDaily: false,
  importBgTime: '07:00',
  excludeAllDay: true,
  importHolidays: true,
  treatHolidaysAsSunday: true,
  exportEnabled: true,
  exportCalendarId: '',
  exportOnSave: true,
  exportBgDaily: false,
  exportBgTime: '23:00',
  lastSyncTimestamp: undefined,
};

// 補助関数: 文字列から安定した正のハッシュ数値を生成
function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// 補助関数: Dateを YYYY/MM/DD 形式へ
export function formatDateToSlash(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

// 補助関数: Dateから HH:MM 形式へ
function formatTimeToHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * ネイティブのカレンダーAPIが利用可能かを安全にチェック（未ビルド時のクラッシュ防止）
 */
export async function isCalendarAvailable(): Promise<boolean> {
  try {
    if (!Calendar || typeof Calendar.isAvailableAsync !== 'function') {
      return false;
    }
    const available = await Calendar.isAvailableAsync();
    return !!available;
  } catch (e) {
    console.warn('[calendarService] isCalendarAvailable check failed:', e);
    return false;
  }
}

/**
 * カレンダー連携設定の取得
 */
export async function getCalendarSyncSettings(): Promise<CalendarSyncSettings> {
  try {
    const db = getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'calendar_sync_settings'"
    );
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      return { ...DEFAULT_CALENDAR_SYNC_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('[calendarService] Failed to load calendar sync settings:', e);
  }
  return { ...DEFAULT_CALENDAR_SYNC_SETTINGS };
}

/**
 * カレンダー連携設定の保存
 */
export async function saveCalendarSyncSettings(settings: CalendarSyncSettings): Promise<void> {
  try {
    const db = getDB();
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('calendar_sync_settings', ?)",
      [JSON.stringify(settings)]
    );
    // バックグラウンドタスクの登録状態を同期
    if (settings.enabled && (settings.importBgDaily || settings.exportBgDaily)) {
      await registerCalendarBackgroundSync();
    } else {
      await unregisterCalendarBackgroundSync();
    }
  } catch (e) {
    console.error('[calendarService] Failed to save calendar sync settings:', e);
  }
}

/**
 * カレンダーアクセス権限の確認
 */
export async function checkCalendarPermissions(): Promise<boolean> {
  const available = await isCalendarAvailable();
  if (!available) return false;
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[calendarService] checkCalendarPermissions failed:', e);
    return false;
  }
}

/**
 * カレンダーアクセス権限のリクエスト
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  const available = await isCalendarAvailable();
  if (!available) return false;
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.error('[calendarService] requestCalendarPermissions error:', e);
    return false;
  }
}

/**
 * 端末内のイベントカレンダー一覧を取得
 */
export async function getDeviceCalendars(): Promise<Calendar.Calendar[]> {
  const available = await isCalendarAvailable();
  if (!available) return [];
  try {
    const hasPerm = await checkCalendarPermissions();
    if (!hasPerm) {
      const granted = await requestCalendarPermissions();
      if (!granted) return [];
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return calendars;
  } catch (e) {
    console.error('[calendarService] getDeviceCalendars error:', e);
    return [];
  }
}

/**
 * TreNote専用カレンダーの取得または自動生成（実績書き出し用）
 * ユーザーの既存カレンダーを汚さないための専用サブカレンダー
 */
export async function getOrCreateTreNoteCalendar(): Promise<string | null> {
  const available = await isCalendarAvailable();
  if (!available) return null;

  try {
    const calendars = await getDeviceCalendars();
    // 既存のTreNoteカレンダーを検索
    const existing = calendars.find(
      (c) => c.title === 'TreNote' || c.name === 'TreNote'
    );
    if (existing) {
      return existing.id;
    }

    // Android/iOS ごとの新規カレンダー生成
    if (Platform.OS === 'android') {
      const defaultAccount =
        calendars.find((c) => c.isPrimary) ||
        calendars.find((c) => c.source?.type === 'com.google') ||
        calendars[0];

      const source = defaultAccount?.source || {
        isLocalAccount: true,
        name: 'TreNote',
        type: 'LOCAL',
      };

      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'TreNote',
        name: 'TreNote',
        color: '#4facfe',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: source.id,
        source: source,
        ownerAccount: defaultAccount?.ownerAccount || 'TreNote',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      return newCalendarId;
    } else if (Platform.OS === 'ios') {
      const defaultSource = await Calendar.getDefaultCalendarAsync();
      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'TreNote',
        color: '#4facfe',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultSource?.source?.id,
        source: defaultSource?.source,
        name: 'TreNote',
        ownerAccount: 'TreNote',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      return newCalendarId;
    }
  } catch (e) {
    console.error('[calendarService] getOrCreateTreNoteCalendar error:', e);
  }
  return null;
}

/**
 * Googleカレンダー等から指定日の予定を取り込み、zikankanri_plans へ差分マージ
 * 手動入力された予定（source !== 'google'）は100%保護されます
 */
export async function importGoogleCalendarPlans(
  targetDate?: string
): Promise<{ success: boolean; count: number; allPlans: any[] }> {
  const available = await isCalendarAvailable();
  if (!available) {
    return { success: false, count: 0, allPlans: [] };
  }

  const settings = await getCalendarSyncSettings();
  if (!settings.enabled || !settings.importEnabled) {
    return { success: false, count: 0, allPlans: [] };
  }

  const hasPerm = await checkCalendarPermissions();
  if (!hasPerm) {
    return { success: false, count: 0, allPlans: [] };
  }

  const dateStr = targetDate || formatDateToSlash(new Date());
  // 対象日の 00:00:00 〜 23:59:59 を構築
  const [y, m, d] = dateStr.split('/').map(Number);
  const startDate = new Date(y, m - 1, d, 0, 0, 0);
  const endDate = new Date(y, m - 1, d, 23, 59, 59);

  try {
    let targetCalendarIds = settings.selectedCalendarIds;
    if (!targetCalendarIds || targetCalendarIds.length === 0) {
      // 指定がなければ利用可能なすべてのイベントカレンダーを対象
      const calendars = await getDeviceCalendars();
      // TreNote専用カレンダー自身（実績書き出し用）は予定取り込みから除外
      targetCalendarIds = calendars
        .filter((c) => c.title !== 'TreNote' && c.name !== 'TreNote')
        .map((c) => c.id);
    }

    if (targetCalendarIds.length === 0) {
      return { success: false, count: 0, allPlans: [] };
    }

    const events = await Calendar.getEventsAsync(
      targetCalendarIds,
      startDate,
      endDate
    );

    // 終日イベント除外フィルタ
    const filteredEvents = events.filter((ev) => {
      if (settings.excludeAllDay) {
        if (ev.allDay) return false;
        // 00:00〜00:00 や 00:00〜23:59 の24時間丸ごとイベントも除外
        const s = new Date(ev.startDate);
        const e = new Date(ev.endDate);
        if (s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 0 && e.getMinutes() === 0) {
          return false;
        }
      }
      return true;
    });

    // Googleイベントを 24時間管理の予定オブジェクトに変換
    const importedPlans = filteredEvents.map((ev, idx) => {
      const sDate = new Date(ev.startDate);
      const eDate = new Date(ev.endDate);

      // 日をまたぐ場合は 00:00〜23:59 でクリップ
      let startStr = formatTimeToHHMM(sDate);
      let endStr = formatTimeToHHMM(eDate);
      if (sDate < startDate) startStr = '00:00';
      if (eDate > endDate) endStr = '23:59';

      const planId = stringToHash(`google_${ev.id}_${dateStr}_${idx}`);

      return {
        id: planId,
        date: dateStr,
        start: startStr,
        end: endStr,
        items: [{ name: ev.title || '予定', percent: 100 }],
        memo: ev.notes || '',
        source: 'google',
        googleEventId: ev.id,
      };
    });

    // SQLite から既存の plans を読み込み、手動予定を保護しつつ差分マージ
    const db = getDB();
    const plansRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'zikankanri_plans'"
    );
    let existingPlans: any[] = [];
    if (plansRow && plansRow.value) {
      try {
        existingPlans = JSON.parse(plansRow.value) || [];
      } catch {
        existingPlans = [];
      }
    }

    // 他の日の予定 ＋ 今日の手動入力予定（source !== 'google'）を保持
    const preservedPlans = existingPlans.filter(
      (p) => p.date !== dateStr || p.source !== 'google'
    );

    // 今回取り込んだ最新のGoogle予定を結合
    const mergedPlans = [...preservedPlans, ...importedPlans];

    // SQLite に保存
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('zikankanri_plans', ?)",
      [JSON.stringify(mergedPlans)]
    );

    // 最終同期時刻を更新
    settings.lastSyncTimestamp = Date.now();
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('calendar_sync_settings', ?)",
      [JSON.stringify(settings)]
    );

    return { success: true, count: importedPlans.length, allPlans: mergedPlans };
  } catch (e) {
    console.error('[calendarService] importGoogleCalendarPlans error:', e);
    return { success: false, count: 0, allPlans: [] };
  }
}

/**
 * 24時間管理の活動実績（time_logs）を Google カレンダー（または TreNote 専用カレンダー）へ書き出し
 */
export async function exportLogsToGoogleCalendar(
  targetDate?: string
): Promise<{ success: boolean; count: number }> {
  const available = await isCalendarAvailable();
  if (!available) return { success: false, count: 0 };

  const settings = await getCalendarSyncSettings();
  if (!settings.enabled || !settings.exportEnabled) {
    return { success: false, count: 0 };
  }

  const hasPerm = await checkCalendarPermissions();
  if (!hasPerm) return { success: false, count: 0 };

  const dateStr = targetDate || formatDateToSlash(new Date());

  try {
    // 書き出し先カレンダーの特定
    let exportCalId = settings.exportCalendarId;
    if (!exportCalId) {
      exportCalId = (await getOrCreateTreNoteCalendar()) || '';
    }
    if (!exportCalId) {
      console.warn('[calendarService] No export calendar available');
      return { success: false, count: 0 };
    }

    const db = getDB();
    const rows = await db.getAllAsync<{
      id: number;
      activity_name: string;
      start_time: string;
      end_time: string;
      date: string;
      duration_minutes: number;
    }>(
      'SELECT id, activity_name, start_time, end_time, date, duration_minutes FROM time_logs WHERE date = ? ORDER BY start_time ASC',
      [dateStr]
    );

    if (!rows || rows.length === 0) {
      return { success: true, count: 0 };
    }

    // start_time と end_time ごとにグループ化
    const groupedMap: Record<string, { start: string; end: string; items: string[] }> = {};
    rows.forEach((r) => {
      const key = `${r.start_time}_${r.end_time}`;
      if (!groupedMap[key]) {
        groupedMap[key] = { start: r.start_time, end: r.end_time, items: [] };
      }
      if (r.activity_name && !groupedMap[key].items.includes(r.activity_name)) {
        groupedMap[key].items.push(r.activity_name);
      }
    });

    const [y, m, d] = dateStr.split('/').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59);

    // 既に書き出し先カレンダーに存在する当日のイベントを取得（重複防止）
    const existingEvents = await Calendar.getEventsAsync(
      [exportCalId],
      dayStart,
      dayEnd
    );

    let exportCount = 0;
    for (const group of Object.values(groupedMap)) {
      const [sh, sm] = group.start.split(':').map(Number);
      const [eh, em] = group.end.split(':').map(Number);

      const eventStart = new Date(y, m - 1, d, sh, sm, 0);
      let eventEnd = new Date(y, m - 1, d, eh, em, 0);
      if (eventEnd < eventStart) {
        // 日をまたぐ場合は翌日
        eventEnd = new Date(y, m - 1, d + 1, eh, em, 0);
      }

      const title = group.items.join(' / ') || '活動記録';
      const markerNote = `[TreNote Log: ${dateStr} ${group.start}-${group.end}]`;

      // 既存イベントの中に同じ時間帯・マーカーがあるか確認
      const matchingEvent = existingEvents.find(
        (ev) =>
          ev.notes?.includes(markerNote) ||
          (formatTimeToHHMM(new Date(ev.startDate)) === group.start &&
            formatTimeToHHMM(new Date(ev.endDate)) === group.end)
      );

      if (matchingEvent) {
        // 既存イベントのタイトルを更新
        if (matchingEvent.title !== title) {
          await Calendar.updateEventAsync(matchingEvent.id, {
            title,
            notes: markerNote,
          });
        }
      } else {
        // 新規作成
        await Calendar.createEventAsync(exportCalId, {
          title,
          startDate: eventStart,
          endDate: eventEnd,
          notes: markerNote,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        exportCount++;
      }
    }

    settings.lastSyncTimestamp = Date.now();
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('calendar_sync_settings', ?)",
      [JSON.stringify(settings)]
    );

    return { success: true, count: exportCount };
  } catch (e) {
    console.error('[calendarService] exportLogsToGoogleCalendar error:', e);
    return { success: false, count: 0 };
  }
}

// 連続保存時のAPI過剰呼び出しを防止するデバウンスタイマー
let exportDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 1.5秒のデバウンスをかけた実績自動書き出し（WebViewからの連続更新用）
 */
export function debouncedExportLogsToGoogleCalendar(targetDate?: string) {
  if (exportDebounceTimer) {
    clearTimeout(exportDebounceTimer);
  }
  exportDebounceTimer = setTimeout(() => {
    exportLogsToGoogleCalendar(targetDate).catch((e) => {
      console.warn('[calendarService] debouncedExportLogs failed:', e);
    });
  }, 1500);
}

/**
 * バックグラウンドタスク定義（TaskManager）
 * アプリ未起動時にも朝の予定取り込み・夜の実績書き出しを実行
 */
try {
  if (!TaskManager.isTaskDefined(CALENDAR_BG_SYNC_TASK)) {
    TaskManager.defineTask(CALENDAR_BG_SYNC_TASK, async () => {
      try {
        console.log('[CALENDAR_BG_SYNC_TASK] Executing background sync task...');
        const available = await isCalendarAvailable();
        if (!available) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const settings = await getCalendarSyncSettings();
        if (!settings.enabled) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const now = new Date();
        const currentHHMM = formatTimeToHHMM(now);
        let hasNewData = false;

        // 朝の定時予定取り込みチェック
        if (settings.importBgDaily && settings.importBgTime) {
          const [tHour] = settings.importBgTime.split(':').map(Number);
          const currentHour = now.getHours();
          // 設定時刻の前後2時間以内であれば取り込みを実行
          if (Math.abs(currentHour - tHour) <= 1) {
            const res = await importGoogleCalendarPlans();
            if (res.success && res.count > 0) hasNewData = true;
          }
        }

        // 夜の定時実績書き出しチェック
        if (settings.exportBgDaily && settings.exportBgTime) {
          const [tHour] = settings.exportBgTime.split(':').map(Number);
          const currentHour = now.getHours();
          if (Math.abs(currentHour - tHour) <= 1) {
            const res = await exportLogsToGoogleCalendar();
            if (res.success && res.count > 0) hasNewData = true;
          }
        }

        return hasNewData
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (err) {
        console.error('[CALENDAR_BG_SYNC_TASK] Error during background task:', err);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }
} catch (e) {
  console.warn('[calendarService] Failed to define CALENDAR_BG_SYNC_TASK:', e);
}

/**
 * バックグラウンド同期タスクの登録
 */
export async function registerCalendarBackgroundSync(): Promise<boolean> {
  const available = await isCalendarAvailable();
  if (!available) return false;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(CALENDAR_BG_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(CALENDAR_BG_SYNC_TASK, {
        minimumInterval: 30 * 60, // 30分間隔でチェック
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('[calendarService] Background sync task registered successfully');
    }
    return true;
  } catch (e) {
    console.error('[calendarService] Failed to register background task:', e);
    return false;
  }
}

/**
 * バックグラウンド同期タスクの解除
 */
export async function unregisterCalendarBackgroundSync(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(CALENDAR_BG_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(CALENDAR_BG_SYNC_TASK);
      console.log('[calendarService] Background sync task unregistered');
    }
    return true;
  } catch (e) {
    console.warn('[calendarService] Failed to unregister background task:', e);
    return false;
  }
}

/**
 * アプリ起動時のカレンダー同期初期化
 */
export async function initCalendarSync(): Promise<void> {
  try {
    const available = await isCalendarAvailable();
    if (!available) return;

    const settings = await getCalendarSyncSettings();
    if (settings.enabled && (settings.importBgDaily || settings.exportBgDaily)) {
      await registerCalendarBackgroundSync();
    }
  } catch (e) {
    console.warn('[calendarService] initCalendarSync error:', e);
  }
}

/**
 * 日本の祝日を計算（フォールバック用）
 * 振替休日・国民の休日・春分/秋分の日を含む
 */
export function calculateJapaneseHolidays(year: number): Record<string, string> {
  const holidays: Record<string, string> = {};

  const add = (m: number, d: number, name: string) => {
    if (d > 0 && d <= 31) {
      const mStr = String(m).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      holidays[`${year}/${mStr}/${dStr}`] = name;
    }
  };

  // 第N月曜日の日付を取得
  const getNthMonday = (m: number, n: number): number => {
    const firstDay = new Date(year, m - 1, 1).getDay();
    const firstMon = firstDay <= 1 ? 1 + (1 - firstDay) : 1 + (8 - firstDay);
    return firstMon + (n - 1) * 7;
  };

  // 固定祝日
  add(1, 1, '元日');
  add(1, getNthMonday(1, 2), '成人の日');
  add(2, 11, '建国記念の日');
  if (year >= 2020) add(2, 23, '天皇誕生日');

  // 春分の日 (計算式: 2020〜2030年対応)
  const shunbunDay = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  add(3, shunbunDay, '春分の日');

  add(4, 29, '昭和の日');
  add(5, 3, '憲法記念日');
  add(5, 4, 'みどりの日');
  add(5, 5, 'こどもの日');

  // 海の日 (7月第3月曜日)
  add(7, getNthMonday(7, 3), '海の日');

  // 山の日 (8/11)
  if (year >= 2016) add(8, 11, '山の日');

  // 敬老の日 (9月第3月曜日)
  const keiroDay = getNthMonday(9, 3);
  add(9, keiroDay, '敬老の日');

  // 秋分の日
  const shubunDay = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  add(9, shubunDay, '秋分の日');

  // 国民の休日 (敬老の日と秋分の日の間の平日)
  if (shubunDay - keiroDay === 2) {
    add(9, keiroDay + 1, '国民の休日');
  }

  // スポーツの日 (10月第2月曜日)
  add(10, getNthMonday(10, 2), 'スポーツの日');

  add(11, 3, '文化の日');
  add(11, 23, '勤労感謝の日');

  // 振替休日の判定
  // 祝日が日曜日の場合、その翌日以降の最も早い平日を振替休日とする
  const dates = Object.keys(holidays).sort();
  for (const dateStr of dates) {
    const [y, m, d] = dateStr.split('/').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (dateObj.getDay() === 0) { // 日曜日
      let cur = new Date(dateObj);
      while (true) {
        cur.setDate(cur.getDate() + 1);
        const nextY = cur.getFullYear();
        const nextM = String(cur.getMonth() + 1).padStart(2, '0');
        const nextD = String(cur.getDate()).padStart(2, '0');
        const nextStr = `${nextY}/${nextM}/${nextD}`;
        if (!holidays[nextStr]) {
          holidays[nextStr] = '振替休日';
          break;
        }
      }
    }
  }

  return holidays;
}

/**
 * 端末/Googleカレンダーおよび計算フォールバックから祝日データを同期してSQLiteに保存
 */
export async function syncHolidaysFromDevice(year?: number): Promise<Record<string, string>> {
  const currentYear = year || new Date().getFullYear();
  let mergedHolidays: Record<string, string> = {};

  // 1. まず計算フォールバックで前年・今年・来年の祝日を生成
  try {
    const h0 = calculateJapaneseHolidays(currentYear - 1);
    const h1 = calculateJapaneseHolidays(currentYear);
    const h2 = calculateJapaneseHolidays(currentYear + 1);
    mergedHolidays = { ...h0, ...h1, ...h2 };
  } catch (err) {
    console.warn('[calendarService] Holiday calculation error:', err);
  }

  // 2. 端末カレンダーが利用可能な場合、端末の祝日カレンダーから実際のイベントを取得してマージ
  try {
    const available = await isCalendarAvailable();
    if (available) {
      const hasPerm = await checkCalendarPermissions();
      if (hasPerm) {
        const calendars = await getDeviceCalendars();
        const holidayCals = calendars.filter((c) => {
          const t = (c.title || '').toLowerCase();
          const n = (c.name || '').toLowerCase();
          const s = (c.source?.name || '').toLowerCase();
          const o = (c.ownerAccount || '').toLowerCase();
          return (
            t.includes('祝日') || t.includes('holiday') ||
            n.includes('祝日') || n.includes('holiday') ||
            s.includes('holiday') || o.includes('holiday') ||
            o.includes('japan')
          );
        });

        if (holidayCals.length > 0) {
          const startDate = new Date(currentYear - 1, 0, 1);
          const endDate = new Date(currentYear + 1, 11, 31, 23, 59, 59);
          const events = await Calendar.getEventsAsync(
            holidayCals.map((c) => c.id),
            startDate,
            endDate
          );

          events.forEach((ev) => {
            if (ev.title) {
              const d = new Date(ev.startDate);
              const dateKey = formatDateToSlash(d);
              mergedHolidays[dateKey] = ev.title;
            }
          });
        }
      }
    }
  } catch (e) {
    console.warn('[calendarService] Error syncing holidays from device:', e);
  }

  // 3. SQLite にキャッシュ保存
  try {
    const db = getDB();
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('zikankanri_holidays', ?)",
      [JSON.stringify(mergedHolidays)]
    );
  } catch (e) {
    console.error('[calendarService] Failed to cache holidays to DB:', e);
  }

  return mergedHolidays;
}

/**
 * キャッシュされた祝日マップの取得
 */
export async function getCachedHolidays(): Promise<Record<string, string>> {
  try {
    const db = getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'zikankanri_holidays'"
    );
    if (row && row.value) {
      return JSON.parse(row.value);
    }
  } catch (e) {
    console.warn('[calendarService] getCachedHolidays failed:', e);
  }
  return calculateJapaneseHolidays(new Date().getFullYear());
}

