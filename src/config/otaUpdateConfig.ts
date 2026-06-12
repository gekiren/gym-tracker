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
  version: '1.0.38', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '有酸素カテゴリの種目でストップウォッチで計測した時間が、記録チェック時に上書きされてしまう不具合を修正しました。'
    ],
    en: [
      'Fixed a bug where the stopwatch time for cardio exercises was overwritten when completing a set.'
    ]
  }
};
