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
  version: '1.0.57', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '履歴タブの種目タブから行うオリジナル種目の作成ページに、片側ずつのトグルやデフォルトスタンスのトグルを追加して表示項目を統一しました。'
    ],
    en: [
      'Aligned the custom exercise creation screen in the History tab with the workout screen, adding unilateral and default stance toggles.'
    ]
  }
};
