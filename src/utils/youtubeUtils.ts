import { Linking, Alert } from 'react-native';
import i18n from '../i18n';

/**
 * Opens a YouTube search query for "[exerciseName] やり方" using the device's default browser or YouTube app.
 * @param exerciseName The name of the exercise to search.
 */
export const openYouTubeSearch = async (exerciseName: string): Promise<void> => {
  if (!exerciseName) return;
  try {
    const suffix = i18n.t('ui.youtube.search_suffix') || 'やり方';
    const query = `${exerciseName} ${suffix}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${encodedQuery}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        i18n.t('ui.youtube.error_title') || 'エラー',
        i18n.t('ui.youtube.error_open_browser') || 'ブラウザまたはYouTubeアプリを開くことができませんでした。'
      );
    }
  } catch (error) {
    console.error('Failed to open YouTube search url:', error);
    Alert.alert(
      i18n.t('ui.youtube.error_title') || 'エラー',
      i18n.t('ui.youtube.error_connection') || '接続中にエラーが発生しました。'
    );
  }
};
