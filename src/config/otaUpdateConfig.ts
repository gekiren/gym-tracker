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
  version: '1.1.27', // OTA識別用のバージョン文字列
  title: {
    ja: '24時間管理画面の日付表示不具合の修正',
    en: 'Fix Date Display in 24-Hour Manager',
  },
  notes: {
    ja: [
      '24時間管理画面を開いた際に日付が空欄になってしまう不具合を修正しました。',
      'ダッシュボード上のクイック追加ボタンを水分補給のカスタムプリセット（最大6個）と同期し、カフェイン量を正しく記録できるようにしました。',
    ],
    en: [
      'Fixed an issue where the date was blank when opening the 24-hour manager screen.',
      'Synchronized dashboard quick add buttons with custom presets (up to 6) and fixed caffeine recording.',
    ]
  }
};
