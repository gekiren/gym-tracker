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
  version: '1.1.87', // OTA識別用のバージョン文字列
  title: {
    ja: 'データベース処理およびアプリ安定性の向上',
    en: 'Database & App Stability Improvements',
  },
  notes: {
    ja: [
      'データベース構造の分離・モジュール化を行い、アプリの動作安定性を向上させました。',
      'データ読み込み時の処理を最適化し、フリーズを防止しました。',
    ],
    en: [
      'Refactored database layer for improved application stability.',
      'Optimized data loading mechanisms to ensure smooth operation.',
    ]
  }
};




