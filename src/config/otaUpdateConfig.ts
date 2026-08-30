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
  version: '2.1.2',
  title: {
    ja: '⚡ 種目詳細画面の読み込み・表示速度を大幅改善',
    en: '⚡ Major performance improvements for exercise details',
  },
  notes: {
    ja: [
      'データ量が多い種目でも、種目詳細画面への遷移が瞬時に開くように高速化しました。',
      'データベースの最適化（インデックス追加・並行読み込み）および段階的表示により、スムーズな操作性を実現しました。',
    ],
    en: [
      'Significantly optimized loading and navigation speed for exercise detail screens with large histories.',
      'Enhanced database indexing, parallel fetching, and progressive rendering for a smoother experience.',
    ],
  },
};
