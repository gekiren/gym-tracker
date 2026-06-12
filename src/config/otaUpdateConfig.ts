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
  version: '1.0.41', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ベーシックプランにおけるカスタム種目の登録上限を20個に変更しました。'
    ],
    en: [
      'Changed the custom exercise registration limit for the basic plan to 20.'
    ]
  }
};
