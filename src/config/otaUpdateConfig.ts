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
  version: '1.8.42',
  title: {
    ja: '習慣タップ時の全数値一瞬変化・チラつきの完全修正',
    en: 'Fix habit count flickering and momentary data alteration on tap',
  },
  notes: {
    ja: [
      '🐛 習慣カウンターをタップした際、すべての習慣の数値が一瞬変化したり0になるチラつき現象を完全解消しました。',
      '⚡ React Native と WebView 間のログ注入タイミングおよび状態同期を最適化しました。',
    ],
    en: [
      '🐛 Completely fixed flickering where all habit counts briefly shifted or reset to 0 on tap.',
      '⚡ Optimized log injection and state sync between React Native and WebView.',
    ],
  },
};
