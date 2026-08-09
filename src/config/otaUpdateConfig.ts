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
  version: '1.2.4', // OTA識別用のバージョン文字列
  title: {
    ja: '全データ初期化機能の改善',
    en: 'Database Reset Improvements',
  },
  notes: {
    ja: [
      '全データ初期化時に、ライフログ機能（習慣・水分・時間管理）のデータおよびメモリキャッシュが完全にリセットされるよう修正',
    ],
    en: [
      'Ensured lifelog records (habits, water, time) and memory caches are fully reset during full database initialization',
    ],
  },
};




