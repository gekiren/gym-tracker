import { useSettingsStore } from '../store/settingsStore';
import { router } from 'expo-router';
import { PanGestureHandlerStateChangeEvent, State } from 'react-native-gesture-handler';

const featureToPath: Record<string, string | string[]> = {
  workout: '/(tabs)',
  body: '/lifelog/body',
  water: '/lifelog/water',
  nutrition: '/lifelog/nutrition',
  zikan: '/lifelog/zikan',
  routine: ['/lifelog/habit', '/lifelog/routine'],
  voice_ai: '/lifelog/voice-assistant',
};

export function useFeatureSwipe(currentPath: string) {
  const settings = useSettingsStore((state) => state.settings);
  const featureOrder = settings.featureOrder || ['workout', 'body', 'water', 'nutrition', 'zikan', 'routine', 'voice_ai'];
  const featureVisibility = settings.featureVisibility || {
    workout: true, body: true, water: true, nutrition: true, zikan: true, routine: true, voice_ai: true
  };

  const sequence = featureOrder.flatMap((id) => {
    if (featureVisibility && featureVisibility[id] === false) return [];
    const path = featureToPath[id];
    if (Array.isArray(path)) return path;
    if (path) return [path];
    return [];
  });

  const currentIndex = sequence.indexOf(currentPath);

  const onSwipeLeft = () => {
    if (currentIndex !== -1 && sequence.length > 1) {
      const nextIndex = (currentIndex + 1) % sequence.length;
      router.replace(sequence[nextIndex] as any);
    }
  };

  const onSwipeRight = () => {
    if (currentIndex !== -1 && sequence.length > 1) {
      const prevIndex = (currentIndex - 1 + sequence.length) % sequence.length;
      router.replace(sequence[prevIndex] as any);
    }
  };

  const handleStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, translationY } = event.nativeEvent;
      // 垂直方向へのズレが小さい場合のみ水平スワイプとして処理
      if (Math.abs(translationX) > 60 && Math.abs(translationY) < 50) {
        if (translationX < -60) {
          onSwipeLeft();
        } else if (translationX > 60) {
          onSwipeRight();
        }
      }
    }
  };

  return {
    sequence,
    currentIndex,
    panHandlerProps: {
      onHandlerStateChange: handleStateChange,
      activeOffsetX: [-60, 60] as [number, number],
      failOffsetY: [-40, 40] as [number, number],
    },
    onSwipeLeft,
    onSwipeRight
  };
}
