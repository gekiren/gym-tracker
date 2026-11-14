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
  version: '2.3.39',
  title: {
    ja: '📐 ルーティン作成でのスタンス設定に対応',
    en: '📐 Stance Selection in Routine Builder',
  },
  notes: {
    ja: [
      'ルーティン作成・編集画面で、セットごとにスタンス（ナロー・ワイド・カスタム等）を設定できるようになりました。',
      '種目に設定されたデフォルトスタンスの自動反映や、セット追加時の引き継ぎにも対応しています。',
    ],
    en: [
      'You can now set a stance (Narrow, Wide, Custom, etc.) for each set in the routine builder and editor.',
      'Default stances from exercises are automatically applied, and newly added sets inherit the previous set\'s stance.',
    ],
  },
};
