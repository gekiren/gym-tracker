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
  version: '2.1.13',
  title: {
    ja: '🎉 ワークアウト数値スワイプ入力の完全復旧',
    en: '🎉 Core Fix for Workout Input Swipe Adjustments',
  },
  notes: {
    ja: [
      '行コンテナによるタッチ強制キャンセルを解消し、指をなぞるスワイプ操作での重量・回数変更が確実に動作するよう改修しました。',
      'Enterキー（→|）による入力欄のスムーズな自動移動と連動しました。',
    ],
    en: [
      'Eliminated row touch interception to reliably restore swipe-to-adjust for weight and reps.',
      'Fully synchronized with seamless Enter (Next) key navigation.',
    ],
  },
};
