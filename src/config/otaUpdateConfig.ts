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
  version: '1.1.48', // OTA識別用のバージョン文字列
  title: {
    ja: '習慣カウンターの表示・操作改善',
    en: 'Improved Habit Counter layout & touch handling',
  },
  notes: {
    ja: [
      '習慣カウンターで登録数が増えた場合に、画面スクロールできるように配置を改善しました。',
      'スクロール中の誤タップや誤った長押し判定を防ぐよう、タッチイベントを改善しました。',
    ],
    en: [
      'Added vertical scrolling to the Habit Counter when there are many habits.',
      'Improved touch handling to prevent accidental increments or edits while scrolling.',
    ]
  }
};
