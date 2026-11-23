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
  version: '2.3.70',
  title: {
    ja: '📅 24時間管理：前週同曜日コピー追加 ＆ ピース編集・ドラッグ操作を修正',
    en: '📅 24h Management: Copy Previous Week Schedule & Fix Piece Drag/Tap',
  },
  notes: {
    ja: [
      '前週の同じ曜日の予定や実績をワンタップ（一括／個別選択）で今日の予定に追加できる「前週コピー」機能を追加しました。',
      'タイムラインに配置したピースをタップした際の編集画面表示と、ドラッグでの移動操作がキャンセルされずスムーズに動作するよう修正しました。',
    ],
    en: [
      "Added a Previous Week Copy feature to quickly add last week's same-day plans or actual logs into today's schedule (all at once or item by item).",
      'Fixed timeline pieces so tapping reliably opens the edit sheet and dragging moves pieces smoothly without losing selection.',
    ],
  },
};
