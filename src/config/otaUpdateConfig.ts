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
  version: '2.3.18',
  title: {
    ja: '⏱️ 24時間ピースタイムライン：予定連動 ＆ スマート実績入力',
    en: '⏱️ 24h Piece Timeline: Plan Overlay & Smart Actual Logging',
  },
  notes: {
    ja: [
      '実績タイムライン上に今日の予定を半透明で重ねて表示し、予定通りなら「⚡ 反映」を1タップするだけで実績化できるようになりました。',
      '活動編集シートに「±15分」「±5分」のクイック微調整ボタンを追加。さらにタイムライン上で直接ドラッグ・伸縮してズレた実績を即座に記録できます。',
    ],
    en: [
      'Displayed today\'s plans as semi-transparent blocks on the actual timeline. One-tap "⚡ Apply" to instantly log planned activities as actual records.',
      'Added ±15m and ±5m quick adjustment buttons in the edit sheet, and enabled direct drag/resize on the timeline to log shifted times.',
    ],
  },
};

