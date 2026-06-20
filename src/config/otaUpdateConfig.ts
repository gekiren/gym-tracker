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
    ja: '英語ローカリゼーションおよび日付フォーマット修正',
    en: 'Localization and Date Formatting Fixes',
  },
  notes: {
    ja: [
      '英語設定時に、ワークアウト画面のプランクや自重種目で「加重」「秒数」「計測」「自重」「秒」が日本語で表示される問題を修正しました。',
      '英語設定時の日付表示フォーマットを英語圏向けの形式にローカライズしました。',
    ],
    en: [
      'Fixed an issue where "Weighted", "Seconds", "Timer", "Bodyweight", and "s" were shown in Japanese for plank and bodyweight exercises on the active workout screen when the language is set to English.',
      'Localized date formatting to match English conventions when the language is set to English.',
    ]
  }
};
