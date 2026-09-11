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
  version: '2.1.11',
  title: {
    ja: '🛠️ ワークアウト数値入力スワイプ＆Enter移動の根本改修',
    en: '🛠️ Workout Input Swipe Adjustment & Enter Navigation Fix',
  },
  notes: {
    ja: [
      '重量(kg)入力時にEnter(→|)を押すとキーボードが閉じず、スムーズに回数入力へ移動するよう改善しました。',
      '画面全体のスクロールと入力欄のスワイプ判定を完全協調させ、キーボード非表示時でも横スワイプでの数値変更が確実に動作するよう改修しました。',
      '入力欄ジェスチャーの安定化により、タップでの編集開始とスワイプでの数値増減の応答性を大幅に向上させました。',
    ],
    en: [
      'Fixed Enter (Next) key so it smoothly navigates to reps input instead of dismissing the software keyboard.',
      'Synchronized screen scrolling with input gestures to ensure swipe-to-adjust works reliably without keyboard.',
      'Stabilized input gestures for enhanced responsiveness on tap and swipe adjustments.',
    ],
  },
};
