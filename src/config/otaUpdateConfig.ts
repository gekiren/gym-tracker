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
  version: '1.7.7',
  title: {
    ja: '履歴グラフ表示範囲の最適化',
    en: 'History Chart Range Optimization',
  },
  notes: {
    ja: [
      '📊 履歴グラフの初期表示範囲を拡大し、1画面で直近7回分（1週間分）のデータが見やすく表示されるよう調整しました。',
    ],
    en: [
      '📊 Expanded initial display range of history charts to comfortably show 7 recent entries (1 week) at once.',
    ],
  },
};
