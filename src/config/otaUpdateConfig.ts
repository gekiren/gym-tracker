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
  version: '1.8.32',
  title: {
    ja: '戻る・タイマー・中止せずに離れるボタン色＆文字色のフリーワークアウト一括統一',
    en: 'Unified Back, Timer & Leave Button Styling with Free Workout Theme',
  },
  notes: {
    ja: [
      '✨ 2枚目の「戻る」「完了」「トレーニングタイマー開始」の背景色および文字色をフリーワークアウトボタン（水色 #4facfe / 白文字 #ffffff）へ完全統一しました。',
      '✨ 3枚目モーダルの「中止せずに離れる」の背景色、文字色、アイコン色をフリーワークアウトボタンと同じ水色・白文字に完全統一しました。',
    ],
    en: [
      '✨ Unified Back, Finish, and Training Timer buttons with Free Workout button styling (#4facfe bg / white text).',
      '✨ Unified "Leave in background" modal button styling to match Free Workout button theme.',
    ],
  },
};
