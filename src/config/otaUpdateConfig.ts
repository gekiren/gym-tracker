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
  version: '2.3.57',
  title: {
    ja: '🏆 クラス昇格・経験値（XP）・実績メダル機能を追加',
    en: '🏆 Added Classes, XP & Achievement Medals',
  },
  notes: {
    ja: [
      'アイアン〜レジェンドまでの2階層クラス（総合21階級・機能別8段階）と累計経験値（XP）システムを追加しました。',
      '筋トレや全ライフログ横断で獲得できる40種類の実績メダルと、クラス＆実績一覧画面を追加しました。',
      '過去の記録データからの遡及反映、昇格お祝い演出、ボーナスPポイント獲得に対応しました。',
    ],
    en: [
      'Added a 2-tier class system (21 Overall ranks and 8 per-feature tiers from Iron to Legend) with cumulative XP.',
      'Added 40 cross-feature achievement medals across workouts and lifelogs, plus a dedicated Classes & Medals screen.',
      'Added retroactive progress calculation from past logs, promotion celebrations, and bonus P-point rewards.',
    ],
  },
};
