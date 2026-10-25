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
  version: '2.3.24',
  title: {
    ja: '🔐 Googleアカウント連携（共通ID）＆ デフォルトスケジュール編集機能',
    en: '🔐 Google Account Link (Common ID) & Default Schedule Editor',
  },
  notes: {
    ja: [
      '設定 ＞「プラン & アプリ情報」に Googleアカウント連携（共通ID）機能を追加しました。機種変更時のプラン・特典状態の自動引き継ぎや、関連アプリ間でのステータス連動が可能になります。',
      'デフォルトスケジュール（平日ルーティン・休日等）を、専用のタイムラインエディターで直接新規作成・再編集できるように刷新しました。',
    ],
    en: [
      'Added Google Account Link (Common ID) under Settings > Plan & App Info, enabling automatic plan/perk recovery across devices and companion apps.',
      'Revamped default schedule creation to allow building and editing routines directly on a dedicated timeline editor.',
    ],
  },
};

