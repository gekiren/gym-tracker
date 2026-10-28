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
  version: '2.3.25',
  title: {
    ja: '📊 グラフ指標の選択保持 ＆ 種目履歴での推定1RM表示',
    en: '📊 Graph Metric Persistence & 1RM Display in History',
  },
  notes: {
    ja: [
      '種目詳細および全体履歴のグラフにおいて、最後に選択した指標（推定1RMやセット数など）が次回以降も自動で初期表示されるようになりました。',
      '種目詳細の「過去の履歴」テーブル各セットに、推定1RM（最大挙上可能重量）が表示されるようになりました（設定で非表示にすることも可能）。',
    ],
    en: [
      'The last selected chart metric (e.g. Estimated 1RM, Sets) in exercise detail and history is now remembered and shown by default.',
      'Estimated 1RM is now displayed for each set in the exercise history table (can be toggled in settings).',
    ],
  },
};

