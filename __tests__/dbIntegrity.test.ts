jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
}));
jest.mock('../src/db/dbBackupService', () => ({
  restoreFromHealthyBackup: jest.fn().mockResolvedValue(false),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { checkAndRepairDB, isCorruptionError } from '../src/db/dbIntegrityService';

describe('dbIntegrityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('classifies corruption vs transient errors', () => {
    expect(isCorruptionError(new Error('database disk image is malformed'))).toBe(true);
    expect(isCorruptionError(new Error('file is not a database'))).toBe(true);
    expect(isCorruptionError(new Error('database is locked'))).toBe(false);
    expect(isCorruptionError(new Error('NullPointerException'))).toBe(false);
  });

  it('returns ok when quick_check passes', async () => {
    const db: any = { getFirstAsync: jest.fn().mockResolvedValue({ quick_check: 'ok' }) };
    await expect(checkAndRepairDB(db)).resolves.toBe('ok');
  });

  it('never deletes the DB on transient errors; throws instead', async () => {
    const db: any = {
      getFirstAsync: jest.fn().mockRejectedValue(new Error('database is locked')),
      closeAsync: jest.fn(),
    };
    await expect(checkAndRepairDB(db)).rejects.toThrow('DB_TRANSIENT_ERROR');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    expect(db.closeAsync).not.toHaveBeenCalled();
  }, 15000);
});
