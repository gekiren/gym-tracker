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
  version: '1.0.34', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '種目選択画面で一番下の種目がスクロールした際にタップしやすくなるよう、リスト下部に余白を追加しました。'
    ],
    en: [
      'Added bottom spacing to the exercise list in the selection screen to improve tap target accessibility.'
    ]
  }
};
