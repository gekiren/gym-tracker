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
  version: '1.1.88', // OTA識別用のバージョン文字列
  title: {
    ja: '画面描画の最適化とアプリの安定性向上',
    en: 'UI Performance & Stability Improvements',
  },
  notes: {
    ja: [
      '筋トレ記録画面、完了結果画面、設定画面の描画パフォーマンスを最適化しました。',
      '不要な再描画を軽減し、より軽快でスムーズな操作性を実現しました。',
    ],
    en: [
      'Optimized rendering performance across key application screens.',
      'Reduced unnecessary re-renders for a smoother user experience.',
    ],
  },
};




