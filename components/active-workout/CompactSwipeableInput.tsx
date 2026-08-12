import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, StyleProp, ViewStyle, TextStyle } from 'react-native';
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
}

export const CompactSwipeableInput = forwardRef<CompactSwipeableInputHandle, CompactSwipeableInputProps>(({
  value,
  onChangeText,
  step = 1,
  sensitivity = 32,
  minValue = 0,
  maxValue = 9999,
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
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const localInputRef = useRef<TextInput>(null);

  const focusInput = () => {
    setIsEditing(true);
    setTimeout(() => {
      localInputRef.current?.focus();
    }, 40);
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

  // Shared Values for animations
  const translationX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startValue = useSharedValue(0);
  const lastStep = useSharedValue(0);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        localInputRef.current?.focus();
      }, 40);
    }
  }, [isEditing]);

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

  const panGesture = Gesture.Pan()
    .enabled(!disabled && !isEditing)
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onStart(() => {
      let parsed = parseFloat(value.replace(',', '.'));
      if (isNaN(parsed) || value === '') {
        parsed = 0;
      }
      startValue.value = parsed;
      lastStep.value = 0;
      translationX.value = 0;
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translationX.value = event.translationX;
      const currentStep = Math.round(event.translationX / sensitivity);

      if (currentStep !== lastStep.value) {
        lastStep.value = currentStep;
        const calculated = startValue.value + currentStep * step;
        const clamped = Math.min(Math.max(calculated, minValue), maxValue);
        runOnJS(handleValueChange)(clamped);
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      translationX.value = withTiming(0, { duration: 150 });
    });

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd(() => {
      runOnJS(setIsEditing)(true);
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

  if (isEditing) {
    return (
      <TextInput
        ref={localInputRef}
        style={style}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        selection={selection}
        onSelectionChange={onSelectionChange}
        onChangeText={onChangeText}
        selectTextOnFocus={selectTextOnFocus}
        onFocus={() => {
          onFocus?.();
        }}
        onBlur={() => {
          setIsEditing(false);
          onBlur?.();
        }}
        returnKeyType={returnKeyType}
        onSubmitEditing={() => {
          setIsEditing(false);
          onSubmitEditing?.();
        }}
      />
    );
  }

  const flatStyle = StyleSheet.flatten(style) || {};
  const textStyleOnly = {
    color: flatStyle.color || Theme.colors.text,
    fontSize: flatStyle.fontSize || 15,
    fontWeight: flatStyle.fontWeight || 'bold',
    textAlign: flatStyle.textAlign || 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.baseBox, style, dragContainerStyle]}>
        <Animated.Text
          numberOfLines={1}
          style={[styles.baseText, textStyleOnly as any, dragTextStyle]}
        >
          {value !== '' ? value : placeholder}
        </Animated.Text>
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

