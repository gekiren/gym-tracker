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
  version: '1.7.5',
  title: {
    ja: '履歴グラフの分析指標の追加',
    en: 'Expanded History Chart Metrics',
  },
  notes: {
    ja: [
      '✨ グラフ指標の選択肢追加: ボリューム・カロリーに加え、「セット数」「1セット平均負荷」「トレーニング密度」をリストから選択可能にしました。',
      '⚡ 1セット平均負荷: 1セットあたり平均して何kg扱えたかを可視化（セットの質・強度をアピール）。',
      '⏱️ トレーニング密度: 1分間にどれだけの重量を動かしたかを可視化（時間効率・密度をアピール）。',
    ],
    en: [
      '✨ Expanded Chart Metrics: Select between Volume, Calories, Total Sets, Volume per Set, and Training Density.',
      '⚡ Volume per Set: Track average weight lifted per set to evaluate workout intensity and quality.',
      '⏱️ Training Density: Track weight moved per minute to evaluate workout time efficiency.',
    ],
  },
};
