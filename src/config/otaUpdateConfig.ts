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
  version: '2.1.6',
  title: {
    ja: '🛠️ ワークアウトセット入力のスワイプ操作の改善',
    en: '🛠️ Improved Workout Set Swipe-to-Adjust Interaction',
  },
  notes: {
    ja: [
      'ワークアウト中の数値スワイプ入力（重量・回数・RPE）の動作を改善しました。',
      'キーボードを閉じた後もスムーズにスワイプ操作できるよう連動を最適化しました。',
      '行スワイプ削除との干渉防止およびスワイプ感度の向上を行いました。',
    ],
    en: [
      'Improved swipe-to-adjust behavior for workout sets (weight, reps, RPE).',
      'Optimized keyboard dismissal sync for smooth swipe interaction.',
      'Resolved gesture conflict with row swipe deletion and improved swipe sensitivity.',
    ],
  },
};
