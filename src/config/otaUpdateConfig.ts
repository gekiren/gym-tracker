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
  version: '2.0.8',
  title: {
    ja: '🥗 写真拡大時のドラッグ移動のリアルタイム追従対応',
    en: '🥗 Real-time Drag Panning for Photo Viewer',
  },
  notes: {
    ja: [
      '写真拡大後のドラッグ（パン）移動が、指の動きに合わせて遅延なくリアルタイムに滑らかに追従するよう、ジェスチャー制御をネイティブドライバへ直結最適化しました。',
    ],
    en: [
      'Optimized drag panning during photo zoom to track finger movements smoothly and in real-time using the native animated driver.',
    ],
  },
};
