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
  version: '1.8.87',
  title: {
    ja: '🎯 限界到達度ゲージの縮尺改善 ＆ MSスコア評価基準のFFMI連動・最適化',
    en: '🎯 Potential Gauge Scale Refinement & FFMI-Aligned Macho Score Tiers',
  },
  notes: {
    ja: [
      '骨格筋限界ゲージの縮尺を0〜100%基準に統一し、進捗バーと95%目標マーカーの視覚的一致を改善しました。',
      'マッチョ評価スコア（MS）の評価目安をFFMI基準（筋肉量水準）と厳密に連動させ、実態に即した評価区分（20.0: 細マッチョ/引き締まり、21.5+: 筋肉質、23.0+: 本格マッチョ）へ見直しました。',
    ],
    en: [
      'Standardized the muscle potential gauge to an absolute 0-100% scale for precise visual alignment with the 95% target marker.',
      'Aligned Macho Score evaluation tiers directly with official FFMI muscle mass benchmarks (20.0: Lean/Fit, 21.5+: Muscular, 23.0+: Athletic Macho).',
    ],
  },
};
