import { getLocalTodayISO, getLocalTodaySlash } from '../src/utils/dateUtils';
import { useLifelogStore } from '../src/store/lifelogStore';
import {
  getSyncDiagnosticsLogs,
  handleWaterLogAdd,
  handleWaterLogDelete,
  handleWebViewMessage,
} from '../src/services/lifelogSyncService';
import * as database from '../src/db/database';
import { recordFeatureAction } from '../src/services/featureUnlockService';
import {
  deleteHealthConnectRecordsByClientIds,
  writeWaterLogToHealthConnect,
} from '../src/services/health/healthWriter';

type RunCall = { sql: string; params: any[] };

const runCalls: RunCall[] = [];
const mockDbState = {
  waterRows: [] as Array<{ timestamp: number; amount: number; caffeine: number | null; date: string }>,
};

const mockDb = {
  getAllAsync: jest.fn(async (sql: string, params: any[] = []) => {
    if (sql.includes('FROM water_logs') && sql.includes('date >= ?')) {
      const cutoff = String(params[0] || '');
      return mockDbState.waterRows.filter((r) => r.date >= cutoff);
    }
    if (sql.includes('FROM water_logs')) {
      return [...mockDbState.waterRows];
    }
    return [];
  }),
  getFirstAsync: jest.fn(async () => null),
  runAsync: jest.fn(async (sql: string, params: any[] = []) => {
    runCalls.push({ sql, params });
    return { lastInsertRowId: 1, changes: 1 };
  }),
  withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => {
    await fn();
  }),
};

jest.mock('../src/db/database', () => ({
  getDB: jest.fn(() => mockDb),
  withDBQueue: jest.fn(async (fn: (db: any) => Promise<any>) => fn(mockDb)),
  getWaterLogs: jest.fn(async () => []),
  addWaterLog: jest.fn(async () => 1),
  deleteWaterLog: jest.fn(async () => undefined),
  getWaterGoal: jest.fn(async () => 2000),
  setWaterGoal: jest.fn(async () => undefined),
  getCaffeineLimit: jest.fn(async () => 400),
  setCaffeineLimit: jest.fn(async () => undefined),
  getTimeLogs: jest.fn(async () => []),
  addTimeLog: jest.fn(async () => 1),
  deleteTimeLog: jest.fn(async () => undefined),
  updateTimeLog: jest.fn(async () => undefined),
  getHabitItems: jest.fn(async () => []),
  addHabitItem: jest.fn(async () => 1),
  deleteHabitItem: jest.fn(async () => undefined),
  updateHabitItem: jest.fn(async () => undefined),
  getHabitLogs: jest.fn(async () => []),
  addHabitLog: jest.fn(async () => 1),
  deleteHabitLog: jest.fn(async () => undefined),
  deleteLastHabitLog: jest.fn(async () => undefined),
  getSettingValue: jest.fn(async () => null),
}));

jest.mock('../src/services/featureUnlockService', () => ({
  recordFeatureAction: jest.fn(),
}));

jest.mock('../src/services/googleDrive/driveSyncTrigger', () => ({
  triggerDebouncedDriveUpload: jest.fn(),
}));

jest.mock('../src/services/health/healthWriter', () => ({
  writeWaterLogToHealthConnect: jest.fn().mockResolvedValue(true),
  deleteHealthConnectRecordsByClientIds: jest.fn().mockResolvedValue(true),
}));

