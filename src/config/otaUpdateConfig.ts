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
  version: '1.8.0',
  title: {
    ja: '種目別グラフの機能拡張と指標選択の統一',
    en: 'Exercise Chart Metrics & Selector Update',
  },
  notes: {
    ja: [
      '📊 種目別グラフにセット数、1セット平均負荷、トレーニング密度の指標を追加しました。',
      '📋 リストから表示したいグラフ指標を簡単に選択・切り替えられるようになりました。',
    ],
    en: [
      '📊 Added Sets, Volume per Set, and Training Density metrics to exercise detail charts.',
      '📋 Easily switch chart metrics from the dropdown list selector.',
    ],
  },
};

