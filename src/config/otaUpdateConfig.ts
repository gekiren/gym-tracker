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
  version: '2.3.53',
  title: {
    ja: '🩺 Health Connect 書き込み処理の安定化',
    en: '🩺 Health Connect Write Stability Fix',
  },
  notes: {
    ja: [
      'ワークアウトおよび体組成データを Health Connect へ書き込む際に、データ種別ごとに安全に分割送信するよう修正しました。',
    ],
    en: [
      'Fixed Health Connect write operations for workouts and body composition by grouping records by type before insertion.',
    ],
  },
};
