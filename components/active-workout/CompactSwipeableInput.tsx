import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, StyleProp, ViewStyle, TextStyle, Keyboard } from 'react-native';
import { Gesture, GestureDetector, GestureType } from 'react-native-gesture-handler';
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
  panGestureRef?: React.MutableRefObject<any>;
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
  panGestureRef,
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const localInputRef = useRef<TextInput>(null);

  // 最新のpropsをrefで保持し、メモ化されたジェスチャーが常に最新の値を参照できるようにする
  const latestPropsRef = useRef({
    value,
    placeholder,
    allowedValues,
    sensitivity,
    step,
    minValue,
    maxValue,
    disabled,
    onSwipeStart,
    onSwipeEnd,
    onChangeText,
  });

  useEffect(() => {
    latestPropsRef.current = {
      value,
      placeholder,
      allowedValues,
      sensitivity,
      step,
      minValue,
      maxValue,
      disabled,
      onSwipeStart,
      onSwipeEnd,
      onChangeText,
    };
  });

  // ソフトウェアキーボードが閉じた際、自入力欄がフォーカスされている場合のみ編集モードを解除
  useEffect(() => {
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (localInputRef.current?.isFocused()) {
        setIsEditing(false);
        localInputRef.current?.blur();
      }
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
    // 編集状態を有効にしてpointerEventsをautoにした上で、確実にfocusを呼び出す
    setIsEditing(true);
    setShouldSelectOnFocus(selectTextOnFocus);
    setTimeout(() => {
      localInputRef.current?.focus();
    }, 50);
  };

  const blurInput = () => {
    setIsEditing(false);
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
    const currentStep = latestPropsRef.current.step;
    const formattedStr = currentStep % 1 === 0 
      ? String(Math.round(newVal))
      : String(Math.round(newVal * 1000) / 1000);
    latestPropsRef.current.onChangeText(formattedStr);
    triggerHaptic();
  };

  const dismissKeyboardAndResetEditing = () => {
    Keyboard.dismiss();
    setIsEditing(false);
    localInputRef.current?.blur();
  };

  // ジェスチャーインスタンスをメモ化し、再レンダリングによるネイティブ調停の切断を防止
  const panGesture = useMemo(() => {
    const g = Gesture.Pan()
      .activeOffsetX([-4, 4])
      .failOffsetY([-45, 45])
      .cancelsTouchesInView(true);

    if (panGestureRef) {
      g.withRef(panGestureRef);
    }

    return g
      .enabled(!disabled)
      .onStart(() => {
        runOnJS(dismissKeyboardAndResetEditing)();
        const currentProps = latestPropsRef.current;
        if (currentProps.onSwipeStart) {
          runOnJS(currentProps.onSwipeStart)();
        }
        let parsed = parseFloat(currentProps.value.replace(',', '.'));
        if (isNaN(parsed) || currentProps.value === '') {
          const placeholderNum = parseFloat(String(currentProps.placeholder).replace(',', '.').replace(/[^\d.]/g, ''));
          parsed = !isNaN(placeholderNum) && placeholderNum > 0 ? placeholderNum : 0;
        }
        startValue.value = parsed;

        if (currentProps.allowedValues && currentProps.allowedValues.length > 0) {
          let closestIdx = 0;
          let minDiff = Infinity;
          for (let i = 0; i < currentProps.allowedValues.length; i++) {
            const diff = Math.abs(currentProps.allowedValues[i] - parsed);
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
        const currentProps = latestPropsRef.current;
        translationX.value = event.translationX;
        const currentStep = Math.round(event.translationX / currentProps.sensitivity);

        if (currentStep !== lastStep.value) {
          lastStep.value = currentStep;
          if (currentProps.allowedValues && currentProps.allowedValues.length > 0) {
            const targetIdx = Math.min(
              Math.max(startIndex.value + currentStep, 0),
              currentProps.allowedValues.length - 1
            );
            const calculated = currentProps.allowedValues[targetIdx];
            runOnJS(handleValueChange)(calculated);
          } else {
            const calculated = startValue.value + currentStep * currentProps.step;
            const clamped = Math.min(Math.max(calculated, currentProps.minValue), currentProps.maxValue);
            runOnJS(handleValueChange)(clamped);
          }
        }
      })
      .onFinalize(() => {
        isDragging.value = false;
        translationX.value = withTiming(0, { duration: 150 });
        const currentProps = latestPropsRef.current;
        if (currentProps.onSwipeEnd) {
          runOnJS(currentProps.onSwipeEnd)();
        }
      });
  }, [panGestureRef, disabled]);

  const tapGesture = useMemo(() => {
    return Gesture.Tap()
      .enabled(!disabled && !isEditing)
      .onEnd(() => {
        runOnJS(focusInput)();
      });
  }, [disabled, isEditing]);

  const gesture = useMemo(() => Gesture.Exclusive(panGesture, tapGesture), [panGesture, tapGesture]);

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
