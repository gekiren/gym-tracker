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
  version: '2.3.65',
  title: {
    ja: '🛡️ 起動時のデータベースロック対策',
    en: '🛡️ Database lock handling at startup',
  },
  notes: {
    ja: [
      'アップデート直後などにデータベースが一時的にロックされていても、最大10秒待機し、自動で再試行して起動するようにしました。',
      'データベースエラー画面から「端末内バックアップから復元」へ進めるようにしました。',
    ],
    en: [
      'The app now waits up to 10 seconds and retries automatically when the database is temporarily locked (e.g. right after an update).',
      'Added a "Restore from on-device backup" button to the database error screen.',
    ],
  },
};
