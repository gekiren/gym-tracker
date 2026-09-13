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
  version: '2.2.4',
  title: {
    ja: '🚑 9月13日データの自動救出・復旧パッチ',
    en: '🚑 Auto-Rescue & Recovery Patch for Sep 13 Data',
  },
  notes: {
    ja: [
      '端末内のバックアップファイルを探索し、9月13日のトレーニングおよび食事データを自動復旧します。',
      'アプリ更新時のデータベース過剰復元を防止する安全ガードを適用しました。',
    ],
    en: [
      'Automatically searches device backups to restore September 13th workout and meal logs.',
      'Added safety guards to prevent unexpected database rollback during app updates.',
    ],
  },
};
