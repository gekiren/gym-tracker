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
  version: '2.1.16',
  title: {
    ja: '📷 栄養管理の写真解析・カメラ撮影の安定化',
    en: '📷 Nutrition Vision & Camera Capture Stabilization',
  },
  notes: {
    ja: [
      '栄養管理の写真解析において、アプリ内カメラでの撮影後に分析が開始されない不具合を修正しました。',
      '撮影後の不要なトリミング操作を廃止し、シャッター直後に自動でAI栄養解析がスタートするように改善しました。',
      '撮影画像のBase64直接抽出と多重フォールバックにより、画像処理の安定性と解析速度が大幅に向上しました。',
    ],
    en: [
      'Fixed an issue in nutrition tracking where AI analysis did not trigger after taking photos with the in-app camera.',
      'Streamlined the camera workflow by removing unnecessary crop steps, automatically starting AI analysis immediately after capture.',
      'Improved image processing stability and speed with direct Base64 extraction and multi-tier fallbacks.',
    ],
  },
};
