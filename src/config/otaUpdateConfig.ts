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
  version: '2.2.19',
  title: {
    ja: '🏃 トレッドミルの傾斜操作性向上',
    en: '🏃 Treadmill Incline Usability Improvements',
  },
  notes: {
    ja: [
      'トレッドミルの傾斜スワイプ調整を1%刻みに変更し、より素早く直感的に傾斜を設定できるようにしました。',
      '速度・傾斜・走行時間が未入力の場合に、前回のワークアウトの設定値を自動参照・補完して記録できるように改善しました。',
    ],
    en: [
      'Updated treadmill incline swipe adjustment to 1% increments for faster and more intuitive control.',
      'Improved treadmill set logging to automatically inherit and retain speed, incline, and duration from your previous workout when left empty.',
    ],
  },
};
