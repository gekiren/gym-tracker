import { Linking, Alert } from 'react-native';

/**
 * Opens a YouTube search query for "[exerciseName] やり方" using the device's default browser or YouTube app.
 * @param exerciseName The name of the exercise to search.
 */
export const openYouTubeSearch = async (exerciseName: string): Promise<void> => {
  if (!exerciseName) return;
  try {
    const query = `${exerciseName} やり方`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${encodedQuery}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('エラー', 'ブラウザまたはYouTubeアプリを開くことができませんでした。');
    }
  } catch (error) {
    console.error('Failed to open YouTube search url:', error);
    Alert.alert('エラー', '接続中にエラーが発生しました。');
  }
};
