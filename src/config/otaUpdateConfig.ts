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
  version: '2.3.3',
  title: {
    ja: '🧩 24時間ピースパズルタイムライン起動・構文エラーの完全解消',
    en: '🧩 24h Piece Timeline Complete Initialization & Syntax Fix',
  },
  notes: {
    ja: [
      '24時間管理画面でスクリプトの構文エラー（SyntaxError）によりタイムライン枠やボタンが動作しなかった不具合を完全に解消しました。',
      'タイムラインへのピース配置・ドラッグ移動・長さ調整がスムーズにご利用いただけます。',
      '平日の基本型クイック配置や予定・実績の切り替えが正常に動作します。',
    ],
    en: [
      'Completely resolved the syntax error that prevented the 24h timeline frame and buttons from operating.',
      'Piece snapping, drag-to-move, and resize are now fully functional.',
      'Quick-fill default routine and plan/actual mode toggles are now working properly.',
    ],
  },
};
