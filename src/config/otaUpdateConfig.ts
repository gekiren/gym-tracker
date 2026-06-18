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
  version: '1.0.77', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト保存時のダブルタップ防止ガードを追加し、保存処理中の誤操作を防ぐように改善しました。',
      'セキュリティ向上と内部コードのクリーンアップを行いました。'
    ],
    en: [
      'Added double-tap prevention when saving workouts to prevent accidental operations during save.',
      'Security improvements and codebase cleanup.'
    ]
  }
};
