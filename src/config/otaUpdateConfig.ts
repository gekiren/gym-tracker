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
  version: '2.3.13',
  title: {
    ja: '🧩 24時間管理：ピース選択メニューの表示改善',
    en: '🧩 24h Timeline: Piece Menu Display Fix',
  },
  notes: {
    ja: [
      '「🧩 ピースを選択する」ボタンをタップした際にメニューが確実に開くよう、画面構造とイベント処理を最適化しました。',
      'ピース管理モーダルおよびタグ設定の表示安定性を向上させました。',
    ],
    en: [
      'Resolved an issue where tapping the piece selector button did not open the menu sheet.',
      'Improved modal display stability for piece and tag settings dialogs.',
    ],
  },
};
