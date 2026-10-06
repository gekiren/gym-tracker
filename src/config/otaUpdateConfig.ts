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
  version: '2.3.19',
  title: {
    ja: '📅 24時間管理：カレンダー連携予定の表示最適化',
    en: '📅 24h Management: Optimized Calendar Plan Display',
  },
  notes: {
    ja: [
      'カレンダー連携の会議招待やアジェンダ等の長文予定をスマートに抽出し、予定カード内をコンパクトに自動折りたたみ（最大2行）表示するように改善しました。',
      '「▼ もっと見る」タップでアジェンダや会議IDなどの全文をいつでも展開・確認できます。また、操作ボタン（実績コピー・編集・削除）が押し潰される問題を解消しました。',
    ],
    en: [
      'Optimized calendar-synced plans with long meeting invites/agendas by collapsing them neatly into 2 lines with a tap-to-expand toggle.',
      'Fixed layout issues preventing action buttons (Copy to Actual, Edit, Delete) from being compressed by long text.',
    ],
  },
};

