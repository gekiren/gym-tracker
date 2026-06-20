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
  version: '1.1.2', // OTA識別用のバージョン文字列
  title: {
    ja: '自重種目の英語ローカリゼーション修正',
    en: 'Self-Weight Exercise Localization Fix',
  },
  notes: {
    ja: [
      '英語設定時に、ワークアウト画面のプランクや自重種目で「加重」「秒数」「計測」「自重」「秒」が日本語で表示される問題を修正しました。',
    ],
    en: [
      'Fixed an issue where "Weighted", "Seconds", "Timer", "Bodyweight", and "s" were shown in Japanese for plank and bodyweight exercises on the active workout screen when the language is set to English.',
    ]
  }
};
