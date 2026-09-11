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
  version: '2.1.17',
  title: {
    ja: '⚡ 写真解析のタイムアウト延長・通信安定化',
    en: '⚡ Nutrition Vision Timeout Extension & Stability',
  },
  notes: {
    ja: [
      '画像栄養解析時のタイムアウト時間を延長し、大容量の写真でも途中で途切れず確実に解析できるよう改善しました。',
      'AIプロキシサーバーのモデル自動切替を強化し、安定した無料枠モデル（500回/日）を最優先に活用します。',
    ],
    en: [
      'Extended client and server timeouts for image nutrition analysis, preventing interrupted requests on large images.',
      'Enhanced AI proxy fallback chain, prioritizing high-quota free-tier models (500 requests/day).',
    ],
  },
};
