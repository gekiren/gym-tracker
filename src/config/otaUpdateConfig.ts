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
  version: '2.0.22',
  title: {
    ja: '⏱ 24時間管理の予定作成 ＆ 予実比較機能の追加',
    en: '⏱ 24h Schedule Planning & Plan vs Actual Comparison',
  },
  notes: {
    ja: [
      '24時間管理に「予定を作成」モードを追加し、1日のスケジュールを事前に計画できるようになりました。',
      '外周（予定）と内周（実績）の二重タイムライン円グラフや、活動別の予実差異テーブルにより、予定通り過ごせたか・時間の長短を直感的に振り返り、時間の習慣化を図ることができます。',
      'テンプレートからの予定/実績読み込みや、予定から実績へのワンタップ反映、予実サマリーを含むMarkdown出力にも対応しました。',
    ],
    en: [
      'Added a "Plan Creation" mode to 24-Hour Management, allowing you to schedule your day in advance.',
      'Reflect and build time habits with dual-ring 24h timeline charts and plan vs actual comparison tables showing time differences per category.',
      'Supports template import for plans/actuals, one-tap copy from plans to actuals, and comprehensive Markdown export.',
    ],
  },
};
