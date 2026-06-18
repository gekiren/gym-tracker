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
  version: '1.0.83', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'Android端末におけるAIコーチ画面のキーボード表示不具合を改善しました。',
      'アプリ内課金の内部ログ出力セキュリティを強化しました。'
    ],
    en: [
      'Fixed keyboard rendering issue on the AI Coach screen for Android devices.',
      'Enhanced logging security for in-app purchases.'
    ]
  }
};
