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
  version: '2.3.22',
  title: {
    ja: '⏱️ ２４時間管理：スクロール操作性の改善（長押しドラッグ方式）',
    en: '⏱️ 24h Timeline: Improved Scrolling & Long-press Drag',
  },
  notes: {
    ja: [
      'タイムラインを右手親指等でスクロールする際に、予定ブロックに触れて時間が誤変更されるのを防ぐため、長押し（約0.35秒）でドラッグ移動を開始する方式に改善しました。通常のスクロール操作やタップ編集が快適に行えます。',
    ],
    en: [
      'Improved timeline interaction to require a long-press (~0.35s) before dragging schedule blocks, preventing accidental time changes when scrolling with one hand. Regular scrolling and tap-to-edit are fully preserved.',
    ],
  },
};

