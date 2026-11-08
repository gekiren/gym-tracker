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
  version: '2.3.28',
  title: {
    ja: '✨ セット入力行の1行集約レイアウト最適化',
    en: '✨ Optimize Set Row Single-Line Compact Layout',
  },
  notes: {
    ja: [
      'セット番号の余白削減および重量・回数・RPEの入力窓をスリム化し、スタンスや1RM、トロフィー表示を1行に集約しました。',
      '縦のスクロール量を大幅に削減し、複数セットの入力が一覧しやすくなりました。',
    ],
    en: [
      'Optimized set rows into a single compact line by slimming weight, reps, and RPE input boxes and embedding stance, 1RM, and trophy inline.',
      'Significantly reduced vertical scrolling, making multiple sets easier to review at a glance.',
    ],
  },
};
