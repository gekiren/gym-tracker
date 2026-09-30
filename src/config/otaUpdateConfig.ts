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
  version: '2.3.0',
  title: {
    ja: '🎙️ 音声AIアシスタント刷新（アクアボイス＆Gemini）',
    en: '🎙️ Voice AI Assistant Revamped (Aqua Voice & Gemini)',
  },
  notes: {
    ja: [
      '音声AIアシスタントの仕組みを刷新しました。',
      'アクアボイスの高精度文字起こしとGeminiの構造化解析により、話すだけで筋トレ・食事・水分・体調メモを自動記録できます。',
    ],
    en: [
      'Revamped Voice AI Assistant powered by Aqua Voice transcription & Gemini.',
      'Log workouts, meals, water, and notes just by speaking with high-accuracy parsing.',
    ],
  },
};
