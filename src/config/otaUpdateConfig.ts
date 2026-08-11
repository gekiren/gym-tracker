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
  version: '1.6.4',
  title: {
    ja: 'ダッシュボード機能タイトルの余白バランス統一',
    en: 'Harmonize Dashboard Card Title Spacing',
  },
  notes: {
    ja: [
      '📐 機能タイトルの余白調整: ワークアウト・水分・栄養・時間管理のタイトル下余白をスリム化し、ルーティン管理等の最適な余白感へ統一バランス化',
    ],
    en: [
      '📐 Spacing Polish: Streamlined bottom margin of card titles (Workout, Water, Nutrition, 24h) to match the balanced feel of Routines',
    ],
  },
};
