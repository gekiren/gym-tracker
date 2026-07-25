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
  version: '1.1.80', // OTA識別用のバージョン文字列
  title: {
    ja: 'ワークアウト記録保存の堅牢化・消失防止パッチ',
    en: 'Workout Saving Robustness & Data Protection Patch',
  },
  notes: {
    ja: [
      'Hermesエンジンでの日付パース処理を堅牢化し、ワークアウト完了時の保存失敗・データ消失を防ぐ保護機能を実装しました。',
      '数値入力欄でのNaN（不正値）によるデータベース保存エラーを防止し、自重種目や各種記録が確実に保存されるよう修正しました。',
    ],
    en: [
      'Hardened date parsing logic in Hermes Engine to eliminate saving failures and prevent workout record loss.',
      'Added NaN validation guards to prevent database transaction rollbacks and ensure all workout sets are safely saved.',
    ]
  }
};




