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
  version: '1.0.87', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'データベース処理の型安全性を向上させました。',
      'SNSシェアテキストおよびYouTube検索キーワードの多言語対応を行いました。',
      '一部のアイコンボタンにアクセシビリティラベルを設定し、読み上げ機能を改善しました。',
      'アプリ内購入処理におけるデバッグログのセキュリティを強化しました。'
    ],
    en: [
      'Improved database query type safety.',
      'Added multi-language support for SNS sharing text and YouTube search keywords.',
      'Added accessibility labels to icon-only buttons for screen readers.',
      'Enhanced security of in-app purchase debug logs.'
    ]
  }
};

