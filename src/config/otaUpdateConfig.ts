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
  version: '1.1.5', // OTA識別用のバージョン文字列
  title: {
    ja: 'ワークアウト再開時の通知ポップアップ非表示化',
    en: 'Hide Workout Resume Popup',
  },
  notes: {
    ja: [
      'タイマーの「ワークアウト再開」をタップした際に表示されていた、再開完了のアラートポップアップを非表示にしました。',
    ],
    en: [
      'Removed the confirmation alert popup when tapping resume workout from the timer.',
    ]
  }
};
