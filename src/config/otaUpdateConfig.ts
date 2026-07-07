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
  version: '1.1.16', // OTA識別用のバージョン文字列
  title: {
    ja: 'データ同期不具合の解決',
    en: 'Resolve Data Sync Issues',
  },
  notes: {
    ja: [
      '一部環境における生localStorageの書き込み制限を回避するため、メモリ共有による確実な初期データ同期方式に改修しました。',
    ],
    en: [
      'Migrated initial data synchronization to a memory-based mechanism to bypass write restrictions on raw localStorage.',
    ]
  }
};
