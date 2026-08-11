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
  version: '1.7.1',
  title: {
    ja: '履歴グラフの洗練・高信頼化（エリアラインチャート）',
    en: 'Redesigned History Chart with PR Target Tracking',
  },
  notes: {
    ja: [
      '📈 グラフの全面刷新: 過去最高の積算負荷（PR比%）を表示する高精度なエリアラインチャートへアップグレードしました。棒グラフ特有の圧迫感をなくし、直感的に過負荷を追跡できます。',
    ],
    en: [
      '📈 History Chart Redesign: Upgraded to a sleek area line chart tracking your PR Target % with zero clutter.',
    ],
  },
};
