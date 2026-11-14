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
  version: '2.3.38',
  title: {
    ja: '🎨 ワークアウト周辺・詳細画面のUI/UX改善',
    en: '🎨 Workout Flow & Detail Screens UI/UX Improvements',
  },
  notes: {
    ja: [
      '種目選択・ルーティン作成・完了画面・1RM計算・種目詳細（推移グラフ／各種設定）・過去ログ詳細および編集画面をダーク／ピュアブラックテーマに完全対応しました。',
      'カード・モーダル・入力欄の角丸と枠線、ボタンのタップ領域を統一し、視認性と操作性を向上させました。',
    ],
    en: [
      'Updated exercise selection, routine builder, workout completion, 1RM calculator, exercise details/charts, and workout history detail/edit screens for full Dark and Pure Black theme support.',
      'Unified card/modal/input corners, 1px borders, typography readability, and tap targets across these screens.',
    ],
  },
};
