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
  version: '2.2.11',
  title: {
    ja: '📊 自己ベスト（PR）一覧の4列グリッド最適化',
    en: '📊 4-Column Grid Optimization for Personal Records',
  },
  notes: {
    ja: [
      '種目詳細画面の自己ベスト（PR）一覧を均等な4列グリッド表示に最適化しました。',
      '端末の画面幅に関わらず常に4列で揃うようレイアウト方式を刷新しました。',
    ],
    en: [
      'Optimized the Personal Records (PR) list on the exercise detail screen into a balanced 4-column grid.',
      'Refactored the layout structure to guarantee 4 columns across all device screen widths.',
    ],
  },
};
