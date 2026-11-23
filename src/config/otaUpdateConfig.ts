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
  version: '2.3.73',
  title: {
    ja: '⚡ 24時間管理：ピース重複時の同時進行自動計上（50%）＆表示改善',
    en: '⚡ 24h Management: Auto 50% Simultaneous Overlap Counting & UI Fix',
  },
  notes: {
    ja: [
      'タイムライン上でピースの時間が重なった際、重なった区間を自動的に同時進行（標準50%）として集計・並列表示するようにしました（予定で50%でも実績で重なっていなければ自動で100%として計上されます）。',
      'デフォルトスケジュール編集画面のヘッダー文字が見切れる問題を修正しました。',
    ],
    en: [
      'Overlapping timeline pieces are now displayed side-by-side and automatically counted as simultaneous activities (50% by default for 2 overlapping pieces, and 100% in actual logs if no longer overlapping).',
      'Fixed header text truncation in the default schedule timeline editor.',
    ],
  },
};
