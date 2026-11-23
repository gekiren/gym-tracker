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
  version: '2.3.67',
  title: {
    ja: '🏷️ 体組成グラフの指標表示名を修正',
    en: '🏷️ Fixed body composition metric labels',
  },
  notes: {
    ja: [
      '体組成グラフの指標選択画面およびグラフタイトルで「筋肉・脂肪比 (MF比)」「マッチョスコア (MS)」が正しく表示されるように修正しました。',
    ],
    en: [
      'Fixed the metric selector and chart titles in Body Composition History to display "Muscle-Fat Ratio (MF)" and "Macho Score (MS)" properly.',
    ],
  },
};
