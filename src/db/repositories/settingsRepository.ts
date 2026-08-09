import * as SQLite from 'expo-sqlite';
import { addMonths } from 'date-fns';
import { getDB } from '../connection';
import { computeIsPremium } from '../../utils/subscriptionUtils';

export const getSettings = async () => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
};

export const saveSetting = async (key: string, value: string) => {
  const conn = getDB();
  await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
};

export const getPremiumStatusFromDB = async (): Promise<{ isPremium: boolean; premiumUntil: string; isEarlyAdopter: boolean }> => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings WHERE key IN ("is_early_adopter", "premium_until")'
  );
  const stored: Record<string, string> = {};
  for (const r of rows) {
    stored[r.key] = r.value;
  }
  const premiumUntil = stored['premium_until'] || '';
  const isEarlyAdopter = stored['is_early_adopter'] === 'true';
  const isPremium = computeIsPremium(premiumUntil, isEarlyAdopter);
  return {
    isPremium,
    premiumUntil,
    isEarlyAdopter
  };
};

export const activatePremiumFromPromo = async (): Promise<string> => {
  const conn = getDB();
  const oneMonthFromNow = addMonths(new Date(), 1);
  const premiumUntilStr = oneMonthFromNow.toISOString();
  
  await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES ("premium_until", ?)', [premiumUntilStr]);
  await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES ("ai_tokens_balance", "20")', []);
  return premiumUntilStr;
};

export const getMaxAITokens = async (conn: SQLite.SQLiteDatabase): Promise<number> => {
  const settingsRows = await conn.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings WHERE key IN ("is_early_adopter", "premium_until")');
  const stored: Record<string, string> = {};
  for (const r of settingsRows) {
    stored[r.key] = r.value;
  }
  const isEarly = stored['is_early_adopter'] === 'true';
  const isPremium = computeIsPremium(stored['premium_until'], isEarly);

  return isPremium ? 20 : 5;
};

export const getAITokensBalance = async (): Promise<number> => {
  const conn = getDB();
  const balanceRow = await conn.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = "ai_tokens_balance"');
  const lastResetRow = await conn.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = "ai_tokens_last_reset"');

  const maxTokens = await getMaxAITokens(conn);

  let balance = balanceRow ? parseInt(balanceRow.value, 10) : maxTokens;
  if (balance > maxTokens) {
    balance = maxTokens;
  }
  const lastReset = lastResetRow ? lastResetRow.value : new Date().toISOString();

  const lastResetDate = new Date(lastReset);
  const now = new Date();
  
  const isDifferentMonth = 
    now.getFullYear() !== lastResetDate.getFullYear() || 
    now.getMonth() !== lastResetDate.getMonth();

  if (isDifferentMonth) {
    balance = maxTokens;
    const nowISO = now.toISOString();
    await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES ("ai_tokens_balance", ?)', [maxTokens.toString()]);
    await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES ("ai_tokens_last_reset", ?)', [nowISO]);
  }

  return balance;
};

export const consumeAIToken = async (): Promise<boolean> => {
  await getAITokensBalance();

  const conn = getDB();
  const result = await conn.runAsync(`
    UPDATE settings 
    SET value = CAST(CAST(value AS INTEGER) - 1 AS TEXT)
    WHERE key = 'ai_tokens_balance' AND CAST(value AS INTEGER) > 0
  `);

  return result.changes > 0;
};

export const refundAIToken = async (): Promise<void> => {
  const conn = getDB();
  const maxTokens = await getMaxAITokens(conn);

  await conn.runAsync(`
    UPDATE settings 
    SET value = CAST(
      CASE 
        WHEN CAST(value AS INTEGER) < ? THEN CAST(value AS INTEGER) + 1 
        ELSE ? 
      END AS TEXT
    ) 
    WHERE key = 'ai_tokens_balance'
  `, [maxTokens, maxTokens]);
};
