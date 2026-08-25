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
  version: '2.0.0',
  title: {
    ja: '✨ クイックランチャー7枠拡張 ＆ ウィジェット表示改善',
    en: '✨ 7-Slot Quick Launcher & Widget Fixes',
  },
  notes: {
    ja: [
      'ホーム画面の「クイックランチャー」ウィジェットが最大7枠に拡張されました。',
      'ウィジェット追加画面の文字化け（Unicode表記）を修正しました。',
      'クイックランチャーの筋トレアイコンのデザインおよび全体の表示品質を改善しました。',
    ],
    en: [
      'Expanded the Home Screen Quick Launcher widget to up to 7 customizable slots.',
      'Fixed text character encoding issues on the widget preview/addition screen.',
      'Improved the workout icon design and overall widget visual quality.',
    ],
  },
};
