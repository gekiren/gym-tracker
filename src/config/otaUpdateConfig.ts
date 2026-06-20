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
  version: '1.1.1', // OTA識別用のバージョン文字列
  title: {
    ja: 'AIトレーナー画面の多言語化修正',
    en: 'AI Coach Localization Fix',
  },
  notes: {
    ja: [
      '英語設定時に一部のシステムメッセージや案内文が日本語で表示される問題を修正しました。',
    ],
    en: [
      'Fixed an issue where some system messages and guides were shown in Japanese when the language is set to English.',
    ]
  }
};
