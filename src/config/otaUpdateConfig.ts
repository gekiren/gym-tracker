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
  version: '2.3.2',
  title: {
    ja: '🧩 24時間ピースタイムライン起動・操作不具合の完全解消',
    en: '🧩 24h Piece Timeline Complete Initialization Fix',
  },
  notes: {
    ja: [
      '24時間管理画面でタイムライン枠が描画されずボタンが反応しない問題を完全に解決しました。',
      'スクリプト実行順序と状態管理変数を最適化し、起動時の読み込み安定性を大幅に強化しました。',
      'タイムラインへのピース配置・ドラッグ移動・長さ調整がスムーズにご利用いただけます。',
    ],
    en: [
      'Completely resolved the issue where timeline frame and buttons were unresponsive in 24h activity log.',
      'Optimized script execution order and state scoping for robust initialization.',
      'Piece snapping, drag-to-move, and resize are now fully operational.',
    ],
  },
};
