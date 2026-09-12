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
  version: '2.2.0',
  title: {
    ja: '⏱️ トレッドミルタイマー操作の修正',
    en: '⏱️ Treadmill Timer Controls Fix',
  },
  notes: {
    ja: [
      'トレッドミル種目の時間設定および再生・リセットボタンのタップ反応を修正しました。',
      '表示欄・タイマー・記録ボタンのレイアウトを最適化しました。',
    ],
    en: [
      'Fixed touch response for treadmill time and timer play/reset controls.',
      'Optimized layout and column alignment for cardio exercises.',
    ],
  },
};
