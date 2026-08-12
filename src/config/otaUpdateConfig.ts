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
  version: '1.8.5',
  title: {
    ja: 'RPEスワイプ入力の上限定義',
    en: 'RPE Swipe Input Upper Limit',
  },
  notes: {
    ja: [
      '✨ RPE（運動自覚度）のスワイプ入力において、数値が10を超えないよう上限制限（最大10）を設定しました。',
    ],
    en: [
      '✨ Added upper limit constraint (max 10) for RPE swipe input.',
    ],
  },
};

