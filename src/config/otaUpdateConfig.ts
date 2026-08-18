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
  version: '1.8.78',
  title: {
    ja: 'カロリー推移グラフの表示修正',
    en: 'Calorie History Chart Display Fix',
  },
  notes: {
    ja: [
      '直近14日間のカロリー推移グラフにおいて、目標ラインとバーの描画位置がずれていた不具合を修正しました。',
    ],
    en: [
      'Fixed an issue where the target line and bar positions were misaligned in the 14-day calorie history chart.',
    ],
  },
};
