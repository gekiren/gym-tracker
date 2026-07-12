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
  version: '1.1.53', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティン画面の利便性向上・非表示機能の追加',
    en: 'Routine Screen Improvements and Visibility Toggle',
  },
  notes: {
    ja: [
      'ルーティン画面の日付表示を非表示化しました。',
      'ルーティン管理画面に非表示機能（💡/💤）を追加し、ホーム画面とダッシュボード集計から除外可能にしました。',
      'セレクトルーティン画面で完了したルーティンに✅マークを表示するようにしました。',
      'セレクトルーティン画面の各カード内にタスク内容を表示し、開始前に確認できるようにしました。',
    ],
    en: [
      'Removed the date header from the routine screen.',
      'Added a visibility toggle (💡/💤) to hide routines from the home screen and dashboard statistics.',
      'Added ✅ checkmarks to completed routines on the select screen.',
      'Display task lists within routine cards on the select screen.',
    ]
  }
};
