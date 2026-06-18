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
  version: '1.0.85', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'Android端末におけるAIコーチ画面のキーボード回避時の高さを微調整しました。',
      'アプリ内課金の内部ログ出力セキュリティを強化しました。'
    ],
    en: [
      'Fine-tuned keyboard avoiding height on the AI Coach screen for Android devices.',
      'Enhanced logging security for in-app purchases.'
    ]
  }
};
