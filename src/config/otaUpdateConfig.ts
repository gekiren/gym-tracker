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
  version: '2.1.14',
  title: {
    ja: '🎉 ワークアウト数値スワイプ入力の完全復旧',
    en: '🎉 Core Fix for Workout Input Swipe Adjustments',
  },
  notes: {
    ja: [
      'キーボード非表示時に入力枠を純粋なテキスト表示に切り替え、Androidネイティブによるスワイプ中断を解消しました。',
      '指をなぞるスワイプ操作での重量・回数・RPEのリアルタイム増減が確実に動作します。',
      'Enterキー（→|）による入力欄のスムーズな自動移動も完全連動しています。',
    ],
    en: [
      'Decoupled native text input during idle state to prevent Android gesture cancellation.',
      'Swipe-to-adjust for weight, reps, and RPE is now fully operational.',
      'Seamless Enter (Next) key navigation is fully synchronized.',
    ],
  },
};
