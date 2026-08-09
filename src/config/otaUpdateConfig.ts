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
  version: '1.2.7', // OTA識別用のバージョン文字列
  title: {
    ja: 'アプリ設定・状態管理の最適化と軽量化',
    en: 'App Settings & State Optimization',
  },
  notes: {
    ja: [
      'workoutStore の責任分離・軽量化によるアプリ動作の安定化とメモリ使用量の削減',
      '設定およびルーティン下書き管理ストアの分離によるレスポンス向上',
    ],
    en: [
      'Optimized app memory and stability by refactoring store state management',
      'Separated settings and routine draft stores for faster performance',
    ],
  },
};
