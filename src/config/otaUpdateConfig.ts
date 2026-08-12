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
  version: '1.8.16',
  title: {
    ja: '水分補給履歴グラフのデザイン統一',
    en: 'Water History Chart Design Update',
  },
  notes: {
    ja: [
      '💧 水分補給の履歴グラフを筋トレ履歴グラフと同様の美しいSVGグラデーションエリアチャート＆サマリーカードデザインに統一しました。',
    ],
    en: [
      '💧 Updated the Water history chart to match the workout history SVG gradient area chart and summary card design.',
    ],
  },
};

