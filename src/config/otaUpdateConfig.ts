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
  version: '1.1.89', // OTA識別用のバージョン文字列
  title: {
    ja: '通知アクション機能およびヘルスケア連携の追加',
    en: 'Notification Actions & Health Data Integration',
  },
  notes: {
    ja: [
      'インターバル通知からスマートウォッチやロック画面で「完了」「+30秒」等の操作が直接可能になりました。',
      'Google Health Connect / Apple HealthKit と連携し、ワークアウト中の心拍数や消費カロリーの自動取得・記録に対応しました。',
    ],
    en: [
      'Added notification action buttons (Complete, +30s) directly accessible from lock screen/wearables.',
      'Integrated Google Health Connect / Apple HealthKit to record heart rate and calories burned.',
    ],
  },
};