describe('Water date localization, rollover, and incremental sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runCalls.length = 0;
    mockDbState.waterRows = [];
    useLifelogStore.setState({
      currentDate: '',
      lastTodayDate: '2026/11/23',
      waterLogs: [],
      waterLogsDate: null,
      waterGoal: 2000,
      caffeineLimit: 400,
      timeLogs: [],
      habitItems: [],
      habitLogs: [],
      routineData: [],
      daySummary: null,
      isLoading: false,
      activeRoutineState: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('getLocalTodaySlash and getLocalTodayISO return local date even at 00:30 local time', () => {
    const earlyMorning = new Date(2026, 10, 23, 0, 30, 0);
    expect(getLocalTodaySlash(earlyMorning)).toBe('2026/11/23');
    expect(getLocalTodayISO(earlyMorning)).toBe('2026-11-23');

    jest.useFakeTimers();
    jest.setSystemTime(earlyMorning);
    expect(getLocalTodaySlash()).toBe('2026/11/23');
    expect(getLocalTodayISO()).toBe('2026-11-23');
  });

  test('resolveActiveDate and syncTodayIfDateRolledOver initialize empty date and follow midnight rollover', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 23, 0, 5, 0));

    // 1. Initial empty currentDate -> local today
    const initRes = await useLifelogStore.getState().syncTodayIfDateRolledOver();
    expect(initRes).toEqual({ date: '2026/11/23', reloaded: true });
    expect(useLifelogStore.getState().currentDate).toBe('2026/11/23');
    expect(useLifelogStore.getState().waterLogsDate).toBe('2026/11/23');

    // 2. Midnight rollover when user was viewing yesterday's "today"
    useLifelogStore.setState({
      currentDate: '2026/11/22',
      lastTodayDate: '2026/11/22',
      waterLogsDate: '2026/11/22',
    });
    const rolloverRes = await useLifelogStore.getState().syncTodayIfDateRolledOver();
    expect(rolloverRes).toEqual({ date: '2026/11/23', reloaded: true });
    expect(useLifelogStore.getState().currentDate).toBe('2026/11/23');
    expect(useLifelogStore.getState().lastTodayDate).toBe('2026/11/23');
    expect(useLifelogStore.getState().waterLogsDate).toBe('2026/11/23');
  });

  test('resolveActiveDate preserves user-selected past date both within same day and across midnight', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 23, 13, 0, 0));

    // Same day manual past date
    useLifelogStore.setState({
      currentDate: '2026/11/21',
      lastTodayDate: '2026/11/23',
    });
    const sameDayRes = await useLifelogStore.getState().syncTodayIfDateRolledOver();
    expect(sameDayRes).toEqual({ date: '2026/11/21', reloaded: false });
    expect(useLifelogStore.getState().currentDate).toBe('2026/11/21');

    // Across midnight while user explicitly viewing an older date
    useLifelogStore.setState({
      currentDate: '2026/11/20',
      lastTodayDate: '2026/11/22',
    });
    const crossMidnightRes = await useLifelogStore.getState().syncTodayIfDateRolledOver();
    expect(crossMidnightRes).toEqual({ date: '2026/11/20', reloaded: false });
    expect(useLifelogStore.getState().currentDate).toBe('2026/11/20');
    expect(useLifelogStore.getState().lastTodayDate).toBe('2026/11/23');
  });

  test('setCurrentDate and loadWaterData discard stale async responses from other dates', async () => {
    let resolveNov22!: (rows: any[]) => void;
    const nov22Promise = new Promise<any[]>((resolve) => {
      resolveNov22 = resolve;
    });

    const getWaterLogsMock = database.getWaterLogs as jest.Mock;
    getWaterLogsMock.mockImplementation((date: string) => {
      if (date === '2026/11/22') return nov22Promise;
      if (date === '2026/11/23') {
        return Promise.resolve([{ id: 2, amount: 300, timestamp: 2000, date: '2026/11/23', caffeine: 0 }]);
      }
      return Promise.resolve([]);
    });

    const staleReq = useLifelogStore.getState().setCurrentDate('2026/11/22');
    await useLifelogStore.getState().setCurrentDate('2026/11/23');

    resolveNov22([{ id: 1, amount: 900, timestamp: 1000, date: '2026/11/22', caffeine: 0 }]);
    await staleReq;

    const stateAfterSet = useLifelogStore.getState();
    expect(stateAfterSet.currentDate).toBe('2026/11/23');
    expect(stateAfterSet.waterLogsDate).toBe('2026/11/23');
    expect(stateAfterSet.waterLogs).toHaveLength(1);
    expect(stateAfterSet.waterLogs[0].amount).toBe(300);
    expect(stateAfterSet.isLoading).toBe(false);

    // Also test stale loadWaterData for another date
    getWaterLogsMock.mockResolvedValueOnce([
      { id: 9, amount: 999, timestamp: 9000, date: '2026/11/21', caffeine: 0 },
    ]);
    await useLifelogStore.getState().loadWaterData('2026/11/21');

    const stateAfterLoad = useLifelogStore.getState();
    expect(stateAfterLoad.currentDate).toBe('2026/11/23');
    expect(stateAfterLoad.waterLogsDate).toBe('2026/11/23');
    expect(stateAfterLoad.waterLogs[0].amount).toBe(300);
  });

  test('handleWaterLogAdd and handleWaterLogDelete execute single-row SQL without full table delete', async () => {
    const ts = 1795400000123;
    await handleWaterLogAdd(
      { id: ts, timestamp: ts, amount: 250, caffeine: 80, date: '2026/11/23' },
      '2026/11/23'
    );

    expect(runCalls).toHaveLength(1);
    expect(runCalls[0].sql).toContain('INSERT INTO water_logs');
    expect(runCalls[0].params).toEqual([250, ts, '2026/11/23', 80]);
    expect(runCalls.some((c) => c.sql.trim() === 'DELETE FROM water_logs')).toBe(false);
    expect(recordFeatureAction).toHaveBeenCalledWith('water', '2026/11/23');
    expect(writeWaterLogToHealthConnect).toHaveBeenCalledWith({
      amount: 250,
      timestamp: ts,
      date: '2026/11/23',
    });

    runCalls.length = 0;
    await handleWaterLogDelete(ts, '2026/11/23');

    expect(runCalls).toHaveLength(1);
    expect(runCalls[0].sql).toBe('DELETE FROM water_logs WHERE timestamp = ?');
    expect(runCalls[0].params).toEqual([ts]);
    expect(deleteHealthConnectRecordsByClientIds).toHaveBeenCalledWith('Hydration', [
      `trenote_water_${ts}`,
    ]);
  });

  test('fallback hydration_data_v1 sync uses diff queries, preserves >365d records, and blocks wiping currentDate', async () => {
    const tsOld = 1700000000000;
    const tsYesterday = 1795310000000;
    const tsToday1 = 1795395000000;
    const tsToday2 = 1795396000000;
    const tsTodayNew = 1795397000000;

    // Include a >365d old row in DB that won't be matched by date >= cutoffDate
    mockDbState.waterRows = [
      { timestamp: tsOld, amount: 500, caffeine: 0, date: '2024/01/01' },
      { timestamp: tsYesterday, amount: 200, caffeine: 0, date: '2026/11/22' },
      { timestamp: tsToday1, amount: 250, caffeine: 0, date: '2026/11/23' },
      { timestamp: tsToday2, amount: 150, caffeine: 80, date: '2026/11/23' },
    ];

    // Case 1: Normal incremental addition via fallback payload (no full-table DELETE)
    const payloadAdd = JSON.stringify([
      { id: tsYesterday, timestamp: tsYesterday, amount: 200, caffeine: 0, date: '2026/11/22' },
      { id: tsToday1, timestamp: tsToday1, amount: 250, caffeine: 0, date: '2026/11/23' },
      { id: tsToday2, timestamp: tsToday2, amount: 150, caffeine: 80, date: '2026/11/23' },
      { id: tsTodayNew, timestamp: tsTodayNew, amount: 300, caffeine: 0, date: '2026/11/23' },
    ]);

    await handleWebViewMessage('hydration_data_v1', payloadAdd, '2026/11/23');

    expect(runCalls.some((c) => c.sql.trim() === 'DELETE FROM water_logs')).toBe(false);
    expect(runCalls.some((c) => c.sql.startsWith('DELETE FROM water_logs WHERE timestamp'))).toBe(false);
    expect(runCalls).toHaveLength(1);
    expect(runCalls[0].sql).toContain('INSERT INTO water_logs');
    expect(runCalls[0].params).toEqual([300, tsTodayNew, '2026/11/23', 0]);

    // Case 2: Safety guard blocks wiping all currentDate records when >=2 exist in DB and 0 incoming for currentDate
    runCalls.length = 0;
    const payloadMissingToday = JSON.stringify([
      { id: tsYesterday, timestamp: tsYesterday, amount: 200, caffeine: 0, date: '2026/11/22' },
    ]);

    await handleWebViewMessage('hydration_data_v1', payloadMissingToday, '2026/11/23');

    expect(runCalls.some((c) => c.sql.includes('DELETE FROM water_logs'))).toBe(false);
    const diagLogs = getSyncDiagnosticsLogs();
    expect(diagLogs.some((l) => l.includes('Skipped wiping currentDate (2026/11/23)'))).toBe(true);
  });
});
