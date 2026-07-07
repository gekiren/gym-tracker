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
  version: '1.1.8', // OTA識別用のバージョン文字列
  title: {
    ja: '水分補給画面のダークモード対応',
    en: 'Dark Mode Support for Hydration Tracker',
  },
  notes: {
    ja: [
      '水分補給トラッカー画面をダークモードに対応させ、アプリ全体のデザインと統一しました。',
      '水分補給画面のテーマカラーに筋トレ記録側の青色（#4facfe）を採用しました。',
    ],
    en: [
      'Updated the hydration tracker UI to support dark mode, aligning with the app\'s overall theme.',
      'Applied the primary blue color (#4facfe) from the workout log to the hydration tracker.',
    ]
  }
};
