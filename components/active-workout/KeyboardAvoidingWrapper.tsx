import React, { useState, useEffect } from 'react';
import { Platform, Keyboard, KeyboardAvoidingView } from 'react-native';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
}

export const KeyboardAvoidingWrapper: React.FC<KeyboardAvoidingWrapperProps> = ({ children }) => {
  const [behavior, setBehavior] = useState<'padding' | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setBehavior('padding');
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setBehavior(undefined);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={120}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      style={{ flex: 1 }}
      keyboardVerticalOffset={120}
    >
      {children}
    </KeyboardAvoidingView>
  );
};
