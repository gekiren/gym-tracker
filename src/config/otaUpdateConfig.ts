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
  version: '1.6.0',
  title: {
    ja: 'ステージング限定詳細デバッグログ ＆ DB計測機能の追加',
    en: 'Add Staging-Only Detailed Debug Logging & DB Diagnostics',
  },
  notes: {
    ja: [
      '🔍 ステージングデバッグ機能搭載: DB内のワークアウト数・セット数・直近履歴を可視化するステージング限定デバッグオーバーレイ ＆ ログ機能を追加',
    ],
    en: [
      '🔍 Add Staging Debugging: Integrated staging-only debug overlay & log outputs to monitor DB counts, sets & recent workout logs',
    ],
  },
};
