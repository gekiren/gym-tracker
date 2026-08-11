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
  version: '1.6.3',
  title: {
    ja: '直近ワークアウト表示の上下余白・間隔の微調整',
    en: 'Adjust Vertical Spacing in Recent Workout Summary',
  },
  notes: {
    ja: [
      '📐 余白の微調整: 直近トレーニング日テキストと部位カプセルバッジの間の縦余白をタイトに縮小し、より一体感のあるレイアウトへ改善',
    ],
    en: [
      '📐 Spacing Polish: Tightened vertical gap between last workout date label and muscle volume pill badges for a cohesive layout',
    ],
  },
};
