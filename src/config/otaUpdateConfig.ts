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
  version: '2.3.33',
  title: {
    ja: '✨ ダッシュボードのデザイン統一と操作性の改善',
    en: '✨ Unified Dashboard Design & Improved Usability',
  },
  notes: {
    ja: [
      'ダッシュボードの全カードのデザイン・余白・文字サイズを統一し、背景テーマ（ダーク／ピュアブラック）の切り替えにも即時反映されるよう改善しました。',
      '習慣カウンターの「+」ボタンや水分プリセット、日付切替ボタンなどのタップ領域を広げ、より操作しやすく調整しました。',
    ],
    en: [
      'Unified card layout, spacing, and typography across the dashboard with instant dark/pure-black theme updates.',
      'Expanded touch targets for habit "+" buttons, hydration presets, and date navigation controls for easier tapping.',
    ],
  },
};
