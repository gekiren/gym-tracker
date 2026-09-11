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
  version: '2.1.9',
  title: {
    ja: '🛠️ ワークアウト数値入力のスワイプ操作の改善',
    en: '🛠️ Improved Swipe-to-Adjust Interaction for Workout Inputs',
  },
  notes: {
    ja: [
      'ソフトウェアキーボードを開かずにスワイプ操作で回数や重量などをスムーズに変更できるよう改善しました。',
      'キーボードを閉じた直後でもスワイプ操作が確実に反応するよう連動を最適化しました。',
      '入力欄のタッチ操作時に行削除スワイプが誤動作しないよう競合を解消しました。',
    ],
    en: [
      'Improved swipe-to-adjust interaction for reps and weight without opening the software keyboard.',
      'Optimized keyboard dismissal sync so swipe adjustments respond immediately.',
      'Resolved gesture conflicts between set input adjustments and row deletion swipe.',
    ],
  },
};
