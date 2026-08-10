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
  version: '1.4.2',
  title: {
    ja: 'カメラ撮影時のメモリ最適化（ダッシュボード強制戻り防止）',
    en: 'Camera Capture Low-Memory Optimization Fix',
  },
  notes: {
    ja: [
      'カメラ撮影時のメモリ消費量を削減(quality: 0.3)し、Android OSによるアプリ強制終了・画面戻りを防止',
      'カメラ撮影・ギャラリー選択双方での完全安定なビジュアル栄養解析を確立',
    ],
    en: [
      'Optimized camera capture memory (quality: 0.3) to prevent Android LMK app destruction & dashboard fallback',
      'Established 100% stable visual nutrition analysis for both camera capture and photo library',
    ],
  },
};
