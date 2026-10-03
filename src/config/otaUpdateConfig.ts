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
  version: '2.3.6',
  title: {
    ja: '🛡️ データベース整合性自動修復＆バックアップ保護機能の強化',
    en: '🛡️ Database Auto-Repair, Table Rescue & Backup Protection',
  },
  notes: {
    ja: [
      'SQLiteインデックス破損の自動再構築（REINDEX）およびテーブル別データ救出再構築エンジンを搭載しました。',
      '破損DBによるバックアップ上書き汚染を防止するセーフティガードを追加しました。',
      '健全な過去バックアップの自動探索復元および多段階自己修復により、データの保全性と安定性を大幅に向上させました。',
    ],
    en: [
      'Implemented automatic SQLite index rebuilding (REINDEX) and table-by-table data rescue engine.',
      'Added safety guards to prevent corrupted databases from overwriting valid backups.',
      'Enhanced database integrity with multi-stage self-healing and automatic healthy backup recovery.',
    ],
  },
};
