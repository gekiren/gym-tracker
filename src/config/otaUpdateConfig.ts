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
  version: '2.3.51',
  title: {
    ja: '📋 履歴表示：セット行のレイアウトを見やすく整理',
    en: '📋 Workout History: Cleaner Set Row Layout',
  },
  notes: {
    ja: [
      '種目別のワークアウト履歴で、RPEやスタンス・タイマーを記録した際も最大2行にすっきり収まるようレイアウトを改善しました。',
    ],
    en: [
      'Improved the set row layout in exercise workout history so RPE, stance, and timer details stay cleanly aligned within two lines.',
    ],
  },
};
