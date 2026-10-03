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
  version: '2.3.5',
  title: {
    ja: '🧩 24時間管理 タイムライン＆フォーム統合（ボトムシート連動）',
    en: '🧩 24h Timeline & Form Integration with Bottom Sheet Drawer',
  },
  notes: {
    ja: [
      'タイムライン上のブロックをタップして、メモ追記・時間微調整・活動名変更・削除ができる編集ボトムシートを追加しました。',
      'タイムラインの空き時間をタップ、または「＋記録」ボタンから、指定時刻ですぐに開く新規記録シートを新設しました。',
      'ブロックの移動・伸縮時の誤タップ防止ガードを搭載し、タイムライン中心の快適な操作性を実現しました。',
    ],
    en: [
      'Tapping a timeline block opens a bottom sheet drawer to edit notes, time, activity tags, or delete.',
      'Tapping empty slots or the "+ Record" button opens a quick creation sheet pre-filled with that time.',
      'Added tap protection during drag/resize, delivering an intuitive timeline-first experience.',
    ],
  },
};
