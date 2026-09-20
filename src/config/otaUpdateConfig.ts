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
  version: '2.2.18',
  title: {
    ja: '🏃 トレッドミルの操作性向上＆前回設定引き継ぎ',
    en: '🏃 Treadmill Usability Improvements & Setting Retention',
  },
  notes: {
    ja: [
      'トレッドミルの速度スワイプ調整を0.1km/h刻みに変更し、より細かな速度設定ができるようになりました。',
      '速度・傾斜・走行時間が未入力の場合に、前回のワークアウトの設定値を自動参照・補完して記録できるように改善しました。',
    ],
    en: [
      'Updated treadmill speed swipe adjustment to 0.1 km/h increments for more precise speed control.',
      'Improved treadmill set logging to automatically inherit and retain speed, incline, and duration from your previous workout when left empty.',
    ],
  },
};
