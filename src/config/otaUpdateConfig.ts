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
  version: '1.0.91', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'プロフィール画面のコード整理とパフォーマンスの改善',
      'クラッシュレポート（Sentry）設定の最適化'
    ],
    en: [
      'Refactored the profile screen code and improved performance.',
      'Optimized crash reporting (Sentry) configuration.'
    ]
  }
};
