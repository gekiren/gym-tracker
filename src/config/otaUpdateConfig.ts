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
  version: '1.1.26', // OTA識別用のバージョン文字列
  title: {
    ja: 'ダッシュボードのクイック追加同期対応',
    en: 'Dashboard Quick Add Synchronization',
  },
  notes: {
    ja: [
      'ダッシュボード上のクイック追加ボタンを、水分補給画面で設定したカスタムプリセット（最大6個）と同期させました。',
      'ダッシュボードから追加する際にもカフェイン量が正しく記録されるようになりました。',
    ],
    en: [
      'Synchronized dashboard quick add buttons with the custom presets (up to 6) configured in the water screen.',
      'Caffeine intake is now correctly recorded when logging from the dashboard.',
    ]
  }
};
