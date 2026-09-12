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
    ja: '🏃 トレッドミル表示欄のレイアウト最適化',
    en: '🏃 Treadmill Layout Optimization',
  },
  notes: {
    ja: [
      'トレッドミル種目の表示欄・タイマー・記録ボタンのレイアウト干渉を解消しました。',
      '速度・傾斜・時間の入力欄幅を最適化し、文字やアイコンの重なりを修正しました。',
      '有酸素種目におけるスタンス表示を非表示化し、画面の視認性を向上させました。',
    ],
    en: [
      'Resolved layout overlap for treadmill time, timer controls, and complete buttons.',
      'Optimized column widths for speed, incline, and time display.',
      'Hidden stance option for cardio exercises for cleaner UI.',
    ],
  },
};
