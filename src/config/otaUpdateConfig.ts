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
  version: '2.1.8',
  title: {
    ja: '🏃 トレッドミルの速度・傾斜設定と手動時間入力に対応',
    en: '🏃 Treadmill Speed, Incline & Manual Duration Settings',
  },
  notes: {
    ja: [
      'トレッドミル種目でスピード（km/h）と傾斜（%）を設定・記録できるようになりました。',
      '走行時間を手動で素早く設定できる時間入力モーダル（クイックボタン付）を追加しました。',
      'ルーティンの作成・編集画面でもトレッドミルの目標スピードや傾斜をプリセット可能です。',
    ],
    en: [
      'Added speed (km/h) and incline (%) tracking for treadmill exercises.',
      'Added manual duration setting modal with quick preset buttons.',
      'Supports presetting target treadmill speed and incline in routines.',
    ],
  },
};
