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
  version: '1.8.72',
  title: {
    ja: '食事時間選択モーダルの追加',
    en: 'Dedicated Meal Time Picker Modal',
  },
  notes: {
    ja: [
      '食事時間の数字をタップすると専用の時間設定モーダルが開き、大きなドラムロールで上下にスワイプ・スクロールしてスムーズに時間を設定できるよう改善しました。',
    ],
    en: [
      'Tapping the meal time now opens a dedicated time picker modal with large scroll wheels for effortless time adjustment.',
    ],
  },
};
