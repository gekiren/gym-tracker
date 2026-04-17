import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ja from './locales/ja.json';
import en from './locales/en.json';

const resources = {
  ja: { translation: ja },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ja',          // デフォルト値（_layout.tsx で起動後すぐに上書きされる）
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;

/** 言語を切り替える。設定画面などから呼び出す */
export const changeLanguage = (lang: 'ja' | 'en') => {
  i18n.changeLanguage(lang);
};

/** 現在の言語コードを返す */
export const getCurrentLanguage = () => i18n.language;

/**
 * 種目名を翻訳する。
 * 翻訳キーが存在しない場合（カスタム種目など）はそのまま返す。
 */
export const translateExercise = (name: string): string => {
  const key = `exercises.${name}`;
  const translated = i18n.t(key, { defaultValue: name });
  return translated;
};

/**
 * 部位名を翻訳する
 */
export const translateMuscleGroup = (group: string): string => {
  const key = `muscle_groups.${group}`;
  return i18n.t(key, { defaultValue: group });
};

/**
 * 器具名を翻訳する
 */
export const translateEquipment = (equip: string): string => {
  const key = `equipment.${equip}`;
  return i18n.t(key, { defaultValue: equip });
};
