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
  version: '1.0.51', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '設定の読み込み処理（loadSettings）のコード構造をリファクタリングし、アプリの動作安定性を向上させました。'
    ],
    en: [
      'Refactored the settings loading process (loadSettings) code structure to improve application stability.'
    ]
  }
};
