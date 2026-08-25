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
  version: '2.0.9',
  title: {
    ja: '🥗 写真拡大ドラッグ移動の指リアルタイム追従を完全実装',
    en: '🥗 Real-time Finger-tracking Drag Panning for Photo Viewer',
  },
  notes: {
    ja: [
      '写真拡大後のドラッグ（パン）移動を、setOffset/flattenOffset パターンとネイティブドライバ直結で再実装。指を動かすたびに遅延ゼロで写真がリアルタイムに追従するよう完全対応しました。',
    ],
    en: [
      'Rebuilt drag panning with setOffset/flattenOffset pattern and native driver. Photo now tracks finger movements instantly and in real-time with zero delay.',
    ],
  },
};
