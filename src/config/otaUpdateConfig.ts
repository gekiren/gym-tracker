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
  version: '2.3.1',
  title: {
    ja: '🧩 24時間ピースタイムラインの不具合修正＆安定化',
    en: '🧩 24h Piece Timeline Bug Fix & Stabilization',
  },
  notes: {
    ja: [
      '24時間管理画面でタイムライン枠が描画されずボタン操作が動作しなくなる不具合を修正しました。',
      '日付解析ロジックおよび初期化処理を強化し、端末起動時の安定性を向上させました。',
      '大・中・小・浪費ピースのはめ込み、ドラッグ移動、リサイズ操作がスムーズに動作するようになりました。',
    ],
    en: [
      'Fixed an issue where the timeline frame and buttons were unresponsive in 24h activity log.',
      'Enhanced date parsing and initialization lifecycle for rock-solid stability.',
      'Smooth piece snapping, dragging, and resizing are now fully operational.',
    ],
  },
};
