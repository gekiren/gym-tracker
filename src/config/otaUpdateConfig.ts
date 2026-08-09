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
  version: '1.2.0', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian連携とHealth Connect連携の拡張',
    en: 'Obsidian & Health Connect Integration',
  },
  notes: {
    ja: [
      'Android Health Connect 連携機能（歩数・睡眠・心拍・体組成）の追加',
      'Obsidian デイリーノートへのヘルスケアデータ自動同期機能の追加',
      'Obsidian カテゴリ別フォルダ設定への「ヘルスケア」項目追加',
    ],
    en: [
      'Added Android Health Connect integration (Steps, Sleep, Heart rate, Weight).',
      'Added auto-sync for health data to Obsidian Daily Notes.',
      'Added Health folder option to Obsidian settings.',
    ],
  },
};




