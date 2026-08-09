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
  version: '1.2.2', // OTA識別用のバージョン文字列
  title: {
    ja: '全データ初期化時のライフログ削除修正',
    en: 'Fix Lifelog Reset in Data Management',
  },
  notes: {
    ja: [
      '「データ管理 → 全データ初期化」実行時にライフログデータ（水分・習慣・時間）が削除されない不具合を修正',
      '初期化実行後にライフログのメモリキャッシュが正しくクリアされるように改善',
    ],
    en: [
      'Fixed an issue where lifelog data (water, habits, time) was not deleted during full data reset',
      'Improved in-memory lifelog cache resetting after clearing data',
    ],
  },
};




