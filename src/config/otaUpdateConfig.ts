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
  version: '2.3.72',
  title: {
    ja: '📊 24時間管理：サークル・集計のデザイン統一＆2タブ化',
    en: '📊 24h Management: Unified Circle Summary Design & 2-Tab Layout',
  },
  notes: {
    ja: [
      '画面上部を「🧩 タイムライン」と「📊 サークル・集計」の2タブにシンプル化し、タイムラインから未反映の予定を一括反映できるようにしました。',
      '24時間サークルおよび予実比較リストの配色・アイコン・ポートフォリオ表示をタイムラインのデザインと統一しました。',
    ],
    en: [
      'Simplified the top navigation into two tabs (Timeline and Circle Summary) and added a batch plan-to-actual reflection button on the timeline.',
      'Unified the 24-hour dual-ring circle chart and comparison cards with the timeline\'s category colors, piece icons, and portfolio layout.',
    ],
  },
};
