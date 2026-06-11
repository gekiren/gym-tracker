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
  version: '1.0.37', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'SNSシェア画像の生成時にワークアウト記録（挙上総重量、完了セット数など）が空になってしまう不具合を修正しました。'
    ],
    en: [
      'Fixed a bug where workout records (total volume, sets count) were missing when generating SNS share images.'
    ]
  }
};
