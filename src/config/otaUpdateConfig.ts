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
  version: '2.3.78',
  title: {
    ja: '🏋️ 新機能：実効1RM ＆ ウォームアップセット設定',
    en: '🏋️ New: Effective 1RM & Warm-up Sets',
  },
  notes: {
    ja: [
      '設定から有効化できる「ウォームアップセット機能」を追加しました（過去最大1RM比での自動判定、未完了セット番号の長押し切替、ボリューム・PR・グラフからの除外に対応）。',
      '設定から有効化できる新指標「実効1RM」を追加しました（ワークアウト中の完了／予定実効1RM表示、種目詳細グラフでの最大重量別フィルターに対応）。',
    ],
    en: [
      'Added optional "Warm-up Sets" in Settings (auto-detection by % of max 1RM, long-press incomplete set numbers to toggle, excluded from volume/PR/charts).',
      'Added optional "Effective 1RM" metric in Settings (live completed/planned Effective 1RM during workouts and max-weight filtering in exercise charts).',
    ],
  },
};
