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
  version: '1.1.28', // OTA識別用のバージョン文字列
  title: {
    ja: '24時間管理の記録機能の改善',
    en: 'Improvements to 24-Hour Manager',
  },
  notes: {
    ja: [
      '24時間管理において、活動内容（活動名）を入力せずに時間のみで記録できるようになりました。',
      '活動名が空欄で記録された場合、詳細ログや集計に「(未設定)」として表示されます。',
    ],
    en: [
      'You can now record logs with only a time range, leaving the activity name blank in the 24-hour manager.',
      'Blank activity names will be displayed as "(Not Set)" in logs and summaries.',
    ]
  }
};
