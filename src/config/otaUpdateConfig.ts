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
  version: '2.0.18',
  title: {
    ja: '📈 推移グラフの目標破線ライン描画＆期間移動を修正',
    en: '📈 Fix Target Dashed Line & Navigation in Trend Chart',
  },
  notes: {
    ja: [
      '推移グラフ内の目標破線ラインが確実に表示されるよう配置を修正し、過去の週への遡り・移動ができるよう改善しました。',
    ],
    en: [
      'Fixed the target dashed line rendering in the trend chart and improved historical week navigation.',
    ],
  },
};
