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
  version: '2.2.10',
  title: {
    ja: '📊 自己ベスト（PR）一覧の4列グリッド最適化',
    en: '📊 4-Column Grid Optimization for Personal Records',
  },
  notes: {
    ja: [
      '種目詳細画面の自己ベスト（PR）一覧を均等な4列グリッド表示に最適化しました。',
      '画面幅に応じた動的カード幅計算と文字溢れ防止、カード高さの統一により視認性と一覧性が向上しました。',
    ],
    en: [
      'Optimized the Personal Records (PR) list on the exercise detail screen into a balanced 4-column grid.',
      'Enhanced readability and consistency with dynamic item width calculation, auto-scaling fonts, and unified card heights.',
    ],
  },
};
