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
  version: '2.1.10',
  title: {
    ja: '🛠️ ワークアウト数値入力スワイプ操作の根本改善',
    en: '🛠️ Core Fix for Workout Input Swipe Adjustments',
  },
  notes: {
    ja: [
      'キーボード非表示時でも回数・重量などのスワイプ数値調整が確実に認識されるようジェスチャー優先制御を根本改修しました。',
      '入力欄のスワイプ操作が行削除スワイプに横取りされるネイティブ競合を完全に解消しました。',
      'タップによる直接編集とスワイプによる数値増減のスムーズな切り替えを最適化しました。',
    ],
    en: [
      'Resolved gesture precedence to reliably enable swipe adjustments for reps and weight when keyboard is hidden.',
      'Completely eliminated gesture interception by row deletion swipe using native gesture synchronization.',
      'Optimized seamless transition between tap editing and swipe adjustment.',
    ],
  },
};
