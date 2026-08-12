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
  version: '1.7.6',
  title: {
    ja: '履歴グラフUIの微調整',
    en: 'History Chart UI Polish',
  },
  notes: {
    ja: [
      '🎨 履歴グラフの指標選択画面の表示デザインを微調整しました。',
    ],
    en: [
      '🎨 Polished the metric selection UI in the history chart.',
    ],
  },
};
