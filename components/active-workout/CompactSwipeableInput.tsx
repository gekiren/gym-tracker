import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, StyleProp, ViewStyle, TextStyle, Keyboard } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../src/theme';

export interface CompactSwipeableInputHandle {
  focus: () => void;
  blur: () => void;
}

interface CompactSwipeableInputProps {
  value: string;
  onChangeText: (text: string) => void;
  step?: number;
  sensitivity?: number;
  minValue?: number;
  maxValue?: number;
  allowedValues?: number[];
  placeholder?: string;
  placeholderTextColor?: string;
  style?: any;
  selection?: { start: number; end: number };
  onSelectionChange?: () => void;
  selectTextOnFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<any>;
  disabled?: boolean;
  keyboardType?: 'numeric' | 'decimal-pad' | 'number-pad';
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

export const CompactSwipeableInput = forwardRef<CompactSwipeableInputHandle, CompactSwipeableInputProps>(({
  value,
  onChangeText,
  step = 1,
  sensitivity = 32,
  minValue = 0,
  maxValue = 9999,
  allowedValues,
  placeholder = '-',
  placeholderTextColor = 'rgba(255,255,255,0.2)',
  style,
  selection,
  onSelectionChange,
  selectTextOnFocus = true,
  onFocus,
  onBlur,
  returnKeyType = 'done',
  onSubmitEditing,
  inputRef,
  disabled = false,
  keyboardType = 'numeric',
  onSwipeStart,
  onSwipeEnd,
  onTouchStart,
  onTouchEnd,
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const localInputRef = useRef<TextInput>(null);

  // ソフトウェアキーボードが閉じた際（Androidの戻るボタン等を含む）、フォーカスと編集モードを確実に解除
  useEffect(() => {
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsEditing(false);
      localInputRef.current?.blur();
    });
    return () => hideSub.remove();
  }, []);

  // Android等で controlled value が再レンダリングされた際に、キーストロークごとに全選択が再発火するのを防止
  const [shouldSelectOnFocus, setShouldSelectOnFocus] = useState(selectTextOnFocus);
  const selectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setShouldSelectOnFocus(selectTextOnFocus);
    }
  }, [selectTextOnFocus, isEditing]);

  useEffect(() => {
    return () => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
    };
  }, []);

  const focusInput = () => {
    localInputRef.current?.focus();
  };

  const blurInput = () => {
    localInputRef.current?.blur();
  };

  useImperativeHandle(ref, () => ({
    focus: focusInput,
    blur: blurInput,
  }));

  useImperativeHandle(inputRef as any, () => ({
    focus: focusInput,
    blur: blurInput,
  }));

  const handleTextChange = (text: string) => {
    // 最初の1文字が入力されたら、以降の再レンダリングで Android ネイティブが全選択を再発火しないよう直ちに解除
    setShouldSelectOnFocus(false);
    onChangeText(text);
  };

  // Shared Values for animations
  const translationX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startValue = useSharedValue(0);
  const startIndex = useSharedValue(0);
  const lastStep = useSharedValue(0);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const handleValueChange = (newVal: number) => {
    const formattedStr = step % 1 === 0 
      ? String(Math.round(newVal))
      : String(Math.round(newVal * 1000) / 1000);
    onChangeText(formattedStr);
    triggerHaptic();
  };

  const dismissKeyboardAndResetEditing = () => {
    Keyboard.dismiss();
    setIsEditing(false);
    localInputRef.current?.blur();
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-4, 4])
    .failOffsetY([-45, 45])
    .cancelsTouchesInView(true)
    .onStart(() => {
      runOnJS(dismissKeyboardAndResetEditing)();
      if (onSwipeStart) {
        runOnJS(onSwipeStart)();
      }
      let parsed = parseFloat(value.replace(',', '.'));
      if (isNaN(parsed) || value === '') {
        const placeholderNum = parseFloat(String(placeholder).replace(',', '.').replace(/[^\d.]/g, ''));
        parsed = !isNaN(placeholderNum) && placeholderNum > 0 ? placeholderNum : 0;
      }
      startValue.value = parsed;

      if (allowedValues && allowedValues.length > 0) {
        let closestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < allowedValues.length; i++) {
          const diff = Math.abs(allowedValues[i] - parsed);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        }
        startIndex.value = closestIdx;
      }

      lastStep.value = 0;
      translationX.value = 0;
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translationX.value = event.translationX;
      const currentStep = Math.round(event.translationX / sensitivity);

      if (currentStep !== lastStep.value) {
        lastStep.value = currentStep;
        if (allowedValues && allowedValues.length > 0) {
          const targetIdx = Math.min(
            Math.max(startIndex.value + currentStep, 0),
            allowedValues.length - 1
          );
          const calculated = allowedValues[targetIdx];
          runOnJS(handleValueChange)(calculated);
        } else {
          const calculated = startValue.value + currentStep * step;
          const clamped = Math.min(Math.max(calculated, minValue), maxValue);
          runOnJS(handleValueChange)(clamped);
        }
      }
    })
    .onFinalize(() => {
      isDragging.value = false;
      translationX.value = withTiming(0, { duration: 150 });
      if (onSwipeEnd) {
        runOnJS(onSwipeEnd)();
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(!disabled && !isEditing)
    .onEnd(() => {
      runOnJS(focusInput)();
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const dragTextStyle = useAnimatedStyle(() => {
    return {
      color: withTiming(
        isDragging.value ? Theme.colors.primary : (style as any)?.color || Theme.colors.text,
        { duration: 100 }
      ),
    };
  });

  const dragContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        isDragging.value ? 'rgba(74, 144, 226, 0.3)' : ((style as any)?.backgroundColor || '#2a2a2a'),
        { duration: 100 }
      ),
    };
  });

  const flatStyle = StyleSheet.flatten(style) || {};
  const textStyleOnly = {
    color: flatStyle.color || Theme.colors.text,
    fontSize: flatStyle.fontSize || 15,
    fontWeight: flatStyle.fontWeight || 'bold',
    textAlign: flatStyle.textAlign || 'center',
    textAlignVertical: 'center' as const,
    includeFontPadding: false,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={[styles.baseBox, style, dragContainerStyle]}
      >
        {!isEditing && (
          <Animated.Text
            numberOfLines={1}
            style={[styles.baseText, textStyleOnly as any, dragTextStyle, StyleSheet.absoluteFill]}
            pointerEvents="none"
          >
            {value !== '' ? value : placeholder}
          </Animated.Text>
        )}
        <TextInput
          ref={localInputRef}
          style={[
            isEditing ? textStyleOnly : { opacity: 0 },
            {
              flex: 1,
              width: '100%',
              height: '100%',
              textAlignVertical: 'center',
              includeFontPadding: false,
              paddingVertical: 0,
              paddingTop: 0,
              paddingBottom: 0,
            }
          ]}
          keyboardType={keyboardType}
          placeholder={isEditing ? placeholder : ''}
          placeholderTextColor={placeholderTextColor}
          value={value}
          selection={selection}
          onSelectionChange={onSelectionChange}
          onChangeText={handleTextChange}
          selectTextOnFocus={shouldSelectOnFocus}
          onFocus={() => {
            setIsEditing(true);
            if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
            selectTimerRef.current = setTimeout(() => {
              setShouldSelectOnFocus(false);
            }, 100);
            onFocus?.();
          }}
          onBlur={() => {
            setIsEditing(false);
            if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
            setShouldSelectOnFocus(selectTextOnFocus);
            onBlur?.();
          }}
          returnKeyType={returnKeyType}
          onSubmitEditing={() => {
            onSubmitEditing?.();
          }}
          pointerEvents={isEditing ? "auto" : "none"}
        />
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  baseBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseText: {
    textAlign: 'center',
  },
});


CompactSwipeableInput.displayName = 'CompactSwipeableInput';
