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
  version: '1.0.97', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '初回起動時、アプリの言語が日本語に設定されている場合に、重量単位（kg / lbs）の選択画面をスキップして自動的に「kg」を設定するように改善しました。'
    ],
    en: [
      'Skipped the weight unit (kg / lbs) selection onboarding screen and set default to "kg" when the app language is Japanese.'
    ]
  }
};
