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
  version: '1.1.31', // OTA識別用のバージョン文字列
  title: {
    ja: '新機能追加のお知らせ',
    en: 'New Feature Update',
  },
  notes: {
    ja: [
      '24時間管理の活動タグを個別にスマートに追加・削除できるようになりました。',
      '活動ログに「メモ（詳細）」を入力できる機能を追加しました。活動はタグとして機能し、メモに短いテキストで詳細を残せます。',
    ],
    en: [
      'Improved 24-hour activity tag management with inline add and delete functions.',
      'Added a "Memo" field to activity logs, allowing you to save short detailed descriptions under tags.',
    ]
  }
};
