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
  version: '2.1.5',
  title: {
    ja: '🛠️ アプリ再起動時のトップ画面表示の最適化',
    en: '🛠️ Optimized Startup Navigation & Top-Level Dashboard',
  },
  notes: {
    ja: [
      'アプリ再起動時やアップデート適用後に意図せず水分補給画面が開いてしまう不具合を修正しました。',
      '起動時のトップ画面として常にダッシュボード画面が表示されるよう動作を最適化しました。',
    ],
    en: [
      'Fixed an issue where the hydration screen was unintentionally displayed upon app reload or update application.',
      'Optimized startup routing to ensure the dashboard screen is consistently displayed as the top-level screen.',
    ],
  },
};
