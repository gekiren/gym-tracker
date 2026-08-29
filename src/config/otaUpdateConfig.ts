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
  version: '2.0.28',
  title: {
    ja: '⏱️ ルーティン実行中の画面スリープ防止対応',
    en: '⏱️ Keep Screen On During Routine Execution',
  },
  notes: {
    ja: [
      'ルーティン実行中（タスク遂行・タイマー計測中）に画面が自動で消灯・スリープしないよう画面常時表示（Keep Awake）機能を追加しました。',
      'ルーティン終了時や別画面への移動時には自動でスリープ防止が解除され、バッテリー消費を抑えます。',
    ],
    en: [
      'Added Keep Awake support to keep the screen on while actively executing routines and tracking timers.',
      'Screen sleep prevention is automatically disabled when the routine finishes or when navigating away to conserve battery.',
    ],
  },
};
