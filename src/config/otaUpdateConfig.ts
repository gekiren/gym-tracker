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
  version: '2.2.1',
  title: {
    ja: '⏳ トレッドミルのカウントダウンタイマー対応',
    en: '⏳ Treadmill Countdown Timer Support',
  },
  notes: {
    ja: [
      'トレッドミル種目で目標走行時間を設定し、残り時間をカウントダウンするタイマーモードに対応しました。',
      '目標時間到達時にバイブレーションで通知し、走った実績時間を正確に記録します。',
    ],
    en: [
      'Added a countdown timer mode for treadmill exercises to track remaining goal time.',
      'Vibrates upon reaching target time and accurately logs actual workout duration.',
    ],
  },
};
