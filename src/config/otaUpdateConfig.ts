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
  version: '1.1.84', // OTA識別用のバージョン文字列
  title: {
    ja: '設定画面ヘッダーの表示最適化',
    en: 'Settings Header Display Fix',
  },
  notes: {
    ja: [
      '各設定画面でヘッダーが二重（階層）表示される問題を修正しました。',
      '統一された「＜」戻るボタン付きカスタムヘッダーのみを表示するよう最適化しました。',
    ],
    en: [
      'Fixed duplicate navigation headers in settings screens.',
      'Optimized layout to consistently display the unified back button header.',
    ]
  }
};




