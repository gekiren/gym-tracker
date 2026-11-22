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
  version: '2.3.55',
  title: {
    ja: '⚡ 種目詳細画面の読み込みを高速化',
    en: '⚡ Faster Exercise Details Loading',
  },
  notes: {
    ja: [
      '履歴データが多い種目でも種目詳細画面を素早く開けるよう、ページネーション読み込み・段階的表示・メモリキャッシュを導入しました。',
      'グラフや履歴カレンダーの集計処理を最適化し、操作時の負荷を軽減しました。',
    ],
    en: [
      'Added paginated loading, staged rendering, and in-memory caching so Exercise Details opens quickly even with extensive history.',
      'Optimized chart and calendar aggregations to reduce overhead during navigation.',
    ],
  },
};
