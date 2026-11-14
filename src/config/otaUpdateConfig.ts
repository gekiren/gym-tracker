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
  version: '2.3.32',
  title: {
    ja: '✨ ボリューム表示位置と重量増減ステップ設定の整理',
    en: '✨ Cleaner Volume Placement & Weight Step Settings',
  },
  notes: {
    ja: [
      'ワークアウト画面の種目ごとのボリューム表示を「+ セット追加」の右上（最終セットの右下）へ移動し、カード上部をすっきり見やすく調整しました。',
      '重量増減ステップ（±kg/lbs）の設定をワークアウト画面から非表示にし、種目詳細ページの「個別インターバル設定」の下から設定できるように移動しました。',
    ],
    en: [
      'Moved each exercise\'s volume display to the upper-right of "+ Add Set" (below the last set\'s check button) for a cleaner workout card header.',
      'Removed the weight step button from the active workout screen and moved it to a collapsible section on the Exercise Details page.',
    ],
  },
};
