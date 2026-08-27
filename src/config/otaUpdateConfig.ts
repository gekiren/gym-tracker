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
  version: '2.0.27',
  title: {
    ja: '📊 ワークアウトPR比率の算出精度向上（種目別PR比・自重対応）',
    en: '📊 Improved Workout PR Ratio Calculation (Exercise PR & Bodyweight Support)',
  },
  notes: {
    ja: [
      'ワークアウト全体のPR比率を、含まれる種目ごとの最大PR比（ウェイト種目は推定1RM比、自重種目は最大レップ比）の平均値で計算するように刷新しました。',
      '高重量低レップの種目や懸垂などの自重種目が含まれるトレーニングでも、実際の負荷・パフォーマンス実感に即した正確なPR達成率が表示されます。',
    ],
    en: [
      'Refined the workout PR ratio calculation to average the max PR ratios of each exercise (estimated 1RM for weighted exercises, max reps for bodyweight exercises).',
      'Ensures accurate and realistic PR progress tracking even during heavy low-rep sessions or bodyweight exercises like pull-ups.',
    ],
  },
};
