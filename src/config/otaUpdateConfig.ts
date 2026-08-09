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
  version: '1.2.6', // OTA識別用のバージョン文字列
  title: {
    ja: 'ワークアウト開始時の安全化改善',
    en: 'Workout Safety & Reset Improvements',
  },
  notes: {
    ja: [
      '進行中のワークアウトがある状態から新規開始する際の確認ダイアログ追加',
      'タイマー処理の安定化',
    ],
    en: [
      'Added confirmation dialog when starting a new workout while one is active',
      'Improved rest timer stabilization',
    ],
  },
};




