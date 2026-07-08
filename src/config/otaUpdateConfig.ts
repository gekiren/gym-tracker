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
  version: '1.1.23', // OTA識別用のバージョン文字列
  title: {
    ja: '水分・カフェインの二重円グラフ表示',
    en: 'Dual Progress Chart for Water & Caffeine',
  },
  notes: {
    ja: [
      '水分補給画面の進捗円グラフを二重化しました（外側：水分、内側：カフェイン）。',
      '水分目標とカフェイン上限の進捗率を視覚的に同時に確認できるようになりました。',
    ],
    en: [
      'Introduced dual progress rings in the hydration screen (Outer: Water, Inner: Caffeine).',
      'Allows you to visually track progress for both water goal and caffeine limit at the same time.',
    ]
  }
};
