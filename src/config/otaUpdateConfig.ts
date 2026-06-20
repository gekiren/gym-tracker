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
  version: '1.0.93', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'バックアップ復元時のエラー（disk I/O error等）を防ぐため、処理の安定性を向上させました。',
      'バックアップファイルをエクスポートする際、ファイル名に現在日時を自動的に付与する機能を追加しました。',
      'データのバックアップ/復元画面に、クラウド使用時やファイル名に関する注意事項を追加しました。'
    ],
    en: [
      'Improved stability of backup restoration to prevent errors (such as disk I/O error).',
      'Added a feature to automatically add the current timestamp to the backup file name on export.',
      'Added notice and warnings regarding file name and cloud storage usage on the Backup/Restore screen.'
    ]
  }
};
