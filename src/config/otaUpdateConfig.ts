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
  version: '1.1.36', // OTA識別用のバージョン文字列
  title: {
    ja: '機能追加・改善のお知らせ',
    en: 'Feature Improvements Update',
  },
  notes: {
    ja: [
      '24時間管理で「開始時間」または「終了時間」のいずれか片方のみでも活動を記録できるようになりました。',
      '活動タグを選択（設定）しなくてもログを登録できるようになりました（未設定として登録されます）。',
      '活動ログに「メモ（詳細）」を入力した際に、新規作成や通常更新でメモが保存されない不具合を修正しました。',
    ],
    en: [
      'You can now save activity logs with only one of either the start time or the end time.',
      'Logs can now be saved without selecting any activity tag (saved as undefined/blank).',
      'Fixed an issue where detailed memo descriptions were not being saved on initial creation or normal updates.',
    ]
  }
};
