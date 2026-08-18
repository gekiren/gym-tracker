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
  version: '1.8.73',
  title: {
    ja: '時間設定モーダルの操作性向上',
    en: 'Enhanced Time Picker with AM/PM & Digit Wheels',
  },
  notes: {
    ja: [
      '食事時間設定モーダルにおいて、AM/PMのボタン切替と、時・分の十の位・一の位を独立してスワイプできるドラムロールホイールに改善しました。',
    ],
    en: [
      'Added AM/PM toggle buttons and independent wheels for hours, minute tens, and minute ones in the meal time picker modal.',
    ],
  },
};
