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
  version: '2.3.64',
  title: {
    ja: '🛡️ データ保護の強化と端末内バックアップ復元',
    en: '🛡️ Stronger data protection and on-device backup restore',
  },
  notes: {
    ja: [
      'アップデート直後にデータが初期化される問題への対策として、DBへの一時的なアクセスエラー時にデータを削除・初期化しないように修正しました。',
      '設定 ＞ バックアップに「端末内の自動バックアップ」を追加しました。保存日時・記録件数を確認して、ワンタップで復元できます。',
      '記録が空の状態で、既存の自動バックアップを上書きしないようにしました。',
    ],
    en: [
      'Fixed a case where the database could be wiped after an update: transient database access errors no longer delete or reinitialize your data.',
      'Added "On-device automatic backups" under Settings > Backup. Review each backup\'s date and record counts and restore with one tap.',
      'Existing automatic backups are no longer overwritten while the database has no records.',
    ],
  },
};
