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
  version: '2.2.5',
  title: {
    ja: '🚑 9月13日データの完全復元パッチ',
    en: '🚑 Full Recovery Patch for Sep 13 Data',
  },
  notes: {
    ja: [
      '9月13日のワークアウト（4種目・11セット）および食事記録（2件・501kcal）を完全復元しました。',
      'カレンダー表示および記録マップを正常に同期しました。',
    ],
    en: [
      'Fully restored September 13th workouts (4 exercises, 11 sets) and meal logs (2 items, 501 kcal).',
      'Synchronized calendar markers and daily record map.',
    ],
  },
};
