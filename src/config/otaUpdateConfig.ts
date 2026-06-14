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
  version: '1.0.42', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト終了画面で、AIコーチによるオリジナルの評価コメントを聞く機能を追加しました。'
    ],
    en: [
      'Added a feature to get personalized feedback from the AI Coach on the workout completion screen.'
    ]
  }
};
