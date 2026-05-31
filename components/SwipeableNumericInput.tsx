import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';

interface SwipeableNumericInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  step?: number;
  sensitivity?: number;
  minValue?: number;
  maxValue?: number;
  maxLength?: number;
}

export default function SwipeableNumericInput({
  label,
  value,
  onChangeText,
  step = 1,
  sensitivity = 15,
  minValue = 0,
  maxValue = 9999,
  maxLength = 5,
}: SwipeableNumericInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Reanimated shared values
  const translationX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startValue = useSharedValue(0);
  const lastStep = useSharedValue(0);

  // Focus effect when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // Delay focus slightly to ensure the component is rendered and ready
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelection(0, value.length);
      }, 50);
    }
  }, [isEditing, value.length]);

  // Haptic feedback function to run on JS thread
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  // Update value callback
  const handleValueChange = (newVal: number) => {
    onChangeText(newVal.toString());
    triggerHaptic();
  };

  // Drag Gesture (Pan)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      const parsed = parseFloat(value) || 0;
      startValue.value = parsed;
      lastStep.value = 0;
      translationX.value = 0;
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translationX.value = event.translationX;
      
      // Calculate steps based on horizontal drag distance and sensitivity
      const currentStep = Math.round(event.translationX / sensitivity);
      
      if (currentStep !== lastStep.value) {
        lastStep.value = currentStep;
        const calculated = startValue.value + currentStep * step;
        
        // Clamp between min and max
        const clamped = Math.min(Math.max(calculated, minValue), maxValue);
        
        // Format to 1 decimal place if we have floats (e.g. 0.5 steps)
        const formatted = step % 1 === 0 
          ? Math.round(clamped)
          : Math.round(clamped * 10) / 10;
        
        runOnJS(handleValueChange)(formatted);
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      translationX.value = withTiming(0, { duration: 200 });
    });

  // Tap Gesture to open keyboard input
  const tapGesture = Gesture.Tap().onStart(() => {
    runOnJS(setIsEditing)(true);
  });

  // Compose gestures so they work exclusively
  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  // Animated style for the wrapper card (scale down slightly and highlight borders when dragging)
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withTiming(isDragging.value ? 0.97 : 1, { duration: 150 }),
        },
      ],
      borderColor: withTiming(
        isDragging.value ? Theme.colors.primary : Theme.colors.border,
        { duration: 150 }
      ),
      shadowColor: Theme.colors.primary,
      shadowOpacity: withTiming(isDragging.value ? 0.3 : 0, { duration: 150 }),
      shadowRadius: withTiming(isDragging.value ? 8 : 0, { duration: 150 }),
      shadowOffset: { width: 0, height: 0 },
    };
  });

  // Left Arrow style (moves slightly outward and scales based on drag)
  const leftArrowStyle = useAnimatedStyle(() => {
    const opacity = isDragging.value
      ? interpolate(translationX.value, [-100, -20, 0], [1, 0.7, 0.25], 'clamp')
      : withTiming(0.25, { duration: 150 });

    const scale = isDragging.value
      ? interpolate(translationX.value, [-100, -20, 0], [1.3, 1.1, 1.0], 'clamp')
      : withTiming(1.0, { duration: 150 });

    const translateX = isDragging.value
      ? interpolate(translationX.value, [-100, 0], [-10, 0], 'clamp')
      : withTiming(0, { duration: 150 });

    return {
      opacity,
      transform: [{ scale }, { translateX }],
    };
  });

  // Right Arrow style (moves slightly outward and scales based on drag)
  const rightArrowStyle = useAnimatedStyle(() => {
    const opacity = isDragging.value
      ? interpolate(translationX.value, [0, 20, 100], [0.25, 0.7, 1], 'clamp')
      : withTiming(0.25, { duration: 150 });

    const scale = isDragging.value
      ? interpolate(translationX.value, [0, 20, 100], [1.0, 1.1, 1.3], 'clamp')
      : withTiming(1.0, { duration: 150 });

    const translateX = isDragging.value
      ? interpolate(translationX.value, [0, 100], [0, 10], 'clamp')
      : withTiming(0, { duration: 150 });

    return {
      opacity,
      transform: [{ scale }, { translateX }],
    };
  });

  // Text animation style during dragging (slight bounce or scale)
  const valueTextStyle = useAnimatedStyle(() => {
    return {
      color: withTiming(
        isDragging.value ? Theme.colors.primary : Theme.colors.text,
        { duration: 150 }
      ),
      transform: [
        {
          scale: withTiming(isDragging.value ? 1.05 : 1, { duration: 150 }),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {isEditing ? (
        <TextInput
          ref={inputRef}
          style={[styles.input, styles.activeInput]}
          keyboardType="numeric"
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          onBlur={() => setIsEditing(false)}
          onSubmitEditing={() => setIsEditing(false)}
        />
      ) : (
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.dragArea, containerAnimatedStyle]}>
            {/* Keyboard Icon Indicator for direct input */}
            <View style={{ position: 'absolute', top: 6, right: 8, opacity: 0.25 }}>
              <Ionicons name="create-outline" size={12} color={Theme.colors.textMuted} />
            </View>

            {/* Left Indicator Arrow */}
            <Animated.View style={[styles.arrowContainer, leftArrowStyle]}>
              <Ionicons name="chevron-back" size={24} color={Theme.colors.primary} />
            </Animated.View>

            {/* Displayed Value */}
            <Animated.Text style={[styles.valueText, valueTextStyle]}>
              {value}
            </Animated.Text>

            {/* Right Indicator Arrow */}
            <Animated.View style={[styles.arrowContainer, rightArrowStyle]}>
              <Ionicons name="chevron-forward" size={24} color={Theme.colors.primary} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: Theme.colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    height: 58, // Fixed height to prevent layouts jumping on mode switch
  },
  activeInput: {
    borderColor: Theme.colors.primary,
    backgroundColor: '#222222',
  },
  dragArea: {
    backgroundColor: '#1A1A1A',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 58, // Matches the text input height
    overflow: 'hidden',
  },
  arrowContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
