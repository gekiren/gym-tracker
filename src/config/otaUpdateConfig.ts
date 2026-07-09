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
  version: '1.1.30', // OTA識別用のバージョン文字列
  title: {
    ja: '新機能追加のお知らせ',
    en: 'New Feature Update',
  },
  notes: {
    ja: [
      '24時間管理に「連続記録モード」を追加しました。',
      '連続記録モードがONの際、自動で前回の終了時間が次の開始時間になります。（その日の最初の記録は現在時刻がデフォルトになります）',
    ],
    en: [
      'Added "Continuous Recording Mode" to the 24-hour activity manager.',
      'When enabled, the start time is automatically populated with the previous log\'s end time (defaulting to current time for the first log of the day).',
    ]
  }
};
