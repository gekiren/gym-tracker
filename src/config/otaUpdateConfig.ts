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
  version: '2.3.41',
  title: {
    ja: '🎨 履歴・AIコーチ・体組成UIの最適化',
    en: '🎨 UI & Theme Refinements (History, AI Coach & Body)',
  },
  notes: {
    ja: [
      '履歴（ワークアウト・種目・グラフ・ライフログ）およびAIコーチ画面がダーク／ピュアブラックテーマに動的対応し、タップ領域・余白を最適化しました。',
      '体組成 ＆ 筋肥大限界画面（サマリー・ポテンシャル・Navy/Casey計算・記録/取込モーダル）および各ライフログ画面のデザイン統一とモーダル操作性を改善しました。',
    ],
    en: [
      'Updated History (Workouts, Exercises, Charts, Lifelog) and AI Coach screens to follow Dark / Pure Black themes with improved tap targets and spacing.',
      'Unified styling, modal backdrop dismissal, and readability across the Body Composition & Limit calculators, modals, and Lifelog screens.',
    ],
  },
};
