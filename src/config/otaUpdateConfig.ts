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
  version: '1.8.42',
  title: {
    ja: 'データベースバックアップ作成・エクスポート機能の不具合修正',
    en: 'Fix database backup creation and export issue',
  },
  notes: {
    ja: [
      '🐛 デベロッパーメニューおよび設定画面からの「バックアップファイルの保存」実行時にエラーが発生する問題を解消しました。',
      '⚡ SQLite WALチェックポイント処理と端末共有（Share）処理の堅牢化を行い、スムーズに保存・共有できるように改善しました。',
    ],
    en: [
      '🐛 Fixed an issue where creating or exporting database backup files would fail with an error.',
      '⚡ Hardened SQLite WAL checkpoints and sharing mechanisms for smoother backup exports.',
    ],
  },
};
