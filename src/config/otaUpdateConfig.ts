export interface OTAUpdateConfig {
  version: string;
  title: {
    ja: string;
    en: string;
  };
  notes: {
    ja: string[];
    en: string[];
  };
}

export const CURRENT_OTA_CONFIG: OTAUpdateConfig = {
  version: '2.3.75',
  title: {
    ja: '🤖 AI連携強化：24時間管理（予定・実績）＆習慣カウンターの読み書き対応',
    en: '🤖 AI Sync Upgrade: Read/Write Support for 24h Logs & Habit Counter',
  },
  notes: {
    ja: [
      'Googleドライブ AI双方向同期で、24時間管理の「実績タイムログ（actualLogs）」の書き込みや予定の日付形式整合性を強化しました。',
      '習慣カウンター（習慣項目の作成・更新・削除、日別達成回数の記録）のAI読み書きに対応しました。',
    ],
    en: [
      'Added AI agent write support for 24h actual time logs (actualLogs) and improved plan date format compatibility in Google Drive sync.',
      'Added full read/write support for Habit Counter items and daily completion counts via AI proposals.',
    ],
  },
};
