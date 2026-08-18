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
  version: '1.8.86',
  title: {
    ja: '💪 体組成機能に「MF比（筋肉・脂肪比）」＆「マッチョ評価スコア（MS）」を追加',
    en: '💪 Added Muscle-to-Fat (MF) Ratio & Macho Score (MS) to Body Composition',
  },
  notes: {
    ja: [
      '脂肪1kgに対する筋肉量（筋肉の密度）を表す「MF比（筋肉・脂肪比）」の算出と評価表示を追加しました。',
      'FFMIと体脂肪率の絞りボーナスを加味した総合評価「マッチョ評価スコア（MS）」の算出と20.0突破判定を追加しました。',
      '今日の体組成カードに8枠グリッドで両指標を追加し、測定ガイドおよび推移グラフ・履歴リストにも対応しました。',
    ],
    en: [
      'Added calculation and evaluation for Muscle-to-Fat Ratio (MF Ratio), reflecting muscle density per 1kg of body fat.',
      'Added Macho Score (MS), a comprehensive rating combining FFMI with low body fat bonuses and a 20.0+ milestone indicator.',
      'Integrated both metrics into the 8-stat summary grid, measurement guide modal, and history trend charts.',
    ],
  },
};
