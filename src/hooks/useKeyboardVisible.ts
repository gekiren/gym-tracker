import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useIsKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(() => {
    return typeof Keyboard.isVisible === 'function' ? Keyboard.isVisible() : false;
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return isKeyboardVisible;
}
